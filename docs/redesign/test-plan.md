# Step 08 — Test Plan

> Step: 08 — Automated Testing, Regression & Security QA · 2026-10-18
> ขอบเขต: v2.0.0 (production `99b7311`) + การแก้ใน branch `qa/step-08`
> ผลการทดสอบ: `test-results.md` · ฟีเจอร์เดิม: `regression-report.md` · ความปลอดภัย: `security-review.md` · ข้อบกพร่อง: `defect-log.md`
> ป้ายหลักฐาน: **[V]** Verified (รันหรือดูจริง) · **[I]** Inferred (อนุมานจากโค้ด/เอกสาร) · **[U]** Unknown

## 1. หลักการ

1. **ไม่แตะข้อมูลจริง** ทุก test ที่เขียน/ลบข้อมูลรันบน Supabase ในเครื่อง (Supabase CLI) หรือใน CI เท่านั้น `e2e/global-setup.ts` ปฏิเสธ URL ที่ไม่ใช่ `127.0.0.1`/`localhost` [V]
2. **production อ่านอย่างเดียว** ตรวจได้เฉพาะ GET header / redirect ที่ไม่ต้อง login และ POST ที่ถูกปฏิเสธก่อนถึงข้อมูล (`/api/client-errors` ไม่มี session → 401) [V]
3. **ความปลอดภัยต้องพิสูจน์ด้วยการลองทำ** ไม่ใช่ "ไม่มี error" เช่น RLS ทดสอบด้วยการเรียก PostgREST ตรงด้วยบัญชี 3 แบบ แล้วตรวจว่าข้อมูลไม่เปลี่ยนจริง
4. **ไม่ปิด test หรือ lint** test ที่ skip มีเหตุผลเขียนไว้ในโค้ด (เช่น test ระดับ API รันครั้งเดียวบน project desktop)
5. **สถานะผล** ใช้ 4 ค่าเท่านั้น: Passed / Failed / Blocked / Not Run

## 2. สภาพแวดล้อมทดสอบ

| สภาพแวดล้อม | ใช้ทำอะไร | ข้อมูล |
|---|---|---|
| เครื่องนักพัฒนา (Windows 11, Node 24.13.0) | unit, lint, typecheck, build, E2E, SQL tests | Supabase CLI 2.118.0 ในเครื่อง: migration ทั้งหมด + `supabase/seed.sql` (รายการทดสอบป้าย "ทดสอบ …" กว่า 1,000 รายการ) + `supabase/tests/ci_fixtures.sql` |
| GitHub Actions (ubuntu, Node 22) | job `lint`, `typecheck`, `test`, `build`, `audit`, `secrets`, `db`, `pr-title`, `e2e` | Supabase ชั่วคราวใน runner ลบทิ้งหลังจบ |
| Production (`car-care-intelligence-53wd.vercel.app`) | อ่าน header และ redirect เท่านั้น | **ไม่เขียน** |
| Staging / Preview | ไม่ใช้ใน Step 08 (เป็นงาน Step 10) | — |

บัญชีทดสอบ (สร้างโดย `e2e/global-setup.ts` บน Supabase ในเครื่องเท่านั้น):

| บัญชี | สิทธิ์ | ใช้ใน |
|---|---|---|
| anon (public/anon key อย่างเดียว) | ไม่ได้ login | security: ต้องถูกปฏิเสธทุกตาราง/ฟังก์ชัน |
| `e2e-outsider@example.com` | login ได้ แต่ **ไม่ใช่** สมาชิกร้าน (`app_members`) | security: ต้องไม่เห็น/แก้อะไรเลย (ADR-04) |
| `e2e-member@example.com` | สมาชิกร้าน | CUJ, regression, UI |
| `e2e-logout@example.com` | สมาชิกร้าน | CUJ-8 เท่านั้น (ดู D-03) |

เบราว์เซอร์: Chromium ของ Playwright 1.63.0 สองขนาด: `phone` (Pixel 7) และ `desktop` (1440×900) · axe-core 4.13.0

## 3. ชั้นการทดสอบ

| # | ชั้น | เครื่องมือ / ไฟล์ | เกณฑ์ผ่าน |
|---|---|---|---|
| 1 | Static analysis | `tsc --noEmit` (strict), ESLint `--max-warnings=0`, CI `secrets` (git grep หา key) | 0 error, 0 warning |
| 2 | Unit | Vitest 31 ไฟล์ (`**/__tests__/*`) รวม test เวลาไทยที่บังคับ TZ เอง (Bangkok/UTC/New York) | ผ่านทั้งหมด |
| 3 | Integration | Vitest ที่ประกอบหลายส่วน (screen + data layer mock), SQL tests บน Postgres จริง (`supabase/tests/*.test.sql`: 5 ไฟล์เดิม + `customers.test.sql` ตั้งแต่ v2.2.0 ซึ่งตรวจ RLS 3 บัญชี, กฎข้อมูล, ทะเบียนซ้ำ/ย้ายรถ, cascade และ `save_customer` ที่ล้มกลางทางต้องไม่เหลือข้อมูล) | ผ่านทั้งหมด |
| 4 | E2E | Playwright `e2e/cuj.spec.ts` (CUJ-1…8) บน production build (`next start`) + Supabase ในเครื่อง | ผ่านทั้งหมด ทั้ง phone/desktop และนิ่ง (รันซ้ำหลายรอบ) |
| 5 | Regression | `regression-report.md` จับคู่ F-01…F-40 กับ test · test ใหม่ `e2e/regression.spec.ts` สำหรับฟีเจอร์ที่ยังไม่มี test | ทุกฟีเจอร์ที่ยังอยู่มี test ที่ผ่าน หรือบันทึกเหตุผลที่รันไม่ได้ |
| 6 | Authentication / Authorization | unit (`proxy`, layout guard, login, logout, redirect) + `e2e/security.spec.ts` (redirect ทุกหน้า, open redirect) | หน้าที่ต้อง login ส่งไป `/login?next=` ทุกหน้า, `next` ไปเว็บอื่นไม่ได้ |
| 7 | RLS & cross-user isolation | SQL `member_rls.test.sql` + `e2e/security.spec.ts` เรียก PostgREST ตรงด้วย anon / outsider / member | anon ได้ 42501, outsider ได้ `[]` และเขียนไม่ได้ และแถวเป้าหมายไม่เปลี่ยน |
| 8 | Form validation & error handling | unit (schema, editor, edit dialog) + e2e (DB constraint 23514 เมื่อข้ามแอป, keyboard Enter) | กฎเดียวกันทั้งแอปและฐานข้อมูล, ข้อความไทย, ไม่บันทึกโดยไม่ตั้งใจ |
| 9 | Responsive & accessibility | `e2e/ui-quality.spec.ts`: ความกว้าง 360 px ทุกหน้า, axe WCAG 2.1 A/AA ทั้งธีมมืด/สว่าง และ dialog, keyboard-only, skip link | ไม่มีอะไรล้นจอ, ไม่มีปัญหา axe ระดับ serious/critical |
| 10 | Build & production-like runtime | `next build` + `next start` (E2E ใช้ build นี้), ตรวจ bundle หา key ฝั่ง server, header ความปลอดภัย (ในเครื่องและ production) | build ผ่าน, bundle มีแค่ public key, header ครบ |
| — | Dependency | `npm audit` (production และทั้งหมด) + ดูว่าแพ็กเกจที่มีช่องโหว่ถูกใช้จริงหรือไม่ | ไม่มี Critical ใน production deps · High ต้องประเมินว่าถึงได้จริงหรือไม่ |

## 4. Critical User Journeys

| CUJ | ขั้นตอน | Test |
|---|---|---|
| CUJ-1 | login → หน้าภาพรวม | `cuj.spec.ts` |
| CUJ-2 | บันทึกล้างรถจ่ายแล้ว → เห็นบนหน้าภาพรวม | `cuj.spec.ts` |
| CUJ-3 | งานค้างชำระของเต็นท์ → ค้างชำระ → บิล PDF → เคลียร์ยอด | `cuj.spec.ts` |
| CUJ-4 | บันทึกรายจ่ายด้วยปุ่มลัด | `cuj.spec.ts` |
| CUJ-5 | บันทึกหลายคันต่อกัน | `cuj.spec.ts` |
| CUJ-6 | ค้นหาในประวัติ → แก้ราคา → ลบ | `cuj.spec.ts` |
| CUJ-7 | ส่งออก Excel ของเดือน | `cuj.spec.ts` |
| CUJ-8 | ออกจากระบบแบบมีการยืนยัน | `cuj.spec.ts` |
| CUJ-9 (v2.2.0) | ค้นไม่เจอ → เพิ่มลูกค้า (เติมชื่อจากคำค้น) 2 เบอร์ 2 คัน → หน้าลูกค้า (`tel:` ถูก) → กลับรายชื่อ (คำค้นยังอยู่) → ค้นชื่อ/เบอร์บางส่วน/ทะเบียนบางส่วน → แก้ (ชื่อ, ลบรถ 1 คัน) → ลบ (ยืนยันบอกจำนวน + "ประวัติการล้างรถไม่ถูกลบ") · axe รายชื่อ/ฟอร์ม/หน้าลูกค้า · ไม่มี console error · **ไม่มี request ไป server ที่มีคำค้น** | `customers.spec.ts` |
| CUJ-11 (v2.2.0) | ลูกค้ามีเบอร์ + ทะเบียน → หน้าบันทึกพิมพ์ทะเบียน (แบบมีขีด) → "ลูกค้า: …" ไม่เติมเอง → "ใช้ชื่อนี้" → บันทึกค้างชำระ → การ์ดค้างชำระมี "โทร 080-…" (`tel:` ถูก) · axe หน้าค้างชำระ | `customers.spec.ts` |
| CUJ-12 (v2.2.0) | บันทึกแล้วทำต่อด้วยชื่อ + ทะเบียนใหม่ → toast "บันทึกเป็นลูกค้า" → ฟอร์มเติมชื่อ/ทะเบียน → ใส่เบอร์ → บันทึก (อยู่หน้าเดิม) | `customers.spec.ts` |
| CUJ-13 (v2.2.0) | รายการ 2 รายการ (ทะเบียนเต็มแบบมีขีด, เลขล้วนค้างชำระ) → เพิ่มลูกค้าที่มีทะเบียนนั้น → การ์ดประวัติ "2 ครั้ง" "฿300" "฿200 (1 รายการ)" "ตรงแค่ตัวเลข" → แตะรายการ → dialog แก้ไขรายรับ · axe | `customers.spec.ts` + SQL `customers.test.sql` §9b |
| CUJ-10 (v2.2.0) | ทะเบียนเต็มของลูกค้า B (พิมพ์ต่างรูปแบบ + จังหวัด) → "ทะเบียนนี้อยู่กับ B" → ย้ายรถ → B ไม่มีรถแล้ว | `customers.spec.ts` |

สมุดรายชื่อลูกค้ายังเพิ่มใน spec เดิม: `ui-quality.spec.ts` (320 px ของ `/customers` และฟอร์มเพิ่ม, axe ธีมสว่าง), `security.spec.ts` (RLS 3 ตาราง + `save_customer`, redirect, CSP ของหน้าลูกค้าและฟอร์ม) · unit/component: `features/customers/__tests__/` (logic, schema, components: ฟอร์ม Enter/ออฟไลน์/draft/ทะเบียนซ้ำ+ย้าย/ชนกัน, รายชื่อค้นหา+URL, หน้าลูกค้า+ลบ, ปุ่มโทร/คัดลอก), `lib/__tests__/observability.test.ts` (ตัดเบอร์ทุกรูปแบบออกจากรายงาน error)

## 5. ไม่อยู่ในขอบเขต Step 08

- Performance / Core Web Vitals / UX audit → Step 09
- ทดสอบบน Preview + staging และ release candidate → Step 10
- Safari / Firefox / เครื่องจริง (iPhone, Android) → บันทึกเป็น Not Run ใน `test-results.md`
- Penetration test โดยบุคคลภายนอก, load test

## 6. วิธีรันซ้ำ

```bash
# Supabase ในเครื่อง (ต้องเปิด Docker)
supabase start -x realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
# ค่าจาก `supabase status -o env`: API_URL, ANON_KEY, SERVICE_ROLE_KEY
export E2E_SUPABASE_URL=... E2E_ANON_KEY=... E2E_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=$E2E_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY=$E2E_ANON_KEY npm run build
npm run test:e2e
# SQL tests
for f in supabase/tests/*.test.sql; do psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```
