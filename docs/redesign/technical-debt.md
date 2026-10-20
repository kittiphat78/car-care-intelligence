# Technical Debt — Step 01

> **ประวัติ (ตรวจที่ v1 `7f58eec`)** · หนี้ส่วนใหญ่ในไฟล์นี้แก้แล้วใน redesign · รายการที่ยังเหลือ ณ `v2.1.0` อยู่ที่ `known-issues.md` §3

> วันที่: 2026-10-14 · ตรวจที่ commit `7f58eec`
> ป้ายกำกับ: **[V]** Verified · **[I]** Inferred · **[U]** Unknown
> Effort: S < ครึ่งวัน, M 1–2 วัน, L > 2 วัน · Priority: P1 ควรแก้ใน redesign รอบนี้, P2 แก้เมื่อแตะส่วนนั้น, P3 เก็บไว้ก่อน

Debt ที่เป็น **บั๊กหรือความเสี่ยงต่อข้อมูลหรือความปลอดภัย** อยู่ใน `existing-risks.md` ไฟล์นี้เน้นเรื่องการดูแลรักษาโค้ด

## 1. Architecture & Coupling

| ID | Debt | หลักฐาน | ผลกระทบ | Pri | Effort |
|---|---|---|---|---|---|
| TD-01 | ไม่มี data-access layer โดย Supabase query กระจายใน 6 ไฟล์ | `app/add/page.tsx:102-150`, `app/history/page.tsx:101-104`, `useDashboard.ts`, `useHistoryData.ts`, `useAddRecord.ts`, `EditModal.tsx:54` [V] | เปลี่ยน schema หรือ RLS ต้องแก้หลายจุด และ test ยาก | P1 | M |
| TD-02 | Business rules อยู่ใน client เช่น `seq_number`, การ normalize ชื่อลูกค้า และ audit fields | ดู `current-architecture.md` §1, §3 [V] | ไม่มีอะไรบังคับที่ server และเกิด race ได้ | P1 | L |
| TD-03 | `useDashboard` ทำทุกอย่างใน 310 บรรทัด (auth, fetch 4 queries, realtime, 5 การคำนวณ, mutation, logout) | `hooks/useDashboard.ts` [V] | test ได้ยากและ re-render ทั้งก้อน | P2 | M |
| TD-04 | Component รับ `dash: ReturnType<typeof useDashboard>` ทั้งก้อน | `ChartsSection.tsx:6`, `RecordListSection.tsx:6` [V] | ผูกกับ hook ทำให้ reuse ไม่ได้ และ `memo` แทบไม่มีผล | P2 | S |
| TD-05 | Domain types ผสมกับ UI constants (emoji, ชื่อแสดงผล) ใน `types/index.ts` | `types/index.ts:43-77` [V] | เพิ่มยี่ห้อหรือประเภทรถต้อง deploy โค้ด | P3 | S |
| TD-06 | `services: string[]` เก็บ `[ประเภทรถ, ยี่ห้อ, หมายเหตุ]` ตามตำแหน่ง index | `app/add/page.tsx:107`, `EditModal.tsx:82-83, 100`, `RecordCard.tsx:14`, `UnpaidModal.tsx:156` [V] | ไม่มี type safety, query ตามยี่ห้อหรือประเภทรถไม่ได้ และเก็บชื่อแสดงผลแทน id | P1 (Step 05) | M |
| TD-07 | ไม่มีการตั้งชื่อ domain ที่ชัดเจน: type ชื่อ `Record` ชนกับ `Record<K,V>` ของ TS จึงต้องใช้ `globalThis.Record` หลายจุด | `types/index.ts:12`, `useDashboard.ts:276, 301` [V] | อ่านโค้ดยาก | P2 | S |

## 2. Duplication

| ID | Debt | หลักฐาน | Pri | Effort |
|---|---|---|---|---|
| TD-08 | UI เลือกประเภทรถ, ยี่ห้อ และสถานะชำระ เขียน 2 ชุดที่พฤติกรรมต่างกัน (Add เก็บ `id` ใน state แล้วแปลงเป็นชื่อตอน insert แต่ Edit เก็บชื่อตรง) | `IncomeForm.tsx:118-209` vs `EditModal.tsx:160-229` [V] | P1 | M |
| TD-09 | Validation มีแค่ฝั่ง Add (schema inline) และ Edit ไม่มี จึงไม่มี schema กลาง | `app/add/page.tsx:70-76, 125-129` [V] | P1 | S |
| TD-10 | Rate-limit code ซ้ำใน 2 API routes | `export-excel/route.ts:6-56`, `insights/route.ts:6-33` [V] | P3 (ถ้าเลิกใช้ API ก็ลบทิ้ง) | S |
| TD-11 | Modal 3 ตัวทำ a11y ไม่เหมือนกัน (Escape, scroll lock, role) | `EditModal.tsx:58-67`, `UnpaidModal.tsx:37-45, 67`, `ExportModal.tsx:39` [V] | P1 | M |
| TD-12 | ตั้ง theme เริ่มต้น 3 ที่ | `layout.tsx:55-62`, `ClientLayout.tsx:17-20`, `useTheme.ts` [V] | P3 | S |
| TD-13 | Format วันที่และปี พ.ศ. กระจายหลายแห่ง | `DatePicker.tsx:4-8`, `history/page.tsx:82, 97`, `UnpaidModal.tsx:18-21`, `dashboard/Header.tsx:11-18`, `lib/export.ts:22-28` [V] | P2 | S |
| TD-14 | Normalize ชื่อลูกค้า (`(name || '').trim() || DEFAULT`) ซ้ำหลายจุดและใช้ค่า default 2 แบบ | `useDashboard.ts:138, 272, 304`, `types/index.ts:7-9` [V] | P1 (เกี่ยวกับบั๊ก ER-03) | S |
| TD-15 | Test 2 ชุดทดสอบเรื่องเดียวกัน: `tests/dateUtils.test.ts` ซ้ำกับ `lib/__tests__/dateUtils.test.ts` และ `tests/useDashboard.test.ts` ซ้ำกับ `hooks/__tests__/dashboardComputation.test.ts` | [V] | P2 | S |

## 3. Dead Code & Drift

| ID | รายการ | หลักฐาน | ข้อเสนอ (ต้องอนุมัติก่อนลบ) |
|---|---|---|---|
| TD-16 | `/api/insights` และ `GEMINI_API_KEY` ไม่มี caller | ไม่มี `fetch('/api/insights')` ใน source, commit `089b2c6` เอา feature ออก [V] | ตัดสินใน Step 02 |
| TD-17 | `/api/export-excel` เป็น stub | `export-excel/route.ts:58-66` [V] | ลบ |
| TD-18 | SVG boilerplate 5 ไฟล์ใน `public/` | `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` ไม่มีการอ้างอิง [V] | ลบ |
| TD-19 | Column `job_status` ถูกเขียนเป็น `'done'` เสมอ และ `payment_method` เป็น `'cash'` เสมอ โดยไม่มี UI อ่านหรือแก้ | `app/add/page.tsx:112-113` [V] | ตัดสินใน Step 02 ว่าจะใช้จริง (เช่น โอน/เงินสด) หรือเลิกใช้ |
| TD-20 | `AISparklesIcon` เป็นไอคอนแดดแต่ถูกใช้แทน "ขัดสี" และ "ข้อความอากาศ" | `DashboardIcons.tsx:3`, `StatsRow.tsx:50` [V] | ตั้งชื่อใหม่หรือเปลี่ยนไอคอนใน Step 04 |
| TD-21 | `PROJECT_AUDIT.md` และ README ล้าสมัยหรือผิด | ดู `production-baseline.md` §7, `feature-inventory.md` §6 [V] | แทนที่ด้วย docs ชุดใหม่ใน Step 12 |
| TD-22 | Dashboard tests "mirror" logic โดย copy อัลกอริทึมมาไว้ใน test แทนการ import จาก hook | `dashboardComputation.test.ts:1-5, 41-` [V] | ถ้าแก้ hook test ยังผ่าน จึงเกิด drift ได้ ควรแยก pure functions ออกจาก hook แล้ว test ตัวจริง |
| TD-23 | ป้าย "เชียงราย" hardcode ทั้งที่พิกัดตั้งผ่าน env ได้ | `WeatherWidget.tsx:24, 31` [V] | ย้ายเป็น config |

## 4. Tooling & Dependencies

| ID | Debt | หลักฐาน | Pri |
|---|---|---|---|
| TD-24 | `next@16.2.1` มี advisory ระดับ critical/high หลายรายการ แก้ได้ใน `16.4.0` (non-major) | `npm audit` [V] รายละเอียดใน `existing-risks.md` ER-09 | **P1** |
| TD-25 | `vitest@2.1.9` มี advisory critical (UI server / tinypool) ซึ่งเป็น dev-only แต่แก้ได้เฉพาะ major (5.x) | `npm audit` [V] | P2 |
| TD-26 | `.npmrc legacy-peer-deps=true` ซ่อน peer-dependency conflict | `.npmrc`, commit `07095eb` [V] | P2: ตรวจว่ายังจำเป็นหรือไม่ |
| TD-27 | `middleware.ts` ใช้ convention ที่ Next 16 deprecate แล้ว (→ `proxy`) | build warning [V] | P2 |
| TD-28 | `@supabase/ssr` cookie API แบบ `get/set/remove` | `middleware.ts:34-48`, `serverAuth.ts:22-26` [V] / deprecation [I] | P2 |
| TD-29 | ไม่มี `engines.node` และไม่มี CI | [V] | P1 (Step 06) |
| TD-30 | ไม่มี coverage report และไม่มี component/integration/E2E test | `vitest.config.mts` [V] | P1 (Step 08) |
| TD-31 | `vitest.setup.ts` มีบรรทัดเดียว (import jest-dom) | [V] | — |

## 5. Code Hygiene (ตัวชี้วัด ณ baseline) [V]

| ตัวชี้วัด | ค่า |
|---|---|
| `any` / `as any` | 0 |
| `eslint-disable` | 4 จุด ทั้งหมดเป็น `react-hooks/set-state-in-effect` (`login/page.tsx:20`, `EditModal.tsx:72`, `useAddRecord.ts:23, 42`) |
| `console.*` ใน source (ไม่รวม test) | 28 |
| Inline `style={{…}}` ใน TSX | 44 |
| Hex สี hardcode ใน TSX | 12 |
| Font size 10–12px (`text-[10px]`, `[11px]`, `[12px]`) | 42 จุด |
| ไฟล์ใหญ่สุด | `globals.css` (581), `useWeather.ts` (340), `lib/export.ts` (338), `lib/generateBill.ts` (317), `useDashboard.ts` (310), `IncomeForm.tsx` (271), `EditModal.tsx` (263) |

## 6. UI / Design-System Debt (input สำหรับ Step 03–04)

| ID | Debt | หลักฐาน |
|---|---|---|
| TD-32 | Design tokens มีใน `globals.css` แต่ component ยังใช้ hex, `rgba(...)`, Tailwind palette ตรง (`bg-emerald-500`, `from-red-500`, `bg-blue-100`) และ inline style | `UnpaidModal.tsx:76, 183`, `EditModal.tsx:249, 255`, `ChartsSection.tsx:9-12, 46-47` [V] |
| TD-33 | ใช้ emoji เป็นไอคอนหลัก ซึ่งแสดงต่างกันตาม OS และอ่านออกเสียงไม่ได้ถ้าไม่ซ่อน | `types/index.ts:44-49`, `ExpenseForm.tsx:3-12`, `EditModal.tsx:166-196` [V] |
| TD-34 | ตัวอักษรเล็ก (10–12px) 42 จุด ขัดกับเป้าหมาย "ใช้งานง่ายสำหรับผู้สูงวัย" ใน README | [V] |
| TD-35 | Theme ของ WeatherWidget ตรวจ dark mode โดย match substring ของ class (`'#1E'`, `'#0F'`) | `WeatherWidget.tsx:15` [V] |
