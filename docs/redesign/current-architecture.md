# Current Architecture — Step 01

> วันที่: 2026-10-14 · ตรวจที่ commit `7f58eec`
> ป้ายกำกับ: **[V]** Verified · **[I]** Inferred · **[U]** Unknown

## 1. ภาพรวม

```
┌─────────────── Browser (tablet / มือถือ) ───────────────┐
│  Next.js client components (ทุกหน้า 'use client')        │
│   ├─ hooks/* ── supabase-js (anon key + user session) ───┼──► Supabase PostgREST  (records, expenses)
│   │                                                      ├──► Supabase Realtime   (postgres_changes)
│   │                                                      ├──► Supabase Auth       (password grant)
│   ├─ useWeather ── fetch ────────────────────────────────┼──► Open-Meteo (weather, air-quality)
│   ├─ lib/export (exceljs) → .xlsx download               │
│   └─ lib/generateBill (jsPDF + /fonts/Sarabun) → .pdf    │
│  localStorage: theme, remembered_email, recentCustomers, │
│                last_bill_number                          │
│  sessionStorage: weather cache                           │
└──────────────────────────────────────────────────────────┘
            │ HTTP (page navigation)
┌───────────▼──────────── Vercel ──────────────────────────┐
│  middleware.ts  (getUser → redirect)                     │
│  Static prerendered pages: / /add /history /login        │
│  Route handlers: /api/insights (→ Gemini), /api/export-excel (stub) │
│  Security headers + CSP (next.config.ts)                 │
└──────────────────────────────────────────────────────────┘
```

**รูปแบบสถาปัตยกรรม [V]:** "Thick client + BaaS" โดย browser อ่านและเขียน DB ตรงผ่าน Supabase ด้วย anon key และ session ของผู้ใช้ ไม่มี server-side data layer, Server Actions หรือ Route Handler ที่ใช้งานจริง

ผลที่ตามมา:
- **Authorization ทั้งหมดขึ้นกับ RLS** [V] เพราะโค้ดฝั่ง client ถูกแก้หรือข้ามได้ และใครที่มี session ก็เรียก PostgREST ตรงด้วย anon key ได้
- **Business rules อยู่ใน browser** [V] เช่น `seq_number`, sanitize, การ match ชื่อลูกค้าตอนเคลียร์ยอด และ validation จึงไม่มีอะไรบังคับที่ฝั่ง server
- Build output เป็น static ทั้งหมด (`○`) ยกเว้น API routes (`ƒ`) [V จาก build log]

## 2. Rendering & Routing [V]

| Route | Render | Data source | Guard |
|---|---|---|---|
| `/` | Static shell + client fetch | `useDashboard`, `useWeather` | middleware + `useDashboard` ตรวจ `getUser` ซ้ำ |
| `/add` | Static shell + client | insert ตรงจากหน้า | middleware |
| `/history` | Static shell + client | `useHistoryData` + query export ในหน้า | middleware |
| `/login` | Static | Auth | middleware (redirect ถ้า login แล้ว) |
| `/api/insights` | Dynamic (Node) | Gemini | `authenticateRequest()` + rate limit in-memory |
| `/api/export-excel` | Dynamic | — | `authenticateRequest()` + rate limit in-memory |

- `middleware.ts` matcher ยกเว้น `api|_next/static|_next/image|favicon.ico` (`middleware.ts:70`) [V]
- ไฟล์ static ใน `/public` (manifest, icons, fonts) **ผ่าน middleware ด้วย** เพราะ matcher ไม่ได้ยกเว้น จึงมีการเรียก `getUser` ทุก request [I จาก matcher] ซึ่งเป็น latency และ cost ที่ไม่จำเป็น และถ้าไม่มี session หน้า `/manifest.json` จะไม่ถูก redirect เพราะไม่อยู่ใน `PROTECTED_ROUTES` จึงไม่พัง

## 3. Authentication & Authorization

| ด้าน | การทำงาน | หลักฐาน |
|---|---|---|
| Identity | Supabase Auth email/password, session ใน cookie ผ่าน `@supabase/ssr` | `lib/supabase.ts`, `middleware.ts:30-50` [V] |
| Page guard | `getUser()` ใน middleware แล้ว redirect | `middleware.ts:52-64` [V] |
| API guard | `authenticateRequest()` คืน 401 ถ้าไม่มี user | `lib/serverAuth.ts:13-37` [V] |
| Roles | ไม่มี ทุก user เท่ากัน | ไม่มีการอ้าง role/claim ในโค้ด [V] |
| Data isolation | ไม่มีการ filter ตาม user ในทุก query และเป็นร้านเดียวที่ใช้ข้อมูลร่วมกัน | `useDashboard.ts:68-73`, `useHistoryData.ts:18-21` [V] |
| RLS | ไม่ทราบ | ไม่มี SQL ใน repo [U] |
| Sign-up | ไม่มี UI แต่ถ้า Supabase เปิด public sign-up ไว้ ใครก็สมัครผ่าน API ได้ | [U] |
| Cookie API | ใช้ `get/set/remove` แบบเก่าของ `@supabase/ssr` (เวอร์ชันใหม่แนะนำ `getAll/setAll`) | `middleware.ts:34-48`, `serverAuth.ts:22-26` [V โค้ด] / [I deprecation] |
| Audit | `created_by_email`, `updated_by_email`, `updated_at` ถูกเซ็ต **จาก client** จึงปลอมได้ | `app/add/page.tsx:111-112`, `EditModal.tsx:102-103` [V] |

## 4. Validation & Sanitization

| จุด | Validation | Sanitize | หลักฐาน |
|---|---|---|---|
| Add income | Zod (inline schema ใน callback) | DOMPurify | `app/add/page.tsx:70-96` [V] |
| Add expense | Zod | DOMPurify | `app/add/page.tsx:125-144` [V] |
| Edit income/expense | **ไม่มี** (`parseInt(...) \|\| 0`) | DOMPurify | `EditModal.tsx:90-115` [V] |
| Mark paid | ไม่มี | — | `useDashboard.ts:142-146` [V] |
| API insights | ตรวจ type + clamp ตัวเลข | — | `insights/route.ts:61-75` [V] |
| DB constraints | ไม่ทราบ | — | [U] |

หมายเหตุ: React escape ข้อความตอน render อยู่แล้ว และไม่พบ `dangerouslySetInnerHTML` กับข้อมูลผู้ใช้ (มีจุดเดียวคือ theme script แบบคงที่ใน `layout.tsx:68`) [V] การใช้ DOMPurify กับ plain text ก่อนบันทึกจึงเป็นการป้องกันชั้นที่สอง แต่มีผลข้างเคียงคือ **แก้ข้อความของผู้ใช้**: ทดสอบกับ `isomorphic-dompurify` ที่ติดตั้งอยู่แล้วพบว่า `"ราคา <500"` ถูกเก็บเป็น `"ราคา &lt;500"` และ React จะแสดง `&lt;` ตามตัวอักษร ส่วน `&`, `>` และ `"` ไม่เปลี่ยน [V]

## 5. Error Handling [V]

- **Data fetch:** ตรวจ `error` ของแต่ละ query แล้วแสดง toast/banner (`useDashboard.ts:75-79`, `useHistoryData.ts:23-27`)
- **Export:** **ไม่ตรวจ `error`** ของ query (`app/history/page.tsx:101-104`) และไม่มี try/catch ใน `ExportModal.handleConfirm` (`ExportModal.tsx:33-35`)
- **Insert/Update/Delete:** ตรวจ error แล้วแสดงข้อความ `error.message` จาก Supabase ตรง ๆ ซึ่งเป็นภาษาอังกฤษเชิงเทคนิค
- **Route errors:** `app/error.tsx` log ลง console ไม่มี monitoring (Sentry หรืออื่น ๆ)
- **Logging:** `console.*` 28 จุดใน source ไม่มี structured logging หรือ log drain [V จำนวน] / [U Vercel log drain]
- **Env:** `lib/env.ts` throw ตอน import ถ้า env ไม่ครบ ทำให้หน้าแตกทั้งแอปแบบ fail-fast โดยเจตนา

## 6. State Management [V]

- State ต่อหน้าด้วย `useState`/`useMemo` ไม่มี global store หรือ server cache (React Query/SWR)
- Dashboard เก็บ 4 dataset (`allRecords` 30 วัน, `expenses` 30 วัน, `unpaidRecords` ทั้งหมด, `yearRecords` 1 ปี) และ re-fetch ทั้งหมดเมื่อมี realtime event ใด ๆ
- History เก็บข้อมูลทั้งปีของปีที่เลือก
- Client persistence: ดูตารางใน `production-baseline.md` §5.1

## 7. Data Access Patterns และขีดจำกัด

| Query | ที่มา | ขอบเขต | ความเสี่ยง |
|---|---|---|---|
| records 30 วัน `select *` | `useDashboard.ts:69` | 30 วัน | ต่ำ |
| expenses 30 วัน | `useDashboard.ts:70` | 30 วัน | ต่ำ |
| records ค้างชำระทั้งหมด | `useDashboard.ts:71` | ไม่จำกัดเวลา | ปานกลางเมื่อข้อมูลโต |
| records 1 ปี (4 columns) | `useDashboard.ts:72` | 365 วัน | **สูง:** อาจเกิน max rows |
| records/expenses ทั้งปี `select *` | `useHistoryData.ts:19-20` | 1 ปี | **สูง:** อาจเกิน max rows |
| export ตามช่วงเดือน | `app/history/page.tsx:102-103` | ไม่จำกัด (เลือกได้หลายปี) | **สูง:** อาจเกิน max rows |
| count ต่อวัน / ต่อทะเบียน | `app/add/page.tsx:102`, `useAddRecord.ts:47` | head count | ต่ำ |

> **[I] Supabase จำกัดจำนวนแถวต่อ request ด้วย "Max rows" (ค่า default ของ project คือ 1000)** query ข้างต้นไม่มี `.range()` หรือ pagination ถ้าข้อมูลในช่วงนั้นเกิน limit ผลลัพธ์จะ **ถูกตัดโดยไม่มี error** ทำให้ยอดรวมใน History, รายรับตามลูกค้า และไฟล์ Excel ผิด ต้องยืนยัน (1) ค่า Max rows ใน Supabase → Settings → API และ (2) จำนวน records ต่อปี (SQL ข้อ 11 ใน `production-baseline.md`)

## 8. External Integrations [V]

| ระบบ | ทิศทาง | Auth | Failure handling |
|---|---|---|---|
| Supabase | Browser → Supabase | anon key + JWT | toast/banner |
| Open-Meteo | Browser → API | ไม่มี key | `Promise.allSettled` + retry 3 ครั้ง ห่างกัน 30 วินาที |
| Google Fonts (Sarabun) | Build time (`next/font`) แล้ว self-host | — | — |
| Gemini | Server → API (ไม่ได้ใช้แล้ว) | `GEMINI_API_KEY` | JSON error |

## 9. Deployment Architecture

| รายการ | ค่า | หลักฐาน |
|---|---|---|
| Host | Vercel | [I] จาก `.gitignore` (`.vercel`), commit `07095eb` |
| Config | default (ไม่มี `vercel.json`) | [V] |
| Install | `npm install` + `.npmrc legacy-peer-deps=true` | [V] |
| Build | `next build` (Turbopack) | [V] |
| Node | ไม่ได้กำหนด | [V] ไม่มี `engines` / [U] ค่าใน Vercel |
| Functions region | ไม่ได้กำหนด | [U] ถ้าอยู่ไกลจาก Supabase region จะเพิ่ม latency ของ middleware ทุก request |
| CI | ไม่มี | [V] |
| Monitoring | ไม่มี (ไม่มี Sentry, Vercel Analytics หรือ Speed Insights ใน dependencies) | [V] |
