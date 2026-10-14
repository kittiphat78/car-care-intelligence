# Architecture — Step 05

> วันที่: 2026-10-14 · Branch: `docs/redesign-step-05-architecture`
> Input: `current-architecture.md` (Step 01), `product-requirements.md` + D-01..D-16 (Step 02), flows/IA (Step 03), design system (Step 04) และ source ที่ `7f58eec`
> ป้ายกำกับ: **[V]** Verified จากโค้ด · **[I]** Inferred · **[U]** Unknown (ต้องยืนยันจาก Supabase/Vercel: S01-01, S01-02)
> การตัดสินใจหลักอยู่ใน `architecture-decisions.md` (ADR-01..ADR-14)

## 1. เป้าหมายของสถาปัตยกรรม

| # | เป้าหมาย | ที่มา |
|---|---|---|
| AG-1 | **กฎธุรกิจและสิทธิ์ถูกบังคับที่ฐานข้อมูล** ไม่ใช่ที่ browser เพราะ anon key เป็นสาธารณะ และใครที่มี session ก็เรียก PostgREST ตรงได้ | ER-12, ER-14, TD-02 |
| AG-2 | ตัวเลขเงินถูกต้องเสมอ: ไม่ถูกตัดที่ row limit, ไม่เลื่อนวัน และใช้เวลา Asia/Bangkok | ER-01, ER-02, ER-11 |
| AG-3 | ไม่เพิ่ม dependency ที่ไม่จำเป็น และไม่เปลี่ยน stack | Step 05 prompt |
| AG-4 | เปลี่ยนแบบเพิ่มทีละขั้น (expand → migrate → contract) และ client v1.0.0 ยังทำงานได้ระหว่าง rollout | NFR-DATA-03, NFR-OPS-05 |
| AG-5 | แยก UI, domain logic และ data access ให้ test ได้ (pure function test ของจริง) | TD-01, TD-03, TD-22 |

## 2. ภาพรวม (Target)

```
┌──────────────────────────── Browser (มือถือ / tablet / PC) ────────────────────────────┐
│  Client Components (features/*)                                                         │
│   UI (components/ui, patterns) ──► feature hooks ──► features/*/api.ts (data access)     │
│                                     │                  │  supabase-js (anon key + JWT)    │
│                                     ▼                  ▼                                  │
│                         domain logic (pure, tested)   PostgREST  /  RPC  /  Realtime      │
│  local: theme, remembered_email, recentCustomers, draft (sessionStorage), weather cache  │
└───────────────┬────────────────────────────────────────────┬──────────────────────────────┘
                │ page request                                 │ HTTPS / WSS
┌───────────────▼──────────── Vercel (Node runtime) ─────┐   ┌──▼─────────── Supabase ─────────────────────┐
│ proxy.ts: session refresh + redirect (UX guard)        │   │ Auth (email/password, sign-up ปิด)            │
│ app/(app)/layout.tsx [Server]: getUser() → redirect    │   │ Postgres:                                     │
│ Server Components: page shells, metadata (<title>)     │   │  RLS: เฉพาะ app_members (ADR-04)              │
│ Route Handler: POST /api/client-errors (log only)      │   │  Constraints (NOT VALID → VALIDATE)            │
│ Security headers + CSP                                 │   │  Triggers: audit fields, seq_number           │
└────────────────────────────────────────────────────────┘   │  RPC (SECURITY INVOKER): settle, summaries    │
                                                              │ Realtime: postgres_changes (RLS-aware)        │
                                                              └───────────────────────────────────────────────┘
```

**หลักการแบ่งความรับผิดชอบ**

| ชั้น | ทำอะไร | ไม่ทำอะไร |
|---|---|---|
| **Database (enforcement boundary)** | สิทธิ์ (RLS), ความถูกต้องของข้อมูล (constraints), ค่าที่ปลอมไม่ได้ (audit, seq), การเปลี่ยนหลายแถวแบบ atomic (RPC) และการรวมยอด (aggregate RPC) | UI text |
| **Server (Next.js on Vercel)** | ตรวจ session ก่อน render หน้า, ตั้ง header ความปลอดภัย, `<title>` ต่อหน้า และรับ error report จาก client | **ไม่** เป็นทางผ่านของข้อมูลธุรกิจ (ADR-02) |
| **Client** | UI, form UX, validation เพื่อ UX (Zod schema เดียวกับ DB rules), realtime, export Excel/PDF, draft | ไม่ใช่ที่บังคับกฎ (กฎซ้ำที่ DB เสมอ) |

## 3. Server / Client Component Boundaries (Task 1)

| ไฟล์ | ชนิด | เหตุผล |
|---|---|---|
| `app/layout.tsx` | Server | ฟอนต์, metadata, theme script (กันกะพริบ) |
| `app/(auth)/login/page.tsx` | Server shell → `<LoginForm>` client | `<title>`, อ่าน `next` param ฝั่ง server |
| `app/(app)/layout.tsx` | **Server** | `supabase.auth.getUser()` ฝั่ง server เป็นชั้นที่ 2 ต่อจาก proxy แล้ว redirect `/login?next=` และส่ง `userEmail` ให้ `<AppShell>` |
| `app/(app)/**/page.tsx` | Server | export `metadata` (`<title>` ตาม `sitemap.md`) และ render `<XxxScreen/>` |
| `features/*/components/*Screen.tsx` | Client (`'use client'`) | state, realtime, ฟอร์ม และ dialog ที่ผูก URL |
| `components/patterns/nav/AppShell.tsx` | Client | `usePathname`, badge ค้างชำระ |
| `app/api/client-errors/route.ts` | Route Handler (Node) | รับ error report แล้ว log (ADR-11) |
| `proxy.ts` | Proxy (Node) | refresh session cookie + redirect (UX เท่านั้น ไม่ใช่ security boundary เพราะเคยมี advisory bypass ER-09) |

**ทำไมข้อมูลยังอ่านจาก client:** หน้าหลักต้องมี realtime และ refresh เงียบ ถ้าย้ายไป RSC จะได้แค่ initial paint แต่ต้องมี client fetch อยู่ดี จึงเลือกให้เรียบง่ายแทน (ADR-03) ส่วนการ prefetch ด้วย RSC เป็น P2 หลัง MVP

## 4. Domain, Data Access และ Validation (Task 3)

```
features/records/
  schema.ts      Zod: IncomeInput, ExpenseInput, RecordPatch (ใช้ทั้งฟอร์ม create/edit)  ← กฎเดียวกับ DB constraint
  mappers.ts     DB row ⇄ domain (เช่น services[] ⇄ {carType, brand, note})
  logic.ts       pure: groupDebts, computeTodayStats, customerBreakdown, …  (ย้ายจาก useDashboard)
  api.ts         data access: createIncome, updateRecord, deleteRecord, listByMonth, … คืน Result<T>
  hooks/         useTodayRecords, useRecordEditor, …
```

| Boundary | กฎ |
|---|---|
| UI → hooks | component ไม่ import `supabase` ตรง (ปัจจุบัน import ใน 6 ไฟล์ TD-01) |
| hooks → api | hook เรียก `features/*/api.ts` เท่านั้น |
| api → Supabase | ผ่าน `lib/supabase/browser.ts` (singleton) และทุกฟังก์ชันคืน `Result<T, AppError>` (`lib/result.ts`) ไม่ throw |
| Validation | (1) Zod ฝั่ง client เพื่อแสดง error ภาษาไทยทันที (2) **DB constraint** เป็นตัวจริง (3) error code จาก DB (`23514`) map กลับเป็นข้อความเดียวกัน |
| Sanitization | **ไม่แปลงข้อความตอนบันทึก** (เลิก DOMPurify ตอน write แก้ ER-08) โดยพึ่ง React escaping ตอน render และ Excel เขียนค่าเป็น string (ไม่ใช่ formula) ส่วน PDF เป็น text (ไม่ใช่ HTML) (`security-design.md` §5) |
| Time | ทุกการคำนวณ "วันนี้/สัปดาห์/เดือน/ปี" ใช้ `lib/time/bangkok.ts` (ใช้ `Intl` ไม่เพิ่ม dependency) และฝั่ง DB ใช้ `at time zone 'Asia/Bangkok'` |
| Money | จำนวนเต็มบาท (`integer`) ตามข้อมูลเดิม [I] และ format ด้วย `lib/money.ts` |

### 4.1 การจัดการ `services[]` (TD-06)
MVP **ไม่ย้ายโครงสร้าง** แต่ใช้ `mappers.ts` แปลง `services: [carTypeName, brandName, note]` ⇄ `{ carType, brand, note }` ที่ขอบ data access เพื่อให้ UI ไม่รู้จัก index อีกต่อไป ส่วน structured columns (`car_type`, `car_brand`) เป็น post-MVP (ADR-09) [V] เดิม Add เก็บ **ชื่อ** (`CAR_TYPES[].name`) ไม่ใช่ id (`app/add/page.tsx:105-107`) ดังนั้น mapper ต้อง match ด้วยชื่อ

## 5. Data Flows หลัก

| Use case | ปัจจุบัน | Target | แก้ |
|---|---|---|---|
| บันทึกรายรับ | client นับ `seq` → insert พร้อม audit fields จาก client | insert เฉพาะ field ธุรกิจ + `client_request_id` แล้ว trigger ตั้ง `seq_number`, `created_by*` | ER-04, ER-14, S03-04#1 |
| แก้ไข | update ทุก field รวม `created_at` จาก split/merge ที่มีบั๊ก | update **เฉพาะ field ที่เปลี่ยน** + `.eq('updated_at', เดิม)` (optimistic concurrency) และ trigger ตั้ง `updated_*` | ER-01, S03-04#2/3 |
| เคลียร์ยอด | update by `customer_name` (ไม่ครอบคลุม NULL หรือช่องว่าง) | RPC `settle_records(ids[])` คืนจำนวนแถวและยอดจริง | ER-03, UF-DEBT-02 |
| Dashboard | 4 queries รวมข้อมูล 1 ปี และ refetch ทั้งหมดทุก realtime event | RPC `dashboard_today()` + list วันนี้ + `debt_summary()` และรายปีผ่าน RPC aggregate (โหลดแยก) | ER-02, ER-31, PP-26 |
| History | ดึงทั้งปีแล้วกรองบน client | ดึงทีละเดือน (หรือทั้งปีผ่าน pagination loop) + summary จาก RPC | ER-02 |
| Export | 2 queries ไม่ตรวจ error | `fetchAllPages()` ทีละ 1,000 แถว + ตรวจ `count` ตรง + ตรวจ error ทุกหน้า | ER-02, ER-07 |

## 6. Caching, Pagination, Realtime, Background (Task 10)

| เรื่อง | การออกแบบ |
|---|---|
| **HTTP / Next cache** | หน้าเป็น dynamic per-user (มี session) จึงไม่ cache ข้อมูลธุรกิจที่ server ส่วน static assets ใช้ค่า default ของ Vercel |
| **Client cache** | state ในหน้าจอ + refresh เงียบ (ไม่เพิ่ม React Query/SWR, ADR-03) และ weather cache ใน sessionStorage 30 นาทีคงเดิม |
| **Pagination** | (1) รายการตามเดือน: `range()` ทีละ 1,000 จนครบ ใน helper `fetchAllPages(query, { expectedCount })` (2) ยอดรวมทุกชนิดใช้ aggregate RPC (ไม่ดึงแถวมารวมเอง) (3) ไม่ทำ infinite scroll ใน MVP |
| **Row limit** | ทุก query ที่ไม่ใช่ RPC aggregate ต้องผ่าน `fetchAllPages` หรือกำหนด limit ที่รู้ตัว และ lint/review checklist ห้าม `select('*')` ที่ไม่มี range ใน `api.ts` |
| **Realtime** | 1 channel ต่อ AppShell (ไม่ใช่ต่อหน้า) ฟัง `records`, `expenses` และเมื่อมี event: debounce 500ms แล้ว refresh **เฉพาะ** today summary + today list + debt summary ส่วนข้อมูลรายปี refresh เมื่อกลับมาที่แท็บหรือทุก 5 นาที · สถานะหลุดแสดง StatusBar (UF-DASH-01) |
| **Background jobs** | MVP ไม่มี และถ้า Q-02 = soft delete ให้ purge ด้วย `pg_cron` ใน Supabase (ไม่ใช้ Vercel Cron เพื่อไม่ต้องใช้ service role key) |

## 7. Error Handling, Logging, Observability (Task 9)

### 7.1 AppError
```ts
// lib/errors.ts (สเปก)
type AppErrorCode = 'NETWORK' | 'TIMEOUT' | 'AUTH_EXPIRED' | 'FORBIDDEN' | 'VALIDATION'
                  | 'NOT_FOUND' | 'CONFLICT' | 'DUPLICATE' | 'ROW_LIMIT' | 'SERVER' | 'UNKNOWN'
interface AppError { code: AppErrorCode; ref: string /* 8 ตัวอักษร ใช้ในข้อความถึงผู้ใช้ */; field?: string; cause?: unknown }
type Result<T> = { ok: true; data: T } | { ok: false; error: AppError }
```

| ที่มา | Mapping |
|---|---|
| `TypeError: Failed to fetch` / offline | `NETWORK` |
| timeout 15 วินาที (AbortController) | `TIMEOUT` (หลังส่ง insert แล้ว ให้ตรวจด้วย `client_request_id` ก่อนให้ลองใหม่) |
| PostgREST `PGRST301` / HTTP 401 | `AUTH_EXPIRED` → UF-AUTH-03 |
| SQLSTATE `42501` / HTTP 403 | `FORBIDDEN` → UF-PERM-01 |
| SQLSTATE `23514` (check), `23502` (not null), `22001` (too long) | `VALIDATION` + `field` จากชื่อ constraint |
| SQLSTATE `23505` บน `client_request_id` | `DUPLICATE` → ถือว่าสำเร็จ แล้วดึงแถวเดิม |
| update คืน 0 แถวพร้อม `updated_at` filter | `CONFLICT` หรือ `NOT_FOUND` (ตรวจซ้ำ) |
| `fetchAllPages` count ไม่ตรง | `ROW_LIMIT` |
| อื่น ๆ 5xx | `SERVER` |

ข้อความถึงผู้ใช้ map จาก code เป็นภาษาไทย (`lib/errors.ts#toUserMessage`) และ **ไม่แสดง `error.message` ดิบ** (ER-17)

### 7.2 Logging & Monitoring (ไม่เพิ่ม dependency, ADR-11)
- **Client:** `reportError(appError | Error, context)` ส่ง `POST /api/client-errors` ด้วย `navigator.sendBeacon` (payload: code, ref, route, ข้อความย่อ, app version และ user id แบบ hash) **ไม่มีอีเมล ทะเบียน หรือชื่อลูกค้า**
- **Server:** Route Handler ตรวจ session, จำกัดขนาด payload ≤ 4KB และ `console.log(JSON.stringify({level, ...}))` ลง Vercel runtime logs
- **ครอบคลุม:** `app/error.tsx`, `window.onerror`, `unhandledrejection` และทุก `Result` ที่เป็น `SERVER`/`UNKNOWN`/`ROW_LIMIT`
- **การแจ้งเตือน:** Vercel log drain หรือ alert เป็นการตั้งค่าแพลตฟอร์ม [U] (plan) ถ้าไม่มี ให้ใช้การตรวจ log รายสัปดาห์ (บันทึกใน runbook Step 12) และ Sentry เป็นทางเลือกที่ต้องอนุมัติ dependency (ADR-11)

## 8. Vercel Runtime Compatibility (Task 11)

| เรื่อง | สถานะ | หมายเหตุ |
|---|---|---|
| Next.js 16 App Router + Turbopack build | ✅ [V] build ผ่าน | upgrade 16.4.x (ER-09) ก่อนเริ่ม |
| `proxy.ts` (แทน `middleware.ts`) | ✅ Next 16 รองรับ, Node runtime | ใช้ `@supabase/ssr` `getAll/setAll` |
| `@supabase/ssr` + `supabase-js` บน Node runtime | ✅ [V] ใช้อยู่ | ไม่ใช้ Edge runtime |
| `exceljs`, `jspdf` | ✅ client-only ผ่าน dynamic import [V] | ไม่ถูกรวมใน server bundle |
| Route Handler `/api/client-errors` | ✅ Node runtime, ไม่มี state | ไม่ใช้ rate limit in-memory (ไม่มีผลบน serverless ER-16) แต่ใช้ auth + ขนาด payload |
| Node version | [U] Vercel project setting | ตั้ง `"engines": { "node": "22.x" }` หลังยืนยันว่าตรงกับ Vercel (S01-02) |
| Function region | [U] | ควรอยู่ region เดียวกับ Supabase (เช่น `sin1` ถ้า Supabase อยู่ `ap-southeast-1`) เพราะ proxy + server layout เรียก Auth ทุก request |
| Cron | ไม่ใช้ | — |
| ขนาด function | เล็ก (ไม่มี dependency server หนัก) | — |
| Preview deployments | ต้องใช้ env ของ staging (ADR-12, `environment-variables.example`) | guard ตอน build/runtime |

## 9. Feature Coverage (ตรวจว่า architecture ครอบคลุมทุกฟีเจอร์)

| Feature (F) | Module | Data access | DB object |
|---|---|---|---|
| F-01..F-04 Auth | `features/auth`, `proxy.ts`, `(app)/layout.tsx` | Supabase Auth | `app_members` (ADR-04) |
| F-05, F-06, F-08..F-10 Shell/theme/PWA/errors | `components/patterns/nav`, `app/*` | — | — |
| F-07 Kiosk | **Replace:** draft + overscroll (client) | sessionStorage | — |
| F-11, F-12 Header/Weather | `features/dashboard` | Open-Meteo (คงเดิม) | — |
| F-13..F-16, F-19 Dashboard numbers | `features/dashboard` | RPC `dashboard_today`, `daily_series`, `customer_breakdown`, `debt_summary` | functions |
| F-17 รายการวันนี้ + แก้ไข | `features/records` | `listRecordsBetween` | `records` |
| F-18 Realtime | `AppShell` realtime provider | Realtime | publication |
| F-20, F-21 หนี้ + เคลียร์ยอด | `features/debts` | `listUnpaid`, RPC `settle_records` | function |
| F-22 บิล PDF | `features/debts/bill.ts` (client) | — (Q-05 → RPC `issue_bill_number`) | optional |
| F-23..F-31 บันทึก | `features/records` (`RecordEditor`) | `createIncome`, `createExpense`, `countVisitsByPlate` | triggers, constraints |
| F-32..F-39 ประวัติ/แก้ไข/ลบ | `features/history`, `features/records` | `listByMonth`, `period_summary`, `updateRecord`, `deleteRecord` | — |
| F-40 Export | `features/history/export.ts` | `fetchAllPages` | — |
| F-41, F-42 API เดิม | ลบ (Q-12) | — | — |
