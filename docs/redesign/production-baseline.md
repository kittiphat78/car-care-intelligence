# Production Baseline — Step 00

> วันที่ตรวจ: 2026-10-14
> Branch ที่ใช้ทำเอกสาร: `docs/redesign-step-00-baseline` (แตกจาก `main` @ `7f58eec`)
> ขอบเขต: Read-only audit ไม่มีการแก้โค้ด, Git history, Database หรือ Deployment Settings

ป้ายกำกับหลักฐาน:
- **[V] Verified**: ตรวจจากไฟล์หรือคำสั่งจริงในรอบนี้
- **[I] Inferred**: ข้อสันนิษฐานจากหลักฐานแวดล้อม
- **[U] Unknown**: ยังตรวจไม่ได้ ต้องให้เจ้าของระบบยืนยัน

---

## 1. สรุปสั้น

| หัวข้อ | สถานะ |
|---|---|
| Baseline candidate | `v1.0.0` → commit `7f58eec` บน `main` **[V]** |
| ตรงกับ Production บน Vercel หรือไม่ | **[U]** ยังยืนยันไม่ได้ (ไม่มีสิทธิ์เข้าถึง Vercel จากเครื่องนี้) |
| Code health ที่ baseline | lint, type-check, 146 tests และ production build ผ่านทั้งหมด **[V]** |
| Environment separation | **ไม่มีหลักฐานว่ามี Supabase แยกสำหรับ dev/preview** **[I]** ความเสี่ยงสูง |
| Database migrations | ไม่มีใน repo **[V]** และไม่รู้ schema จริงหรือ RLS **[U]** |
| Backup / Recovery | **[U]** ขึ้นกับ Supabase plan |

**ข้อสรุป:** Baseline ฝั่งโค้ดชัดเจนและตรวจสอบได้ แต่ **ยังไม่ควรเริ่มพัฒนาที่มีการเขียนข้อมูล** จนกว่าจะยืนยันสองเรื่อง (1) Vercel deploy commit ไหนอยู่ และ (2) มี Supabase project แยกสำหรับ non-production แล้ว

---

## 2. Git

### 2.1 Repository และ HEAD [V]

| รายการ | ค่า |
|---|---|
| Remote | `origin` → `https://github.com/kittiphat78/car-care-intelligence.git` |
| Default branch | `main` (tracking `origin/main`, in sync) |
| HEAD ของ `main` | `7f58eeca89f0a908c84d76c01439d8b4d29e85ff` — `chore(release): bump version to 1.0.0` — 2026-09-28 12:02 +0700 |
| Working tree ตอนเริ่มตรวจ | Clean ไม่มี uncommitted changes และไม่มี stash |
| `package.json` version | `1.0.0` |

### 2.2 Tags [V]

ทุก tag เป็น annotated tag และ `v1.0.0` ถูก push ขึ้น origin แล้ว

| Tag | Commit | หมายเหตุ |
|---|---|---|
| `v1.0.0` | `7f58eec` | = HEAD ของ main |
| `v0.4.0` | `30e380d` | env validation (zod) |
| `v0.3.0` | `9b70d4f` | weather cache, dynamic imports |
| `v0.2.0` | `ebb07a0` | security headers, a11y |
| *(ไม่มี tag)* | `d5ef5c9` | commit message ระบุ "v0.5.0" แต่ไม่มี tag `v0.5.0` |

### 2.3 Branches ที่ต้องระวัง

**Local-only branches ที่มี commit ยังไม่ merge และยังไม่ push** [V] (ถ้าเครื่องนี้เสีย งานจะหาย)

| Branch | Commits ahead of merge-base | Merge-base |
|---|---|---|
| `feature/redesign-cash-bill-pdf` | 3 (เปลี่ยน `lib/generateBill.ts`) | `07095eb` |
| `fix/input-sanitization-and-api-auth` | 1 | `e08389b` |
| `fix/prevent-duplicate-submit` | 1 | `e08389b` |

- [I] สอง branch `fix/*` น่าจะถูกแทนที่แล้วโดย `fix/critical-bugs-step2` ที่ merge เข้า main ไปแล้ว เพราะ `main` ปัจจุบันมี DOMPurify ใน `EditModal` และมี `authenticateRequest()` ใน API routes อยู่แล้ว ต้อง diff ยืนยันใน Step 01
- `feature/redesign-cash-bill-pdf` ยังไม่อยู่ใน main [V] ต้องตัดสินว่าจะนำเข้าหรือเก็บถาวร

**Remote branches:** มีประมาณ 30 branch ทุก branch merge เข้า main แล้ว ยกเว้น `origin/chore/performance-optimization` [V] ถ้าเปิด Vercel Git integration ไว้ [I] แต่ละ branch อาจมี Preview deployment ค้างอยู่

### 2.4 CI/CD [V]

- ไม่มี `.github/workflows` จึงไม่มี CI บน GitHub
- ไม่มี `vercel.json` แปลว่าใช้ค่า default ของ Vercel (framework preset Next.js)
- `.npmrc` ตั้ง `legacy-peer-deps` (commit `07095eb` ระบุว่าเพื่อแก้ Vercel build)

---

## 3. Application Baseline [V]

| รายการ | ค่า |
|---|---|
| Framework | Next.js 16.2.1 (App Router, Turbopack), React 19.2.4 |
| Language | TypeScript 5.9.3 (strict) |
| Styling | Tailwind CSS v4 + CSS custom properties (`app/globals.css`) |
| Data | `@supabase/ssr` 0.10 + `@supabase/supabase-js` 2.x ฝั่ง client เรียก DB โดยตรงด้วย anon key |
| Test | Vitest 2.1.9 + jsdom + Testing Library |
| Routes | `/` (dashboard), `/add`, `/history`, `/login`, `/_not-found`, `/api/insights` (POST), `/api/export-excel` (GET) |
| Auth guard | `middleware.ts` redirect `/`, `/add`, `/history` → `/login` เมื่อไม่มี session (ไม่ครอบ `/api/*` แต่ทุก route เรียก `authenticateRequest()` เอง) |

### 3.1 ผล Validation ที่ Baseline (รันบน branch นี้ ซึ่งโค้ดตรงกับ `7f58eec`)

สภาพแวดล้อม: Windows 11, Node v24.13.0, npm 11.6.2

| Check | คำสั่ง | ผล |
|---|---|---|
| Lint | `npm run lint` | ✅ exit 0, ไม่มี error/warning |
| Type-check | `npm run type-check` | ✅ exit 0 |
| Unit tests | `npm run test` | ✅ 6 files, **146 tests passed** (stderr ที่เห็นมาจาก test กรณี env ไม่ถูกต้อง ซึ่งเป็นพฤติกรรมที่ test ตั้งใจตรวจ) |
| Production build | `npm run build` | ✅ exit 0 |

Build warnings [V]:
1. `middleware.ts` convention ถูก deprecate ใน Next 16 ให้ใช้ `proxy` แทน (ยังใช้ได้)
2. Next.js เลือก workspace root ผิด เพราะมี `package-lock.json` อยู่ที่ `C:\Users\User\` ซึ่งเป็นปัญหาของเครื่อง local นี้เท่านั้น ไม่กระทบ Vercel

[U] Node version ที่ Vercel ใช้ build ยังไม่รู้ (ไม่ได้กำหนด `engines` ใน `package.json`)

---

## 4. Data Model (จากโค้ด) [I]

ไม่มีไฟล์ schema หรือ migration ใน repo [V] ด้านล่างอนุมานจาก `types/index.ts` และ query ในโค้ด

**`public.records`** (รายรับ) — `id`, `created_at`, `type` (`wash`|`polish`), `plate`, `services` (text[]), `price`, `seq_number`, `created_by`, `created_by_email`, `updated_by_email`, `updated_at`, `payment_method`, `customer_name`, `payment_status` (`paid`|`unpaid`), `job_status`, `note`

**`public.expenses`** (รายจ่าย) — `id`, `created_at`, `title`, `amount`, `note`, `created_by`, `created_by_email`, `updated_by_email`, `updated_at`

พฤติกรรมด้านข้อมูลที่สำคัญ [V จากโค้ด]:
- **Hard delete:** `hooks/useHistoryData.ts:46` ใช้ `.delete()` ตรง ๆ ไม่มี soft delete หรือ audit log
- **Bulk update:** `hooks/useDashboard.ts:142-146` อัปเดต `payment_status` ทุก record ของลูกค้ารายหนึ่งในคำสั่งเดียว
- **`seq_number`** คำนวณฝั่ง client จาก `count` ของวันนั้น +1 (`app/add/page.tsx:102-111`) ถ้าบันทึกพร้อมกันอาจได้เลขซ้ำ
- **`created_at` แก้ได้** จาก EditModal ผ่าน `handleSave`
- **ไม่มี data isolation ต่อ user ในโค้ด:** query ไม่ filter ด้วย `created_by` [I] จึงเป็นข้อมูลร้านเดียวที่ทุก user เห็นร่วมกัน การป้องกันทั้งหมดขึ้นกับ RLS [U]
- **Realtime:** subscribe `postgres_changes` บน `records` และ `expenses` (`hooks/useDashboard.ts:101-104`)

---

## 5. Integrations, Auth, Webhooks, Jobs

| รายการ | รายละเอียด | หลักฐาน |
|---|---|---|
| Supabase Auth | Email/password (`signInWithPassword`) ไม่มีหน้า sign-up หรือ reset password ในแอป | [V] |
| Auth users | จำนวน, ผู้ใช้จริง และสถานะการปิด sign-up | [U] |
| Roles/permissions | ไม่มี role ในแอป ทุก user ที่ login ได้ทำ CRUD ได้ทั้งหมด | [V โค้ด] / [U RLS] |
| Supabase Realtime | `records`, `expenses` | [V โค้ด] / [U publication] |
| Supabase Storage | ไม่ได้ใช้ในโค้ด | [V] |
| Open-Meteo (weather + AQI) | เรียกจาก client, ไม่ใช้ key, cache 30 นาทีใน `sessionStorage` | [V] |
| Gemini API | `/api/insights` ใช้ `GEMINI_API_KEY` (server-only) **แต่ไม่มีโค้ดฝั่ง client เรียก endpoint นี้แล้ว** | [V] |
| `/api/export-excel` | เป็น stub คืน JSON จำลอง และไม่มี client เรียก | [V] |
| Excel / PDF export | ทำฝั่ง client (`exceljs`, `jspdf`) | [V] |
| Webhooks (ขาเข้า) | ไม่มี route รับ webhook | [V] |
| Scheduled jobs | ไม่มี Vercel cron ใน repo | [V] |
| Database triggers / functions / pg_cron / DB webhooks | ตรวจจาก repo ไม่ได้ | [U] |
| Service worker | ไม่มี (มีแค่ `manifest.json`) จึงไม่มีปัญหา cache ค้างจาก SW | [V] |

### 5.1 Client-side state ที่ผูกกับ origin/domain [V]

`localStorage` keys: `car-care-theme`, `remembered_email`, `recentCustomers`, **`last_bill_number`**

> ⚠️ เลขที่บิลเงินสดเก็บใน `localStorage` ของแต่ละเครื่อง (`lib/generateBill.ts:33-35`) ถ้าเปลี่ยน domain, ล้าง browser หรือเปลี่ยนเครื่อง เลขบิลจะเริ่มใหม่ จึงต้องระวังเมื่อมีการเปลี่ยน domain หรือ storage key

---

## 6. Environment Variables (ชื่อเท่านั้น ไม่แสดงค่า)

| Variable | Scope | Local `.env.local` | Vercel |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | ตั้งค่าแล้ว [V] | [U] |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | ตั้งค่าแล้ว, JWT claim `role=anon` (ไม่ใช่ service role) [V] | [U] |
| `GEMINI_API_KEY` | Server-only | ไม่ได้ตั้ง [V] | [U] |
| `NEXT_PUBLIC_WEATHER_LAT/LON` | Public | ไม่ได้ตั้ง (ใช้ค่า default 19.91/99.84) [V] | [U] |

- ไม่พบ service role key ทั้งใน repo และ `.env.local` [V]
- `.env*` ถูก ignore ยกเว้น `.env.example` และ `.env.local` ไม่เคยถูก track [V]

---

## 7. เอกสารเดิมที่ล้าสมัย

`PROJECT_AUDIT.md` (2026-09-13, ตรวจที่ `07095eb`) ล้าสมัยแล้ว [V] เช่น ระบุว่าไม่มี `vitest.setup.ts`, ไม่มี test, API ไม่มี auth และ `types/index.tsx` ซึ่งถูกแก้หมดแล้ว **ห้ามใช้เป็นแหล่งข้อมูลปัจจุบัน** ให้ใช้เอกสารชุดนี้แทน

---

## 8. Read-only SQL สำหรับยืนยัน Unknowns (ให้เจ้าของรันใน Supabase SQL Editor)

ทุกคำสั่งเป็น `SELECT` ไม่แก้ข้อมูล ผลลัพธ์ข้อ 11 ห้ามแชร์อีเมลผู้ใช้ ส่งมาแค่จำนวน

```sql
-- 1. RLS เปิดหรือไม่
select tablename, rowsecurity from pg_tables where schemaname = 'public';

-- 2. Policies
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public';

-- 3. Columns / types / defaults
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema = 'public'
order by table_name, ordinal_position;

-- 4. Indexes / constraints
select tablename, indexname, indexdef from pg_indexes where schemaname = 'public';

-- 5. Triggers
select event_object_table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers where trigger_schema = 'public';

-- 6. Functions
select routine_name, routine_type, security_type
from information_schema.routines where routine_schema = 'public';

-- 7. Realtime publication
select schemaname, tablename from pg_publication_tables where pubname = 'supabase_realtime';

-- 8. Extensions (ดูว่ามี pg_cron / pg_net หรือไม่)
select extname, extversion from pg_extension order by extname;

-- 9. Migration history ของ Supabase CLI (null = ไม่เคยใช้)
select to_regclass('supabase_migrations.schema_migrations') as migrations_table;

-- 10. Grants ที่ anon / authenticated มี
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
order by table_name, grantee;

-- 11. ขนาดข้อมูลและจำนวนผู้ใช้ (ไม่ดึงอีเมล)
select 'records' as t, count(*) from public.records
union all select 'expenses', count(*) from public.expenses
union all select 'auth.users', count(*) from auth.users;

-- 12. Storage buckets
select id, public from storage.buckets;
```

ถ้าข้อ 8 พบ `pg_cron` ให้รันเพิ่ม: `select jobid, schedule, active from cron.job;`
