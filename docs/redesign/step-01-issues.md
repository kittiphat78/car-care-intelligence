# Step 01 — Issue Log

> Step: 01 — Reverse Engineering & Technical Audit · วันที่: 2026-10-14
> Branch: `docs/redesign-step-01-audit` (แตกจาก `docs/redesign-step-00-baseline` ← `main@7f58eec`)
> สถานะที่ใช้: `RESOLVED` · `UNRESOLVED` · `BLOCKED` · `NEEDS_APPROVAL`
>
> Log นี้บันทึก **ปัญหาที่เกิดหรือค้นพบระหว่างทำ Step 01** และสิ่งที่ยังปิดไม่ได้ ส่วน defect ของระบบเดิมทั้งหมดอยู่ใน `existing-risks.md` (ER-xx) และหนี้ทางเทคนิคอยู่ใน `technical-debt.md` (TD-xx) log นี้อ้างถึงด้วย ID เพื่อไม่ให้ซ้ำ

## สรุป

| ID | เรื่อง | Severity | สถานะ |
|---|---|---|---|
| S01-01 | ไม่มีสิทธิ์เข้าถึง Supabase จึงตรวจ schema/RLS/ข้อมูลจริงไม่ได้ | Critical | BLOCKED |
| S01-02 | ไม่มีสิทธิ์เข้าถึง Vercel จึงยืนยัน production commit/env/Node/region ไม่ได้ | High | BLOCKED |
| S01-03 | บั๊กวันที่เลื่อน −24h เมื่อแก้ไขรายการ (ER-01) | High | NEEDS_APPROVAL |
| S01-04 | Next.js 16.2.1 มี security advisories (ER-09) | High | NEEDS_APPROVAL |
| S01-05 | Defect ระดับ Medium/Low ของระบบเดิมรอจัดลำดับ | Medium | NEEDS_APPROVAL |
| S01-06 | Build warning: `middleware` convention deprecated | Low | NEEDS_APPROVAL |
| S01-07 | Build warning: Next.js เลือก workspace root ผิด (lockfile นอก repo) | Low | UNRESOLVED |
| S01-08 | Local branches ที่ยังไม่ push 3 ตัว | Medium | NEEDS_APPROVAL |
| S01-09 | Push branch เอกสารอาจทำให้เกิด Vercel Preview ที่ชี้ Production DB | Medium | NEEDS_APPROVAL |
| S01-10 | Heredoc ของ Bash เขียนไฟล์ลง scratchpad ไม่ได้ | Low | RESOLVED |
| S01-11 | `node -e` แบบ inline ใน PowerShell parse ไม่ผ่าน | Low | RESOLVED |
| S01-12 | แพ็กเกจ extraneous 5 ตัวใน `node_modules` บนเครื่อง local | Low | UNRESOLVED |

---

## S01-01 — ไม่มีสิทธิ์เข้าถึง Supabase · Critical · `BLOCKED`

- **ประเภท:** Access / Environment
- **ขั้นตอนที่เกิด:** Task 5 ของ Step 01 (Supabase schema, RLS, queries, storage, migrations)
- **หลักฐาน:** `Get-Command supabase` → not found, repo ไม่มีโฟลเดอร์ `supabase/` หรือไฟล์ `.sql` (`git ls-files`) และ `.env.local` มีแค่ URL กับ anon key (ไม่มี DB password หรือ service key ซึ่งถูกต้องแล้ว)
- **สาเหตุ (ยืนยันแล้ว):** schema และ policy อยู่ใน Supabase dashboard เท่านั้น ไม่มีใน repo
- **สิ่งที่ทำแล้ว:** อนุมาน schema จาก `types/index.ts` และ query ในโค้ด, ตรวจว่า key ที่ใช้มี `role=anon`, และเตรียม SQL แบบอ่านอย่างเดียว (`production-baseline.md` §8 + `audit-report.md` §6 U-1..U-9)
- **สิ่งที่ตั้งใจไม่ทำ:** ไม่ได้เรียก REST API ด้วย anon key เพื่อทดสอบ RLS เพราะเป็นการยิง request ไปยัง Production DB โดยไม่ได้รับอนุมัติ
- **ผล:** ตรวจได้จากโค้ดเท่านั้น และสถานะ ER-02, ER-03 (ขอบเขต), ER-12, ER-13 ยังเป็น Unknown/Inferred
- **ระบบที่กระทบ:** Supabase production project (อ่านอย่างเดียว)
- **ความเสี่ยงถ้าปล่อยไว้:** ถ้า RLS ปิดหรือเปิด public sign-up ไว้ ข้อมูลร้านอาจถูกอ่าน แก้ หรือลบจากภายนอกได้ตอนนี้ และ Step 05 จะออกแบบ DB บนข้อสันนิษฐาน
- **สิ่งที่ต้องการจากผู้ใช้:** รัน SQL ใน Supabase SQL Editor แล้วส่งผลกลับ (ไม่ต้องส่งอีเมลหรือ key) พร้อมค่า **Settings → API → Max rows** และสถานะ **Auth → Allow new users to sign up**
- **Prompt สำหรับแก้ภายหลัง:**
  > "นี่คือผล SQL จาก Supabase production (แนบผล U-1..U-9 และค่า Max rows / sign-up) ให้ปรับ `existing-risks.md` (ER-02, ER-03, ER-12, ER-13) และ `current-architecture.md` §3, §7 จาก Unknown/Inferred เป็น Verified ตามผลจริง อัปเดต severity และปิด S01-01 ใน `step-01-issues.md` ห้ามแก้โค้ดหรือ DB"

## S01-02 — ไม่มีสิทธิ์เข้าถึง Vercel · High · `BLOCKED` (บางส่วนได้ข้อมูลแล้ว)

> **อัปเดต 2026-10-14 (จาก screenshot ของเจ้าของ):** Production = `7f58eec` = `v1.0.0` [V], production branch = `main` [V], Git integration + Preview ต่อ branch เปิดอยู่ [V], plan = **Hobby** [V] · ยังไม่ทราบ: env scope ของ Preview (A4), Node version, region
> **ข้อสังเกตเรื่อง Hobby [I]:** (1) เงื่อนไขการใช้งานของ Vercel กำหนดให้ Hobby ใช้เพื่อ non-commercial/personal ซึ่งระบบร้านค้าที่มีรายได้อาจไม่เข้าเงื่อนไข จึงควรให้เจ้าของตรวจเงื่อนไขล่าสุดเอง (2) runtime logs บน Hobby เก็บสั้น ทำให้ ADR-11 (error log ผ่าน Vercel logs) อาจดูย้อนหลังได้ไม่นาน → ทบทวนใน Step 07 A9

- **ประเภท:** Access / Deployment
- **ขั้นตอนที่เกิด:** Task 10 (Vercel configuration และ deployment risks)
- **หลักฐาน:** `Get-Command vercel` และ `gh` → not found, ไม่มี `.vercel/` หรือ `vercel.json`
- **สาเหตุ (ยืนยันแล้ว):** การตั้งค่าอยู่ใน Vercel dashboard
- **สิ่งที่ทำแล้ว:** ตรวจสิ่งที่อยู่ใน repo (`next.config.ts`, `.npmrc`, `package.json`, build output) และระบุรายการที่ต้องยืนยันใน `approval-checklist.md` A1–A7
- **ผล:** production commit, env scopes, Node version, region และ deployment protection ยังเป็น Unknown
- **ความเสี่ยงถ้าปล่อยไว้:** baseline อาจไม่ตรงกับสิ่งที่รันจริง และ Preview อาจเขียนลง Production DB (Step 00 R01)
- **สิ่งที่ต้องการจากผู้ใช้:** ข้อ A1–A7 ใน `approval-checklist.md` หรือให้สิทธิ์ Vercel CLI แบบ read-only
- **Prompt สำหรับแก้ภายหลัง:**
  > "Production deployment ของ Vercel สร้างจาก commit `<SHA>`, Preview env ใช้ Supabase project ref `<same/different>`, Node `<ver>`, region `<region>` ให้อัปเดต `production-baseline.md`, `environment-matrix.md`, `current-architecture.md` §9 และปิด S01-02 ถ้า SHA = 7f58eec ให้เสนอการยืนยัน baseline `v1.0.0` (ห้ามสร้าง tag จนกว่าจะอนุมัติ)"

## S01-03 — บั๊กวันที่เลื่อน −24h เมื่อแก้ไขรายการ (ER-01) · High · `NEEDS_APPROVAL`

- **ประเภท:** Bug / Data integrity
- **ขั้นตอนที่เกิด:** Task 4/6 ระหว่างตรวจ `EditModal` → `lib/dateUtils.ts`
- **หลักฐาน:** script จำลอง (logic เดียวกับ `splitDateTime`/`mergeDateTime`) ภายใต้ `TZ=Asia/Bangkok`: `03:30+07:00 → shift −24h`, `06:59 → −24h`, `07:00 → 0`, `14:30 → 0`
- **สาเหตุ (ยืนยันแล้ว):** `splitDateTime` ใช้วันที่จาก UTC แต่ชั่วโมงจาก local (`lib/dateUtils.ts:71-72`)
- **สิ่งที่ทำแล้ว:** reproduce และบันทึกใน `existing-risks.md` ER-01 **ยังไม่แก้** เพราะ Step 01 ห้ามแก้ business logic
- **ระบบที่กระทบ:** `lib/dateUtils.ts`, `components/EditModal.tsx` และ column `created_at` ของ `records`/`expenses` ที่ถูกแก้ไข
- **ความเสี่ยงถ้าปล่อยไว้:** ทุกครั้งที่แก้ไขรายการช่วงเช้ามืด รายการจะย้ายไปวันก่อนหน้า ทำให้ยอดรายวัน, seq และ Excel ผิด [U] ยังไม่รู้ว่าเคยเกิดกับข้อมูลจริงกี่รายการ (SQL U-7)
- **สิ่งที่ต้องการจากผู้ใช้:** อนุมัติให้แก้แบบ hotfix (branch แยก + regression test) หรือรวมเข้า Step 07
- **Prompt สำหรับแก้ภายหลัง:**
  > "แก้ S01-03/ER-01: บน branch `fix/edit-date-timezone` จาก `main` เขียน test ที่ fail ก่อน (round-trip เวลา 00:00, 03:30, 06:59, 07:00, 23:59 ภายใต้ TZ Asia/Bangkok) แล้วแก้ `splitDateTime` ให้ใช้วันที่ local ห้ามแตะ `mergeDateTime` ถ้าไม่จำเป็น รัน lint/type-check/test/build และห้าม merge หรือ deploy จนกว่าจะอนุมัติ"

## S01-04 — Next.js 16.2.1 มี security advisories (ER-09) · High · `NEEDS_APPROVAL`

- **ประเภท:** Security / Dependency
- **หลักฐาน:** `npm audit --json` (2026-10-14): `next` severity critical, range `9.3.4-canary.0 – 16.3.7`, `fixAvailable: next@16.4.0 (isSemVerMajor: false)` และทั้งโปรเจกต์มี 29 vulns (3 critical / 16 high / 9 moderate / 1 low)
- **สาเหตุ:** dependency pinned ที่ `16.2.1`
- **สิ่งที่ทำแล้ว:** ประเมิน applicability รายกลุ่ม (`existing-risks.md` ER-09) และ **ไม่ได้รัน `npm audit fix`** เพราะแก้ lockfile และเปลี่ยน runtime ของ production
- **ระบบที่กระทบ:** `package.json`, `package-lock.json`, runtime บน Vercel
- **ความเสี่ยงถ้าปล่อยไว้:** กลุ่ม middleware-bypass เข้าเงื่อนไขบางส่วน (ผลจำกัดเพราะข้อมูลผ่าน RLS) ส่วนกลุ่มอื่นส่วนใหญ่ไม่เข้าเงื่อนไข [I]
- **สิ่งที่ต้องการจากผู้ใช้:** อนุมัติ upgrade `next` + `eslint-config-next` เป็น 16.4.0 ใน PR แยก
- **Prompt สำหรับแก้ภายหลัง:**
  > "แก้ S01-04: บน branch `chore/next-16.4-security` จาก `main` upgrade `next` และ `eslint-config-next` เป็น 16.4.0 ด้วย `npm install --save-exact` แล้วตรวจ diff ของ lockfile ว่าเปลี่ยนเฉพาะที่เกี่ยวข้อง รัน lint/type-check/test/build และ `npm audit` เทียบก่อน/หลัง ห้าม upgrade major อื่น และห้าม merge หรือ deploy"

## S01-05 — Defect ระดับ Medium/Low ของระบบเดิมรอจัดลำดับ · Medium · `NEEDS_APPROVAL`

- **ประเภท:** Backlog (หลายรายการ ต้นเหตุต่างกัน แต่สถานะการจัดการเหมือนกัน)
- **รายการ:** ER-03, ER-04, ER-05, ER-06, ER-07, ER-08, ER-10, ER-11, ER-14–ER-29, ER-31, ER-32, ER-34 (ดู `existing-risks.md`) และ TD-01..TD-35 (ดู `technical-debt.md`)
- **หลักฐาน:** file:line อยู่ในแต่ละรายการ
- **สิ่งที่ทำแล้ว:** บันทึกพร้อม severity และ priority แต่ไม่แก้ เพราะอยู่นอกขอบเขต Step 01
- **ความเสี่ยงถ้าปล่อยไว้:** ระบบยังทำงานแบบเดิม (ไม่มี regression ใหม่)
- **สิ่งที่ต้องการจากผู้ใช้:** ใช้ Step 02 จัดลำดับและตัดสินใจทาง product (เช่น นิยามกำไรสุทธิ ER-29, เก็บหรือเลิก AI insights TD-16, การใช้ `payment_method` TD-19)
- **Prompt สำหรับแก้ภายหลัง:** ใช้ Prompt ของ Step 02 ตามปกติ

## S01-06 — Build warning: `middleware` convention deprecated · Low · `NEEDS_APPROVAL`

- **ประเภท:** Build / Framework
- **หลักฐาน:** `npm run build` → `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`
- **สาเหตุ (ยืนยันแล้ว):** Next 16 เปลี่ยนชื่อ convention
- **สิ่งที่ทำแล้ว:** บันทึกเป็น TD-27 และไม่ได้แก้ (เป็น code change ที่กระทบ auth guard)
- **ความเสี่ยงถ้าปล่อยไว้:** ต่ำ ยังทำงานได้ แต่จะถูกเอาออกใน major ถัดไป
- **Prompt สำหรับแก้ภายหลัง:**
  > "แก้ S01-06 ใน Step 07: rename `middleware.ts` → `proxy.ts` ตาม Next 16 พร้อมเพิ่ม test ของ redirect logic (`/`, `/add`, `/history` → `/login` เมื่อไม่มี session และ `/login` → `/` เมื่อมี session) ก่อนเปลี่ยน"

## S01-07 — Build warning: workspace root ผิด · Low · `UNRESOLVED`

- **ประเภท:** Local environment
- **หลักฐาน:** `We detected multiple lockfiles and selected the directory of C:\Users\User\package-lock.json as the root directory.`
- **สาเหตุ (ยืนยันแล้ว):** มีไฟล์ `C:\Users\User\package-lock.json` อยู่นอก repo
- **สิ่งที่ทำแล้ว:** ไม่ได้ลบหรือแก้ เพราะเป็นไฟล์ของผู้ใช้นอก repository และไม่รู้ว่าโปรเจกต์อื่นใช้อยู่หรือไม่
- **ผล:** build ยังผ่าน และ Vercel ไม่ได้รับผลกระทบ (clone เฉพาะ repo)
- **ความเสี่ยงถ้าปล่อยไว้:** ต่ำ แค่ build/dev บนเครื่องนี้อาจ resolve root ผิดในบางกรณี
- **สิ่งที่ต้องการจากผู้ใช้:** ตรวจว่าไฟล์นั้นจำเป็นหรือไม่ ถ้าไม่จำเป็นให้ลบเอง หรืออนุมัติให้ตั้ง `turbopack.root` ใน `next.config.ts` (เป็น code change)
- **Prompt สำหรับแก้ภายหลัง:**
  > "แก้ S01-07: ตั้ง `turbopack: { root: __dirname }` (หรือ path.resolve ที่เหมาะสม) ใน `next.config.ts` บน branch แยก แล้วยืนยันว่า build ไม่มี warning และ output เหมือนเดิม"

## S01-08 — Local branches ที่ยังไม่ push · Medium · `NEEDS_APPROVAL`

- **ประเภท:** Git / Work preservation
- **หลักฐาน:** `git branch -vv`: `feature/redesign-cash-bill-pdf` (3 commits), `fix/input-sanitization-and-api-auth` (1), `fix/prevent-duplicate-submit` (1) ไม่มี upstream
- **สิ่งที่ทำแล้ว:** diff stat เทียบ main (`production-baseline.md` §2.3) และไม่ได้ push, ลบ หรือ merge
- **ความเสี่ยงถ้าปล่อยไว้:** งานหายถ้าเครื่องเสีย
- **สิ่งที่ต้องการจากผู้ใช้:** ตัดสินใจ B6 (push เป็น `archive/*`, merge หรือทิ้ง)
- **Prompt สำหรับแก้ภายหลัง:**
  > "แก้ S01-08: push 3 local branches เป็น `archive/<ชื่อเดิม>` บน origin (ไม่ merge) แล้วเทียบเนื้อหา `fix/*` ทั้งสองกับ `main` ปัจจุบันว่าถูกแทนที่แล้วหรือไม่ และรายงานผล"
  > ⚠️ การ push branch อาจทำให้เกิด Vercel Preview (ดู S01-09)

## S01-09 — Push branch เอกสารอาจสร้าง Preview ที่ชี้ Production DB · Medium · `RESOLVED` (อนุมัติแล้ว)

> **อัปเดต 2026-10-14:** เจ้าของอนุมัติ push (ข้อ 24) และยืนยันแล้วว่า push จะสร้าง Preview (A3) ซึ่งโค้ดของ branch เอกสารเหมือน `v1.0.0` ทุกไฟล์นอก `docs/` จึงไม่เพิ่มพฤติกรรมใหม่ แต่ Preview URL ใหม่จะใช้ env ของ scope Preview (A4 ยังไม่ทราบ)

- **ประเภท:** Release safety
- **หลักฐาน:** ไม่ทราบสถานะ Git integration และ Preview env scope (S01-02, Step 00 R01)
- **สิ่งที่ทำแล้ว:** commit เอกสารไว้ **local เท่านั้น** และไม่ได้ push
- **ความเสี่ยง:** การ push branch ที่มีแค่ docs ไม่เปลี่ยนโค้ด แต่ Vercel จะ build Preview ใหม่ ถ้า Preview ใช้ Production Supabase ใครที่ login ใน Preview ก็เขียนข้อมูลจริงได้ (เหมือน Production ทุกประการ จึงไม่เพิ่มความเสี่ยงจากตัวโค้ด แต่เพิ่ม URL ที่เข้าถึงได้)
- **สิ่งที่ต้องการจากผู้ใช้:** อนุมัติ push (B7) หรือยืนยันว่าเปิด Deployment Protection ของ Preview แล้ว
- **Prompt สำหรับแก้ภายหลัง:**
  > "อนุมัติ B7: push `docs/redesign-step-00-baseline` และ `docs/redesign-step-01-audit` ขึ้น origin แล้วเปิด PR (draft) เข้า main โดยห้าม merge"

## S01-10 — Heredoc ของ Bash เขียนไฟล์ลง scratchpad ไม่ได้ · Low · `RESOLVED`

- **ประเภท:** Tooling
- **ขั้นตอนที่เกิด:** สร้าง script จำลอง ER-01
- **หลักฐาน:** `bash: .../scratchpad/tzcheck.mjs: No such file or directory`
- **สาเหตุ (ยืนยันแล้ว):** โฟลเดอร์ scratchpad ยังไม่ถูกสร้างตอนที่ redirect ของ Bash ทำงาน
- **การแก้:** สร้างไฟล์ด้วย Write tool (สร้างโฟลเดอร์ให้อัตโนมัติ) แล้วรันด้วย `TZ=Asia/Bangkok node <file>`
- **ผลทดสอบ:** script รันสำเร็จ (ดู S01-03)
- **ไฟล์ที่กระทบ:** scratchpad นอก repo เท่านั้น

## S01-11 — `node -e` แบบ inline ใน PowerShell parse ไม่ผ่าน · Low · `RESOLVED`

- **ประเภท:** Tooling
- **หลักฐาน:** `SyntaxError: Invalid or unexpected token` (PowerShell 5.1 ตัด double quote ภายใน argument)
- **การแก้:** เขียน script เป็นไฟล์ `purify.cjs` ใน scratchpad แล้วส่ง path ของ repo เป็น argument
- **ผลทดสอบ:** ได้ผล ER-08 (`"ราคา <500"` → `"ราคา &lt;500"`)
- **ไฟล์ที่กระทบ:** scratchpad นอก repo เท่านั้น

## S01-12 — แพ็กเกจ extraneous ใน `node_modules` บนเครื่อง local · Low · `UNRESOLVED`

- **ประเภท:** Local environment
- **หลักฐาน:** `npm ls --depth=0` → `@emnapi/core`, `@emnapi/runtime`, `@emnapi/wasi-threads`, `@napi-rs/wasm-runtime`, `@tybys/wasm-util` = extraneous
- **สาเหตุ (สมมติฐาน):** ติดตั้งค้างจาก dependency tree เวอร์ชันก่อน
- **สิ่งที่ทำแล้ว:** ไม่ได้ `npm prune` เพราะไม่จำเป็นต่อ Step 01 และเป็นการเปลี่ยน environment ของผู้ใช้
- **ความเสี่ยง:** ต่ำมาก เพราะ Vercel ติดตั้งจาก lockfile ใหม่ทุกครั้ง และ build หรือ test บนเครื่องนี้อาจต่างจาก CI เล็กน้อยในทางทฤษฎี
- **Prompt สำหรับแก้ภายหลัง:**
  > "รัน `npm ci` บนเครื่อง local (ไม่แก้ lockfile) แล้วยืนยันว่า `npm ls` ไม่มี extraneous และ lint/type-check/test/build ยังผ่าน"
