# Audit Report — Step 01: Reverse Engineering & Technical Audit

> วันที่: 2026-10-14 · Commit ที่ตรวจ: `7f58eec` (= `v1.0.0`, Production candidate)
> Branch: `docs/redesign-step-01-audit` (แตกจาก `docs/redesign-step-00-baseline` โค้ดตรงกับ `main` และเพิ่มแค่ `docs/`)
> ป้ายกำกับ: **[V]** Verified · **[I]** Inferred · **[U]** Unknown

## 1. Executive Summary

Car Care Intelligence เป็นแอปบันทึกรายรับ-รายจ่ายของร้านคาร์แคร์ร้านเดียว สร้างด้วย Next.js 16 App Router ที่ทุกหน้าเป็น client component และอ่านเขียน Supabase ตรงจาก browser [V] โค้ดสะอาดในระดับเครื่องมือ (lint, type และ build ผ่าน, ไม่มี `any`) [V] แต่มีจุดอ่อนเชิงโครงสร้าง 3 เรื่องที่ redesign ต้องแก้:

1. **ความปลอดภัยของข้อมูลขึ้นกับ RLS ทั้งหมด แต่ยังไม่รู้สถานะ RLS** [U] (ER-12, ER-13)
2. **มีบั๊กที่ทำให้ข้อมูลเพี้ยนได้จริง** [V] โดยเฉพาะการแก้ไขที่เลื่อนวันที่ (ER-01) และ [I] ยอดรายปีอาจถูกตัดที่ 1,000 แถว (ER-02)
3. **Business logic อยู่ใน browser และกระจายตัว** [V] เช่น `seq_number`, audit fields และ validation ที่มีแค่ฝั่ง Add (TD-01, TD-02, TD-09)

ด้าน UX ระบบมี feature ครบตาม use case หลัก (42 features, 8 CUJs) แต่ขัดกับเป้าหมาย "ใช้ง่ายสำหรับผู้สูงวัย" ที่ README ระบุ: ตัวอักษรเล็ก 42 จุด, ปิดการซูม และ interaction บางจุดใช้คีย์บอร์ดไม่ได้ [V]

## 2. Deliverables

| ไฟล์ | เนื้อหา |
|---|---|
| [`project-structure.md`](project-structure.md) | Tree, หน้าที่ของแต่ละโมดูล, dependency graph, toolchain และเวอร์ชันจริง |
| [`feature-inventory.md`](feature-inventory.md) | 42 features (F-01..F-42) พร้อม file:line, data ops และ 8 Critical User Journeys |
| [`current-architecture.md`](current-architecture.md) | Runtime architecture, auth/authz, validation, error handling, data access limits, deployment |
| [`technical-debt.md`](technical-debt.md) | 35 รายการ (TD-01..TD-35) พร้อม priority/effort และ code hygiene metrics |
| [`existing-risks.md`](existing-risks.md) | 34 รายการ (ER-01..ER-34) แบ่งเป็น data, security, UX/a11y และ ops |
| [`step-01-issues.md`](step-01-issues.md) | Issue Log ของการทำ Step 01 (S01-01..S01-12) พร้อมสถานะและ Prompt สำหรับแก้ |

## 3. ผลตามขอบเขตที่สั่ง

| # | หัวข้อ | สรุป | อ้างอิง |
|---|---|---|---|
| 1 | Folder structure / module responsibilities | แบ่งตาม feature (`dashboard/`, `add/`, `history/`) ชัดเจน แต่ data access กระจาย 6 ไฟล์ [V] | project-structure §1–2 |
| 2 | package.json / lockfile / versions | Next 16.2.1, React 19.2.4, TS 5.9.3, lockfile ตรงกับ `node_modules` และไม่มี `engines` [V] มี 29 advisories โดยตัวสำคัญคือ `next` (แก้ได้แบบ non-major) [V] | project-structure §3, ER-09 |
| 3 | Routes / layouts / components / hooks / API / Server Actions | 4 pages + 2 API routes (ทั้งคู่ไม่มีคนเรียก) และ **ไม่มี Server Actions** [V] | current-architecture §2, F-41/42 |
| 4 | Auth / authz / validation / error handling | Supabase email/password และไม่มี role, validation มีแค่ Add, export ไม่ตรวจ error [V] | current-architecture §3–5 |
| 5 | Supabase schema / RLS / queries / storage / migrations | 2 tables (`records`, `expenses`), Realtime, ไม่มี Storage และไม่มี migrations [V] ส่วน **schema จริงกับ RLS ยังไม่รู้** [U] และ query ไม่มี pagination [V] | current-architecture §7, ER-02, ER-12 |
| 6 | ฟีเจอร์และ user journey | 42 features, 8 CUJs [V] | feature-inventory |
| 7 | Responsive / UX problems | Mobile-first `max-w-2xl` [V] และปัญหา UX/a11y 12 รายการ (ER-18..ER-29) | existing-risks §3 |
| 8 | Duplication / debt / dead code / coupling | 35 รายการ และมี dead code ที่ยืนยันแล้ว 4 กลุ่ม (API 2, SVG 5, column 2, docs 2) [V] | technical-debt |
| 9 | Tests / lint / type / build baseline | ดู §4 | — |
| 10 | Vercel config / deployment risks | ไม่มี `vercel.json`, CI, `engines` หรือ monitoring [V] และค่าใน Vercel ทั้งหมด [U] | current-architecture §9, ER-30 |

## 4. Verification Baseline (รันจริง 2026-10-14)

สภาพแวดล้อม: Windows 11, Node v24.13.0, npm 11.6.2 · คำสั่งทั้งหมดไม่แตะ DB และไม่แก้ lockfile (ตรวจ hash ก่อนและหลัง: ไม่เปลี่ยน)

| Check | คำสั่ง | ผล |
|---|---|---|
| Lint | `npm run lint` | ✅ exit 0 |
| Type-check | `npm run type-check` | ✅ exit 0 |
| Unit tests | `npm run test` | ✅ 6 files, 146 passed (stderr มาจาก test กรณี env ไม่ถูกต้องที่ตั้งใจให้ throw) |
| Production build | `npm run build` | ✅ exit 0, routes: 5 static + 2 dynamic + middleware |
| Dependency audit | `npm audit` (read-only) | ⚠️ 29 vulns: 3 critical, 16 high, 9 moderate, 1 low |
| Outdated | `npm outdated` | `next` 16.2.1 → 16.4.0 (wanted) และ major ใหม่ของ vitest/typescript/eslint (ยังไม่แนะนำ) |
| ER-01 reproduction | node script ที่ใช้ logic เดียวกับ `lib/dateUtils.ts` ภายใต้ `TZ=Asia/Bangkok` | ⚠️ ยืนยันว่าเลื่อน −24h ช่วง 00:00–06:59 |
| ER-08 reproduction | `isomorphic-dompurify` ที่ติดตั้งในโปรเจกต์ | ⚠️ `<` → `&lt;` |

**สิ่งที่ test suite ปัจจุบันครอบคลุม:** date utilities, การคำนวณ dashboard (สำเนา logic), weather cache และ env validation [V]

**ไม่ครอบคลุม:** การ insert/update/delete, EditModal, การเคลียร์ยอด, export, สร้างบิล, middleware, API routes, ทุก component และ E2E [V]

## 5. Top Findings (เรียงตามผลต่อผู้ใช้จริง)

| # | Finding | Severity | หลักฐาน |
|---|---|---|---|
| 1 | สถานะ RLS และ public sign-up ไม่ทราบ ถ้าเปิดอยู่ ข้อมูลร้านทั้งหมดอาจถูกอ่าน แก้ หรือลบได้จากภายนอก | Critical (รอยืนยัน) | ER-12, ER-13 [U] |
| 2 | แก้ไขรายการช่วง 00:00–06:59 แล้ววันที่ถอยหลัง 1 วัน | High | ER-01 [V reproduced] |
| 3 | ยอดรายปีและ Excel อาจถูกตัดที่ 1,000 แถวโดยไม่มี error | High (รอยืนยัน) | ER-02 [I] |
| 4 | Next.js 16.2.1 มี advisory ที่แก้ได้ด้วย patch 16.4.0 | High | ER-09 [V] |
| 5 | ไม่มี CI และ monitoring | High | ER-30 [V] |
| 6 | Edit ไม่มี validation (ราคาว่างแล้วกลายเป็น 0) | Medium | ER-05 [V] |
| 7 | เคลียร์ยอด "ลูกค้าทั่วไป" ไม่ครอบคลุม `NULL` | Medium | ER-03 [V โค้ด] |
| 8 | `seq_number` และเลขบิลไม่ unique | Medium | ER-04, ER-34 [V] |
| 9 | UX สำหรับผู้สูงวัย: ตัวเล็ก, ปิดซูม, kiosk reload ทำให้ฟอร์มหาย | Medium | ER-18..ER-20 [V] |

## 6. Unknowns ที่ต้องปิดก่อน Step 05 (Architecture & DB)

ส่วนใหญ่ตรงกับ `approval-checklist.md` ส่วน A ยกเว้นข้อใหม่จาก Step 01 ที่มีเครื่องหมาย ★

| # | Unknown | วิธียืนยัน |
|---|---|---|
| U-1 | Schema จริง (types, defaults, constraints, indexes) | SQL ข้อ 3–4 |
| U-2 | RLS + policies + grants | SQL ข้อ 1, 2, 10 |
| U-3 | Public sign-up | Supabase → Auth → Providers |
| U-4 ★ | ค่า Max rows ของ API | Supabase → Settings → API |
| U-5 ★ | จำนวน records ต่อปี | `select date_part('year', created_at) y, count(*) from records group by 1 order by 1;` |
| U-6 ★ | มี `customer_name IS NULL` ในรายการค้างชำระหรือไม่ | SQL ใน ER-03 |
| U-7 ★ | มีรายการที่เวลาท้องถิ่น 00:00–06:59 หรือไม่ (ขอบเขตผลกระทบของ ER-01) | `select count(*) from records where extract(hour from created_at at time zone 'Asia/Bangkok') < 7;` |
| U-8 ★ | `seq_number` ซ้ำในวันเดียวกันมีกี่กรณี | `select (created_at at time zone 'Asia/Bangkok')::date d, seq_number, count(*) from records group by 1,2 having count(*) > 1;` |
| U-9 | Triggers / functions / realtime publication | SQL ข้อ 5–7 |
| U-10 | Production commit, Vercel env scopes, Node version, region | approval-checklist A1–A7 |

ทุกคำสั่งข้างบนเป็น `SELECT` แบบอ่านอย่างเดียว

## 7. Production Impact ของ Step 01

**ไม่มี** [V]
- ไม่มีการแก้โค้ด, business logic หรือ lockfile (hash ไม่เปลี่ยน)
- ไม่มีการเชื่อมต่อ Supabase หรือ Vercel
- ไม่มี push หรือ tag มีแค่ commit เอกสารบน branch local (ดู `step-01-issues.md` S01-09)
- ไฟล์ที่เพิ่มอยู่ใน `docs/redesign/` เท่านั้น
- Script ที่ใช้ทดสอบ ER-01 และ ER-08 อยู่ใน scratchpad นอก repo

## 8. Acceptance Criteria

| เกณฑ์ | สถานะ |
|---|---|
| มี Feature Inventory ที่ตรวจสอบย้อนกลับได้ | ✅ 42 features ทุกตัวมี file:line |
| มี Baseline ของการตรวจสอบที่ทำได้จริง | ✅ §4 (lint, type, test, build, audit + 2 reproductions) |
| ไม่มีการเปลี่ยนแปลง Production | ✅ §7 |
| ไม่มีการลบหรือแก้ไขโค้ดโดยไม่ได้รับอนุมัติ | ✅ diff เทียบ `main` มีเฉพาะไฟล์ใน `docs/redesign/` |
