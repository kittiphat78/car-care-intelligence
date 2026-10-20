# Architecture (as built, v2.1.0)

> อัปเดต Step 12 · 2026-10-20 · ตรวจกับโค้ดที่ `8465548` (tag `v2.1.0`) · ป้าย: **[V]** Verified จากโค้ด/การทดสอบ · **[I]** Inferred · **[U]** Unknown
> เอกสารนี้อธิบาย**ระบบที่สร้างเสร็จแล้ว** · แผนเดิมของ Step 05 อยู่ใน git history ของไฟล์นี้ และเหตุผลของการตัดสินใจอยู่ใน `architecture-decisions.md`
> อ่านต่อ: โครงโฟลเดอร์และวิธีเพิ่มโค้ด `development-guide.md` · ฐานข้อมูล `database-schema.md`, `database-migrations.md` · สิทธิ์ `authorization-matrix.md`

## 1. ภาพรวม

ระบบบันทึกรายรับ รายจ่าย และยอดค้างชำระของร้านคาร์แคร์ 1 ร้าน ใช้งานบนมือถือ tablet และ PC โดยคนในร้านไม่กี่คน

```
┌──────────────────────── Browser (มือถือ / tablet / PC) ────────────────────────┐
│ Client Components  features/*/components                                        │
│   UI (components/ui, components/patterns)                                       │
│     → feature hooks / logic (pure, มี unit test)                                │
│     → features/*/api.ts  (data access, คืน Result<T> ไม่ throw)                  │
│         → lib/supabase.ts  supabase-js + publishable/anon key + JWT ของผู้ใช้     │
│ เก็บในเครื่อง: theme, อีเมลที่จำไว้, ลูกค้าล่าสุด (localStorage) · draft ฟอร์ม, cache อากาศ (sessionStorage) │
└──────────┬──────────────────────────────────────────────┬──────────────────────┘
           │ เปิดหน้า (HTML)                                │ HTTPS: PostgREST / RPC / Auth
┌──────────▼────────── Vercel (Next.js 16, Node) ──┐   ┌──▼──────────── Supabase ───────────────────┐
│ proxy.ts: refresh session cookie + redirect      │   │ Auth: email + password                     │
│ app/(app)/layout.tsx: getUser() ฝั่ง server       │   │ Postgres (เส้นแบ่งความปลอดภัยจริง):          │
│   + นับลูกค้าค้างชำระสำหรับ badge                 │   │   RLS: เฉพาะสมาชิกใน app_members             │
│ Server Components: page shell + <title>           │   │   constraints, triggers (audit, seq_number) │
│ POST /api/client-errors → Vercel runtime logs     │   │   RPC: dashboard_today, daily_series,       │
│ Security headers + CSP (next.config.ts)           │   │        customer_breakdown, settle_records   │
│ env guard ตอน build (lib/env-guard.ts)            │   │ Realtime: โค้ดฟังอยู่ แต่ production ปิด (§7) │
└───────────────────────────────────────────────────┘   └────────────────────────────────────────────┘
      บริการภายนอก (ไม่มี key): api.open-meteo.com (พยากรณ์อากาศ), air-quality-api.open-meteo.com (คุณภาพอากาศ)
```

| ชั้น | ทำอะไร | ไม่ทำอะไร |
|---|---|---|
| **Database** | สิทธิ์ (RLS), ความถูกต้องของข้อมูล (constraints), ค่าที่ปลอมไม่ได้ (audit fields, เลขลำดับต่อวัน), การรวมยอด (RPC) | — |
| **Server (Vercel)** | ตรวจ login ก่อนส่งหน้า, header ความปลอดภัย, `<title>`, รับรายงาน error | **ไม่**เป็นทางผ่านของข้อมูลธุรกิจ ยกเว้นการนับ badge ค้างชำระใน layout (§5) |
| **Client** | UI, ตรวจฟอร์มเพื่อแสดงข้อความไทยทันที, ส่งออก Excel, สร้างบิล PDF, draft | ไม่ใช่ที่บังคับกฎ: ทุกกฎมีซ้ำในฐานข้อมูล |

เหตุผลหลัก: anon/publishable key อยู่ในเบราว์เซอร์และใครก็เรียก PostgREST ตรงได้ จึงบังคับกฎที่ฐานข้อมูล (ADR-02, ADR-04)

## 2. เส้นทางและ Server/Client

| URL | ไฟล์ | ชนิด | หน้าจอ |
|---|---|---|---|
| `/login` | `app/(auth)/login/page.tsx` | Server shell (prerender) | `features/auth/components/LoginForm.tsx` |
| `/` | `app/(app)/page.tsx` | Server shell (dynamic) | `features/dashboard/components/DashboardScreen.tsx` |
| `/add?type=income\|expense` | `app/(app)/add/page.tsx` | Server shell | `features/records/components/AddScreen.tsx` |
| `/debts` | `app/(app)/debts/page.tsx` | Server shell | `features/debts/components/DebtsScreen.tsx` |
| `/history` | `app/(app)/history/page.tsx` | Server shell | `features/history/components/HistoryScreen.tsx` |
| `/more` | `app/(app)/more/page.tsx` | Server shell | `features/auth/components/MoreScreen.tsx` |
| `POST /api/client-errors` | `app/api/client-errors/route.ts` | Route Handler (Node) | — |
| ทุกหน้า | `app/layout.tsx` | Server: ฟอนต์, metadata, theme script กันกะพริบ | — |
| ทุกหน้าใน `(app)` | `app/(app)/layout.tsx` | Server: ตรวจ login + `<AppShell>` (เมนูล่างบนมือถือ, เมนูซ้ายบน PC) | `components/patterns/nav/*` |

หน้าจอทุกหน้าเป็น Client Component ที่โหลดข้อมูลเองหลังหน้าพร้อม เพื่อให้กด "อัปเดต" และ refresh เงียบได้โดยไม่ต้องมี data-fetching library (ADR-03) [V]

## 3. Authentication

| ขั้น | ทำงานอย่างไร | ไฟล์ |
|---|---|---|
| Login | `supabase.auth.signInWithPassword` จากเบราว์เซอร์ · ข้อความผิดพลาดเดียวสำหรับอีเมลหรือรหัสผิด · จำอีเมลในเครื่องได้ (ไม่จำรหัส) | `features/auth/api.ts`, `LoginForm.tsx` |
| ฟอร์มก่อนหน้าพร้อม | `method="post"`, ช่องกรอกแบบ uncontrolled และปุ่มกดไม่ได้จนหน้าพร้อม เพื่อไม่ให้เบราว์เซอร์ส่งรหัสผ่านไปใน URL (D-07) | `LoginForm.tsx`, `lib/use-hydrated.ts` |
| Session | `@supabase/ssr` เก็บ session ใน cookie `sb-<project>-auth-token` และ refresh token อัตโนมัติ | `lib/supabase.ts`, `lib/supabase/server.ts` |
| ทุก request | `proxy.ts` refresh cookie แล้ว redirect: ไม่ login + หน้าที่ต้อง login → `/login?next=<หน้าเดิม>` · login แล้วเปิด `/login` → หน้าใน `next` (เฉพาะ path ในเว็บเดียวกัน กัน open redirect) | `proxy.ts`, `lib/auth/redirect.ts` |
| ชั้นที่ 2 | `app/(app)/layout.tsx` เรียก `getUser()` ฝั่ง server อีกครั้ง (ถาม Supabase ไม่เชื่อ cookie อย่างเดียว) เผื่อ request ไม่ผ่าน proxy | `lib/auth/session.ts` |
| Session หมดอายุ | กล่อง "กรุณาเข้าสู่ระบบอีกครั้ง" · draft ในฟอร์มยังอยู่ | `SessionExpiredDialog.tsx` |
| ออกจากระบบ | `signOut({ scope: 'local' })` ออก**เฉพาะเครื่องนี้** (D-03) · ถ้าเน็ตหลุดลบ cookie ในเครื่องเอง (D-06) · ล้าง draft ฟอร์มทั้งหมดในเครื่อง (`clearLocalDrafts`) | `features/auth/api.ts`, `LogoutDialog.tsx`, `features/auth/drafts.ts` |
| API ของแอป | `/api/client-errors` ตรวจ same-origin + `getUser()` → ไม่ login ได้ 401 | `lib/serverAuth.ts` |

ไม่มีหน้า sign-up และ reset password ในแอป [V] · สถานะ "Allow new users to sign up" ของ production [U] (ถึงเปิดอยู่ คนที่สมัครเองก็ไม่เห็นข้อมูล เพราะ RLS §4)

## 4. Authorization

| ใคร | เห็น/แก้ข้อมูลร้าน | บังคับที่ |
|---|---|---|
| ไม่ได้ login (anon key อย่างเดียว) | ❌ ทุกตารางและทุก RPC ถูกปฏิเสธ (`42501`) | RLS + revoke จาก `anon` (M002) |
| login แล้วแต่**ไม่ใช่สมาชิก** | ❌ ได้ผลว่าง ไม่ใช่ error · เขียนไม่ได้ | RLS `is_app_member()` (M001, M002) |
| สมาชิกใน `app_members` | ✅ อ่าน/เพิ่ม/แก้/ลบ `records`, `expenses` · เรียก RPC | RLS + RPC แบบ `SECURITY INVOKER` |
| สมาชิกที่ส่งค่า audit ปลอม | ค่าถูกแทนด้วยค่าจาก JWT | trigger (M005) |
| จัดการรายชื่อสมาชิก | ผู้ดูแลเท่านั้น ผ่าน Supabase SQL Editor (ไม่มี policy ให้แอปเขียน) | ไม่มี policy |

ไม่มี role ภายในร้าน (ทุกสมาชิกทำได้เท่ากัน) · รายละเอียด `authorization-matrix.md` · ทดสอบอัตโนมัติ: `supabase/tests/member_rls.test.sql` และ `e2e/security.spec.ts` (3 บัญชี) [V]

## 5. Data Flow

| Use case | ทางเดินของข้อมูล | กันปัญหา |
|---|---|---|
| หน้าภาพรวม | `loadDashboard()` → RPC `dashboard_today`, `daily_series` (30 วัน), `customer_breakdown` + รายการวันนี้ (`listBetween`) + ยอดค้าง · กราฟโหลดทีหลังข้อมูล | ยอดคำนวณใน DB ไม่ถูกตัดที่ row limit (ADR-05) · ไฟล์กราฟโหลดไม่ได้ก็แค่กล่องกราฟแสดงข้อความ (D-11) |
| บันทึกรายรับ/รายจ่าย | ฟอร์ม → `checkIncome`/`checkExpense` (Zod) → `createIncome`/`createExpense` (insert ตรง) พร้อม `client_request_id` ใหม่ต่อการบันทึก | กดซ้ำหรือ retry หลัง timeout ไม่เกิดรายการซ้ำ (ADR-07) · `seq_number` และ audit ตั้งโดย trigger |
| แก้ไข | `EditRecordDialog` → `updateEntry()` ส่ง**เฉพาะ field ที่เปลี่ยน** + เงื่อนไข `updated_at` เดิม | 0 แถว = `CONFLICT` (มีคนแก้จากเครื่องอื่น) หรือ `NOT_FOUND` (ถูกลบ) |
| ลบ | `deleteEntry()` (hard delete) | ไม่มี soft delete หรือถังขยะ (known-issues) |
| ค้างชำระ | `listUnpaid()` → จัดกลุ่มตามลูกค้าใน client · เคลียร์ยอด → RPC `settle_records(ids)` คืนจำนวนแถวและยอด | เคลียร์เฉพาะแถวที่เห็นบนจอ (ER-03) |
| Badge ค้างชำระบนเมนู | `countUnpaidCustomers()` ฝั่ง server ใน layout (ใช้ session ของผู้ใช้ จึงผ่าน RLS) | จำกัด 5,000 แถว |
| ประวัติ | `loadYear()` → `fetchAllPages` ทีละ 1,000 แถว + ตรวจ `count` ว่าครบ · กรอง/ค้นหาใน client | ไม่ถูกตัดที่ 1,000 แถว (ER-02) |
| ส่งออก Excel | `loadExportRange()` → `lib/export.ts` (exceljs โหลดเมื่อกด) | ค่าที่ขึ้นต้น `= + - @` ถูกเขียนเป็นข้อความ (formula injection) |
| บิล PDF | `lib/generateBill.ts` (jspdf โหลดเมื่อกด) ในเบราว์เซอร์ | ไม่มีไฟล์เก็บบน server |
| อากาศ | `hooks/useWeather.ts` → Open-Meteo ตรงจากเบราว์เซอร์ · cache 30 นาที | พยากรณ์โหลดไม่ได้ → ไม่แสดงค่าปลอม (D-10) |

**เวลา:** ทุกการคิด "วันนี้/เดือน/ปี" ใช้ Asia/Bangkok ทั้ง client (`lib/time/bangkok.ts`) และ RPC (ADR-06) · **เงิน:** จำนวนเต็มบาท
**ประเภทรถ ยี่ห้อ หมายเหตุ** เก็บใน `records.services` เป็น `[ประเภทรถ, ยี่ห้อ, หมายเหตุ]` ตามตำแหน่ง (ADR-09) · แปลงที่ `features/records/editor.ts`

## 6. Error, Logging, Observability

- `features/*/api.ts` คืน `Result<T>` เสมอ · error แปลงเป็น `AppError` (`NETWORK`, `TIMEOUT`, `AUTH_EXPIRED`, `FORBIDDEN`, `VALIDATION`, `NOT_FOUND`, `CONFLICT`, `DUPLICATE`, `ROW_LIMIT`, `SERVER`, `UNKNOWN`) ใน `lib/errors.ts` · ผู้ใช้เห็นข้อความไทยจาก `toUserMessage` ไม่เห็นข้อความดิบ
- `reportAppError()` (`lib/observability.ts`) ส่ง `code`, `ref` 8 ตัว, หน้า, ข้อความย่อ, เวอร์ชัน → `POST /api/client-errors` → `console.log` เป็น JSON (`"source":"client"`, user id แบบ hash 16 ตัว) ลง Vercel runtime logs · **ไม่มีอีเมล ทะเบียน หรือชื่อลูกค้า**
- `hooks/useGlobalErrorReporting.ts` จับ event `error` และ `unhandledrejection` ของ window · `app/error.tsx` แสดงหน้า error พร้อมเลขอ้างอิง (digest ของ Next) ที่ตรงกับ log ฝั่ง server
- ข้อจำกัด: Vercel Hobby ดู log ย้อนได้ 30 นาทีและไม่มี alert [V เจ้าของ 2026-10-19] · ไม่มี Sentry (ADR-11)

## 7. Realtime

`features/dashboard/hooks.ts` subscribe `postgres_changes` ของ `records` และ `expenses` แล้วโหลดหน้าภาพรวมใหม่ (หน่วง 300 ms) [V] แต่ **Realtime publication ปิดอยู่บน production** จึงไม่มี event · ผู้ใช้กด "อัปเดต" หรือเปิดหน้าใหม่ (known-issues K-07) · การเปิดใช้ต้องเปิด publication ใน Supabase และทดสอบว่า RLS ยังกรอง event (ADR-04)

## 8. ความปลอดภัยของแพลตฟอร์ม

| เรื่อง | การตั้งค่า | ที่ |
|---|---|---|
| Security headers | CSP, HSTS (2 ปี + preload), `X-Frame-Options: SAMEORIGIN`, `nosniff`, Referrer-Policy, Permissions-Policy · ไม่มี `X-Powered-By` | `next.config.ts` |
| CSP | `script-src 'self' 'unsafe-inline'` (ไม่มี `unsafe-eval` บน production, D-05) · `connect-src` เฉพาะ Supabase และ Open-Meteo · `frame-ancestors 'none'` | `next.config.ts` |
| Env guard | build **ล้ม**ถ้า Preview/Development ชี้ฐานข้อมูล production หรือ production ไม่ได้ชี้ production (ADR-12) · แถบ "ระบบทดสอบ (Preview)" บนทุกที่ที่ไม่ใช่ production | `lib/env-guard.ts`, `next.config.ts` |
| Key ในเบราว์เซอร์ | เฉพาะ publishable/anon key · CI ตรวจว่า `.next/static` ไม่มี service role / `sb_secret_` | `.github/workflows/ci.yml` (`e2e` job) |
| ฟอร์มก่อนหน้าพร้อม | ฟอร์มที่มาพร้อม HTML ต้อง `method="post"` และปุ่มส่งปิดจนหน้าพร้อม (D-07) · ข้อความที่พิมพ์ก่อนพร้อมถูกเก็บเข้า state (D-08, ใน `develop`) | `lib/use-hydrated.ts`, `lib/use-early-typing.ts` |

## 9. Runtime และ Dependency

| เรื่อง | ค่า |
|---|---|
| Next.js / React | `next 16.3.8`, `react 19.2.4` · App Router · `proxy.ts` (แทน middleware) · Node runtime (ไม่ใช้ Edge) [V] |
| Runtime deps | `@supabase/ssr`, `@supabase/supabase-js`, `exceljs`, `file-saver`, `jspdf`, `recharts`, `zod` (ใช้ `zod/mini` ผ่าน `lib/zod.ts` เพื่อไม่ต้อง eval, D-05) [V] |
| ไฟล์หนักโหลดเมื่อใช้ | `recharts` (หลังข้อมูลมาถึง), `exceljs` (ตอนส่งออก), `jspdf` (ตอนสร้างบิล) [V] |
| Node | CI ใช้ Node 22 [V] · Vercel [U] (ยังไม่มี `engines.node`) |
| Region ของ function | [U] ควรอยู่ใกล้ Supabase เพราะ proxy + layout เรียก Auth ทุก request |
| Storage / Cron / Edge Functions | ไม่ใช้ [V] |

## 10. ต่างจากแผน Step 05 อย่างไร

| แผน | ที่สร้างจริง |
|---|---|
| `lib/supabase/browser.ts`, `features/weather`, `config/shop.ts`, `types/database.ts` (generated) | browser client ยังอยู่ที่ `lib/supabase.ts` · อากาศอยู่ `hooks/useWeather.ts` · บิล/Excel อยู่ `lib/generateBill.ts`, `lib/export.ts` · type เขียนเองใน `types/index.ts` |
| Realtime 1 channel ต่อ AppShell | channel อยู่ในหน้าภาพรวม และ production ยังปิด publication |
| `debt_summary`, `period_summary` RPC | ยอดค้างและสรุปประวัติคำนวณใน client จากรายการที่โหลดครบแล้ว (`features/debts/logic.ts`, `features/history/logic.ts`) |
| Production migration ผ่าน GitHub workflow ที่ต้องอนุมัติ | ไม่ได้สร้าง workflow · เจ้าของรัน SQL บน production เองก่อน merge (`database-migrations.md`) |
| Server ไม่แตะข้อมูลธุรกิจ | layout นับลูกค้าค้างชำระฝั่ง server สำหรับ badge (ผ่าน RLS ด้วย session ของผู้ใช้) |
