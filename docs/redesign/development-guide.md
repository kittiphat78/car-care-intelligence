# Development Guide

> Step 12 · 2026-10-20 · สำหรับนักพัฒนาที่รับงานต่อ · ป้าย: **[V]** Verified · **[I]** Inferred · **[U]** Unknown
> ภาพรวมระบบ `architecture.md` · ตัวแปร environment `environment-setup.md` · การทดสอบ `testing-guide.md` · branch และ release `git-workflow.md`
> ขั้นตอนใน §1–§3 ทดลองทำตามจริงบนเครื่องอื่นแล้วหรือยัง ดู §8

## 1. สิ่งที่ต้องมี

| เครื่องมือ | เวอร์ชัน | หมายเหตุ |
|---|---|---|
| Node.js | 22.x (เท่ากับ CI) | ทดลองกับ 24.13 แล้วใช้ได้ [V] · Vercel ใช้เวอร์ชันไหน [U] |
| npm | มากับ Node | ใช้ `npm ci` (มี `package-lock.json`) · `.npmrc` ตั้ง `legacy-peer-deps=true` |
| Git | ใดก็ได้ | |
| Docker Desktop | ล่าสุด | สำหรับ Supabase ในเครื่อง |
| Supabase CLI | **2.118.0** | เวอร์ชันเดียวกับ CI · ไม่อยู่ใน `package.json` · ติดตั้งจาก GitHub Releases ของ `supabase/cli` |
| Playwright browsers | ตาม `@playwright/test` 1.63.0 | `npx playwright install chromium` (และ `webkit` ถ้าจะทดสอบแบบ Safari) |

## 2. ติดตั้งครั้งแรก

```bash
git clone https://github.com/kittiphat78/car-care-intelligence.git
cd car-care-intelligence
git switch develop                 # งานปกติแตกจาก develop (git-workflow.md)
npm ci
```

## 3. รันแอปในเครื่อง

```bash
# 1) ฐานข้อมูลในเครื่อง: migrations ทุกไฟล์ + seed (ข้อมูลสมมติ ~1,260 รายการ) ถูกใส่ให้อัตโนมัติ
supabase start -x realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
supabase status -o env

# 2) สร้าง .env.local ตาม environment-setup.md §4.1 แล้วสร้างบัญชีสมาชิก (§4.1 เดียวกัน)

# 3) รัน
npm run dev                         # http://localhost:3000
```

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | dev server (Turbopack) |
| `npm run build` แล้ว `npm run start` | build แบบ production แล้วรัน |
| `npm run lint` | ESLint (รวมกฎ design system ใน `eslint.config.mjs`) |
| `npm run type-check` | `tsc --noEmit` |
| `npm test` | Vitest (unit/component) |
| `npm run test:e2e` | Playwright กับ Supabase ในเครื่อง (`testing-guide.md`) |
| `npm run validate` | lint + type-check + test + build: **รันก่อน push ทุกครั้ง** |
| `supabase stop` | ปิดฐานข้อมูลในเครื่อง (ข้อมูลเก็บไว้) · `supabase db reset` ล้างแล้วใส่ migrations + seed ใหม่ |

**Windows:** ถ้า Supabase CLI ฟ้องเรื่องโฟลเดอร์ชั่วคราว ให้ตั้ง `TMP`/`TEMP` เป็นโฟลเดอร์ที่เขียนได้ก่อนรัน · ต้องเปิด Docker Desktop ก่อนทุกครั้ง [V]

## 4. โครงสร้างโฟลเดอร์ (ที่ใช้งานจริง)

```
app/                         Next.js App Router
  layout.tsx                 ฟอนต์, metadata, theme script กันกะพริบ
  globals.css, styles/       design tokens (Tailwind 4 @theme)
  error.tsx, not-found.tsx   หน้า error / 404
  (auth)/login/page.tsx      หน้า login (server shell)
  (app)/layout.tsx           ตรวจ login ฝั่ง server + AppShell (เมนู)
  (app)/page.tsx, add/, debts/, history/, more/   server shell ของแต่ละหน้า → XxxScreen
  api/client-errors/route.ts รับรายงาน error จากเบราว์เซอร์
proxy.ts                     refresh session + redirect (Next 16 ใช้ proxy แทน middleware)
components/
  ui/                        primitives ไม่รู้จัก domain: Button, Dialog, TextInput, ChoiceGroup, Toast, …
  patterns/                  ประกอบ primitives: FormField, fields/, ActionBar, nav/ (AppShell), StatusBar, theme
features/<domain>/           โค้ดของแต่ละเรื่อง
  components/                หน้าจอและส่วนประกอบ (Client Components)
  api.ts                     data access (Supabase) คืน Result<T>
  logic.ts / editor.ts       pure functions (ไม่มี React, ไม่มี Supabase)
  hooks.ts                   state + เรียก api
  schema.ts                  Zod schema (records)
  server.ts                  query ฝั่ง server (debts: badge)
  __tests__/                 unit/component tests
  ── auth/ dashboard/ debts/ history/ records/
hooks/                       useWeather (Open-Meteo), useGlobalErrorReporting
lib/
  supabase.ts                Supabase client ฝั่งเบราว์เซอร์
  supabase/server.ts         Supabase client ฝั่ง server (cookies)
  auth/                      session (getSessionUser), redirect (next=, path ที่ต้อง login)
  serverAuth.ts              ตรวจ login ใน Route Handler
  env.ts, env-guard.ts       ตรวจตัวแปร environment / กันชี้ฐานข้อมูลผิด
  errors.ts, result.ts       AppError, Result, ข้อความไทย
  observability.ts           reportAppError → /api/client-errors
  fetch-all-pages.ts         ดึงทีละ 1,000 แถวจนครบ
  time/bangkok.ts            วันเวลา Asia/Bangkok
  export.ts, spreadsheet-text.ts   ส่งออก Excel (กัน formula injection)
  generateBill.ts            บิล PDF
  zod.ts                     zod/mini (ไม่ใช้ eval เพื่อ CSP)
  use-hydrated.ts, use-early-typing.ts*   ความปลอดภัยของฟอร์มก่อนหน้าพร้อม (D-07, D-08)
types/index.ts               type ของตาราง + CAR_TYPES, CAR_BRANDS
supabase/
  config.toml                ใช้กับ CLI ในเครื่องและ CI เท่านั้น
  migrations/                M000–M009 (database-migrations.md)
  rollback/                  down script ต่อ migration
  tests/                     SQL tests + ci_fixtures.sql
  checks/                    SQL ตรวจข้อมูล/backup ที่เจ้าของรันเอง
  seed.sql                   ข้อมูลสมมติ (ห้ามรันบน production)
e2e/                         Playwright: CUJ, security, regression, UI quality (Supabase ในเครื่อง)
e2e-preview/                 Playwright กับ Vercel Preview + staging (ไม่รันใน CI)
public/                      manifest, icons, fonts
docs/redesign/               เอกสารทั้งหมด · docs/incidents/ บันทึกเหตุการณ์
```

\* `lib/use-early-typing.ts` อยู่ใน branch แก้ D-08 (รอ merge เข้า `develop`)

### 4.1 กฎการ import

| จาก | import ได้ | ห้าม |
|---|---|---|
| `components/ui` | `lib/` (utility) | `features/*`, Supabase |
| `components/patterns` | `components/ui`, `lib/` | `features/*`, Supabase |
| `features/x/components` | `components/*`, `features/x/*`, `features/records/*` (domain ที่ใช้ร่วม) | เรียก `supabase` ตรง (ไปผ่าน `api.ts`) |
| `features/x/api.ts` | `lib/supabase`, `lib/result`, `lib/errors`, `lib/fetch-all-pages`, `types` | React |
| `features/x/logic.ts` | `lib/time`, `types` | React, Supabase, `Date.now()` ตรง (รับวันที่เป็น parameter) |
| `lib/supabase/server.ts` | `next/headers` | import จาก Client Component |

กฎนี้เป็นข้อตกลง ยังไม่มี ESLint บังคับ [V] · ตรวจตอน review

## 5. เพิ่มหรือแก้ฟีเจอร์

1. **อ่านเอกสาร Next.js ในเครื่องก่อนเขียนโค้ด Next:** `node_modules/next/dist/docs/` (Next 16 ต่างจากเวอร์ชันเก่า เช่น `proxy.ts`, Activity) · ดู `AGENTS.md`
2. **แตก branch จาก `develop`** (`git-workflow.md` §3.1)
3. **Data access:** เพิ่มฟังก์ชันใน `features/<x>/api.ts` ที่คืน `Result<T>` ผ่าน `run()` (`features/records/api.ts`) · รายการที่อาจเกิน 1,000 แถวต้องผ่าน `fetchAllPages` · ยอดรวมให้ทำเป็น RPC ในฐานข้อมูล
4. **กฎข้อมูล:** ตรวจใน Zod (`features/records/schema.ts`) เพื่อแสดงข้อความไทย **และ** ใส่ constraint ในฐานข้อมูล (migration ใหม่) · อย่าเชื่อ client อย่างเดียว
5. **Logic:** เขียนเป็น pure function ใน `logic.ts`/`editor.ts` แล้ว test ตรง ๆ
6. **UI:** ใช้ `components/ui` และ `components/patterns` · สีจาก token เท่านั้น (ESLint ฟ้องถ้าใช้สี Tailwind ตรง, hex, ตัวอักษร < 14px, uppercase) · แตะได้ ≥ 44 px · ข้อความภาษาไทยสั้นและชัด (`interaction-specifications.md`, `accessibility-guidelines.md`)
7. **ฟอร์มที่ server render:** ต้องมี `method="post"` · ปุ่มส่งใช้ `useHydrated()` ปิดไว้จนหน้าพร้อม · ช่องกรอกแบบ controlled ให้ใช้ `useKeepEarlyTyping()` (D-07, D-08)
8. **เปลี่ยนฐานข้อมูล:** ทำตาม `database-migrations.md` (expand-only, มี down script และ SQL test)
9. **Test:** unit test ทุก logic ใหม่ · E2E ถ้าแตะ CUJ · `npm run validate` ผ่านก่อน push
10. **PR เข้า `develop`** ตาม template (`.github/pull_request_template.md`) · บรรทัดแรกต้องบอก SQL ที่ต้องรันบน production ก่อน merge (ถ้ามี)

## 6. ข้อตกลงอื่น

| เรื่อง | ข้อตกลง | อ้างอิง |
|---|---|---|
| Commit / PR title | Conventional Commits · CI ตรวจ PR title ด้วย regex `^(feat\|fix\|perf\|refactor\|style\|test\|docs\|build\|ci\|chore\|db\|revert)(\([a-z0-9-]+\))?!?: .{1,72}$` | `commit-conventions.md`, `.github/workflows/pr-title.yml` |
| Dependency | ไม่เพิ่ม runtime dependency โดยไม่จำเป็น · เวอร์ชันที่ออกมาแล้ว ≥ 2 สัปดาห์ · `npm audit --omit=dev` ต้องไม่มี High/Critical | ADR-14, CI `audit` |
| Secrets | ห้าม commit `.env*` (ยกเว้น `.env.example`) · CI `secrets` ตรวจ | `environment-setup.md` |
| เวลา | ใช้ `lib/time/bangkok.ts` เสมอ · อย่าใช้ `new Date().getDate()` ตรง | ADR-06 |
| เก็บในเครื่อง | อย่าเปลี่ยนชื่อ key ใน localStorage (`car-care-theme`, `remembered_email`, `recentCustomers`, `last_bill_number`) เพราะ rollback แล้วเวอร์ชันเก่ายังอ่าน | `migration-and-rollback.md` §7 |
| ข้อความ error | ผู้ใช้เห็นข้อความจาก `toUserMessage()` เท่านั้น · ห้ามแสดง `error.message` ดิบ | `lib/errors.ts` |

## 7. ปัญหาที่เจอบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `❌ [ENV VALIDATION FAILED]` ตอนเปิดแอป | ยังไม่มี `.env.local` หรือขาด URL/key (`environment-setup.md` §2) |
| login ได้แต่ทุกหน้าว่าง | บัญชียังไม่อยู่ใน `app_members` (`environment-setup.md` §4.1) |
| `supabase start` ล้ม | Docker ยังไม่เปิด · port 54321/54322 ถูกใช้ · ลอง `supabase stop` แล้ว start ใหม่ |
| E2E ล้มเพราะ port 3100 ถูกใช้ | มี `next start` ค้างจากรอบก่อน: หา PID (`netstat -ano \| findstr :3100` บน Windows) แล้วปิด |
| Build ล้มด้วย `[env-guard]` | ตั้ง URL ชี้ฐานข้อมูลผิด environment (`environment-setup.md` §3) |
| Hydration mismatch ใน console | อย่าใช้ค่าที่ต่างกันระหว่าง server กับ client ตอน render (`Date.now()`, `window`) · อ่านค่าในเบราว์เซอร์ใน effect หรือใช้ `useSyncExternalStore` |

## 8. ผลการทดลองทำตามเอกสารนี้

(เติมหลังทดลอง: Step 12 task 12)
