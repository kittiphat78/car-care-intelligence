# Feature Inventory — Step 01

> วันที่: 2026-10-14 · ตรวจที่ commit `7f58eec`
> ป้ายกำกับ: **[V]** Verified จากโค้ด · **[I]** Inferred · **[U]** Unknown
> ทุก feature มี ID เพื่อใช้อ้างอิงใน Step 02 (requirements) และ Step 08 (regression test)

คอลัมน์ "Data ops" ใช้ R = read, C = create, U = update, D = delete, RT = realtime

## 1. Authentication & Shell

| ID | Feature | Entry point (หลักฐาน) | Data ops | หมายเหตุ |
|---|---|---|---|---|
| F-01 | Login ด้วย email/password | `app/login/page.tsx:33` `signInWithPassword` | Auth | ข้อความ error เดียวสำหรับทุกกรณี และไม่มีหน้า sign-up, reset password หรือ magic link [V] |
| F-02 | จดจำอีเมล | `app/login/page.tsx:18-22, 38-39` localStorage `remembered_email` | — | เก็บแค่อีเมล ไม่เก็บรหัสผ่าน [V] |
| F-03 | Route guard | `middleware.ts:5, 57-64` | Auth (`getUser`) | ป้องกัน `/`, `/add`, `/history` และถ้า login แล้วเข้า `/login` จะเด้งไป `/` [V] |
| F-04 | Logout | `hooks/useDashboard.ts:113-122` | Auth | ปุ่มอยู่ที่ header ของ dashboard เท่านั้น [V] |
| F-05 | Bottom navigation | `components/BottomNav.tsx:14-18` | — | 3 แท็บ และซ่อนในหน้า `/login` [V] |
| F-06 | Dark / Light theme | `hooks/useTheme.ts`, `app/layout.tsx:55-62`, `components/ClientLayout.tsx:17-20` | — | ค่าเริ่มต้นเป็น dark และเก็บใน localStorage `car-care-theme` [V] |
| F-07 | Kiosk mode (reload → กลับหน้าแรก) | `hooks/useKioskMode.ts:18-25` | — | [V] |
| F-08 | PWA installable (manifest, icons, shortcuts) | `public/manifest.json`, `app/layout.tsx:20-39` | — | ไม่มี service worker จึงไม่มี offline [V] |
| F-09 | Toast notifications | `hooks/useToast.tsx` | — | แสดงพร้อมกันได้สูงสุด 3 อัน และปิดเองใน 3.5 วินาที [V] |
| F-10 | Error boundary / 404 | `app/error.tsx`, `app/not-found.tsx` | — | [V] |

## 2. Dashboard (`/`)

| ID | Feature | Entry point | Data ops | หมายเหตุ |
|---|---|---|---|---|
| F-11 | ทักทายตามช่วงเวลา + วันที่ภาษาไทย | `components/dashboard/Header.tsx:4-18` | — | แสดงชื่อจาก local-part ของอีเมล [V] |
| F-12 | สภาพอากาศ + โอกาสฝน + AQI + ข้อความแนะนำ | `hooks/useWeather.ts:223-376`, `WeatherWidget.tsx` | External (Open-Meteo) | ตรวจทุก 5 นาที (`useWeather.ts:179`) แต่ได้ข้อมูลใหม่จริงเมื่อ cache 30 นาทีหมดอายุ, ตรวจเมื่อกลับมาที่แท็บ และกดรีเฟรชเอง, cache 30 นาที, retry 3 ครั้ง [V] ป้ายข้อความ "เชียงราย" ถูก hardcode แม้ lat/lon ตั้งผ่าน env ได้ [V] |
| F-13 | กำไรสุทธิวันนี้ + % เทียบเมื่อวาน | `useDashboard.ts:166-217`, `NetProfitHero.tsx` | R | **กำไรสุทธิ = รายรับที่ชำระแล้ว − รายจ่าย** (ไม่รวมยอดค้างชำระ) แต่ **% เทียบเมื่อวานคิดจากรายรับรวม** (รวมค้างชำระ) [V] |
| F-14 | สถิติวันนี้: รายจ่าย, จำนวนล้าง, จำนวนขัดสี | `StatsRow.tsx` | R | [V] |
| F-15 | กราฟรายรับ-รายจ่าย 7 / 30 วัน | `useDashboard.ts:226-267`, `ChartsSection.tsx` | R | Bar chart (recharts) [V] |
| F-16 | รายรับตามลูกค้า (สัปดาห์/เดือน/ปี, แยกล้าง/ขัดสี) | `useDashboard.ts:294-330`, `CustomerBreakdownSection.tsx:17-60` | R | Top 4 ลูกค้าที่มีชื่อและมียอดเดือนนี้ ส่วนที่เหลือรวมเป็น "ลูกค้าทั่วไป" และนับรวมรายการค้างชำระด้วย [V] |
| F-17 | รายการวันนี้ + ปุ่มรีเฟรช | `RecordListSection.tsx` | R | การ์ด **กดไม่ได้** (มี `role="button"` แต่ไม่มี handler) [V] |
| F-18 | Realtime update | `useDashboard.ts:95-110` | RT (`records`, `expenses`) | ทุก event จะ refetch ทั้ง 4 queries (debounce 300ms) [V] |
| F-19 | แจ้งเตือนยอดค้างชำระรวม | `UnpaidAlert.tsx`, `app/page.tsx:33` | R | แสดงเมื่อยอดค้าง > 0 [V] |
| F-20 | สมุดทวงหนี้ (จัดกลุ่มตามลูกค้า, จำนวนวันค้าง, สีตามความเร่งด่วน) | `UnpaidModal.tsx`, `useDashboard.ts:270-285` | R | ระดับสี: ≥14 วัน แดง, ≥7 ส้ม, ≥3 เหลือง [V] |
| F-21 | เคลียร์ยอด (จ่ายครบ) รายลูกค้า | `useDashboard.ts:124-161` | **U (bulk)** | ยืนยันด้วย `window.confirm` มี optimistic update และไม่มี undo [V] ⚠️ มีบั๊ก (ดู `existing-risks.md` ER-03) |
| F-22 | สร้างบิลเงินสด PDF รายลูกค้า | `UnpaidModal.tsx:50-61`, `lib/generateBill.ts` | — (client) | เลขบิลเก็บใน localStorage `last_bill_number` แบบนับต่อเครื่อง และข้อมูลร้าน hardcode ที่ `generateBill.ts:7-11` [V] |

## 3. Add (`/add`)

| ID | Feature | Entry point | Data ops | หมายเหตุ |
|---|---|---|---|---|
| F-23 | สลับโหมดรายรับ / รายจ่าย | `ModeToggle.tsx`, `app/add/page.tsx:185` | — | [V] |
| F-24 | เลือกวันที่ทำรายการ (ย้อนหลังได้) | `DatePicker.tsx`, `app/add/page.tsx:25-30` | — | แสดงปี พ.ศ. และใช้เวลาปัจจุบันเป็นเวลาของรายการ [V] |
| F-25 | บันทึกรายรับ: ประเภทงาน (ล้าง/ขัดสี), ทะเบียน, ราคา, ประเภทรถ, ยี่ห้อ, สถานะชำระ, ลูกค้า, หมายเหตุ | `IncomeForm.tsx`, `app/add/page.tsx:68-121` | **C** `records` | Zod: ทะเบียน 1–20 ตัว, ประเภทรถบังคับ, ราคา ≥ 0, ลูกค้า ≤ 50, หมายเหตุ ≤ 200 และ DOMPurify ทุก text [V] |
| F-26 | เลขลำดับรายวัน `seq_number` | `app/add/page.tsx:102-111` | R (count) | = จำนวน record ของวันนั้น + 1 คำนวณฝั่ง client [V] |
| F-27 | แจ้ง "ลูกค้าประจำ ครั้งที่ N" จากทะเบียน | `useAddRecord.ts:38-59`, `IncomeForm.tsx:89-96` | R (count by plate) | debounce 600ms และเริ่มเมื่อพิมพ์ ≥ 3 ตัวอักษร [V] |
| F-28 | ลูกค้าล่าสุด (quick pick 3 ชื่อ + datalist 30 ชื่อ) | `useAddRecord.ts:19-36` | — | เก็บใน localStorage `recentCustomers` แยกต่อเครื่อง [V] |
| F-29 | ค้นหา/เลือกยี่ห้อรถ (แสดง 8 ยี่ห้อ, ดูทั้งหมด 24) | `IncomeForm.tsx:44-48, 142-182` | — | [V] |
| F-30 | บันทึกรายจ่าย + ปุ่มลัด 8 หมวด | `ExpenseForm.tsx:3-12`, `app/add/page.tsx:123-156` | **C** `expenses` | Zod: title 1–100, amount ≥ 1, note ≤ 200 [V] |
| F-31 | "บันทึกแล้วทำต่อ" (bulk entry) และ "บันทึก" (กลับหน้าแรก) | `ActionButtons.tsx`, `app/add/page.tsx:117-120, 152-155` | — | ปุ่ม disabled ขณะ `saving` [V] |

## 4. History (`/history`)

| ID | Feature | Entry point | Data ops | หมายเหตุ |
|---|---|---|---|---|
| F-32 | เลือกเดือน/ปี (มีตัวเลือก "ตลอดทั้งปี") | `history/Header.tsx`, `constants.ts:4-15` | R | ดึงข้อมูลทั้งปีมาก่อนแล้วกรองเดือนฝั่ง client (`app/history/page.tsx:38-44`) [V] |
| F-33 | แท็บรายรับ / รายจ่าย | `TabToggle.tsx` | — | [V] |
| F-34 | Summary: ยอดรวม, จำนวนล้าง/ขัด (กดสลับเป็นยอดเงิน) | `SummaryCard.tsx` | — | [V] |
| F-35 | ค้นหา (ทะเบียน/ชื่อลูกค้า หรือชื่อรายจ่าย), ช่วงวันที่, ประเภทงาน | `FilterSection.tsx`, `app/history/page.tsx:60-77` | — | [V] |
| F-36 | รายการจัดกลุ่มตามวัน + ยอดรวมรายวัน + ผู้สร้าง/ผู้แก้ไข | `HistoryList.tsx` | — | [V] |
| F-37 | แก้ไขรายการ (รวมวันที่/เวลา) | `EditModal.tsx:90-115`, `useHistoryData.ts:60-80` | **U** | **ไม่มี zod validation**, ไม่มีสถานะ saving และ ⚠️ มีบั๊กวันที่ (ER-01) [V] |
| F-38 | ลบรายการ (ยืนยัน 2 ขั้นใน modal) | `EditModal.tsx:268-276`, `useHistoryData.ts:42-58` | **D (hard)** | [V] |
| F-39 | Audit trail แสดงผู้สร้าง/ผู้แก้ไขล่าสุด | `EditModal.tsx:246-264` | — | เก็บแค่ "ล่าสุด" ไม่มีประวัติ [V] |
| F-40 | Export Excel: โหมด "ธนาคาร" และ "ภายใน" ตามช่วงเดือน | `ExportModal.tsx`, `app/history/page.tsx:92-118`, `lib/export.ts` | R | ปุ่มอยู่เฉพาะแท็บรายรับ แต่ไฟล์มีทั้งรายรับและรายจ่าย [V] |

## 5. Server / API

| ID | Feature | Entry point | สถานะการใช้งาน |
|---|---|---|---|
| F-41 | AI insights (Gemini) | `app/api/insights/route.ts` | **ไม่มี client เรียก** [V] (commit `089b2c6` "Remove AI insights feature from dashboard") |
| F-42 | Export Excel API | `app/api/export-excel/route.ts` | **Stub** คืน JSON จำลอง และไม่มี client เรียก [V] |

## 6. Feature ที่ README อ้างแต่ไม่พบในโค้ด

| README | ความจริง |
|---|---|
| "WAQI API (ข้อมูล PM2.5 จากเซ็นเซอร์จริง)" | ใช้ Open-Meteo Air Quality (`us_aqi`) ซึ่งเป็นข้อมูลจากโมเดล [V] |
| "Quick Expense แบบ Drag-to-scroll" | หน้า Add ใช้ `flex-wrap` ส่วน drag-to-scroll มีเฉพาะ brand list ใน EditModal [V] |

## 7. Critical User Journeys (สำหรับ regression ใน Step 08)

| CUJ | ขั้นตอน | Features |
|---|---|---|
| CUJ-1 | Login → Dashboard | F-01, F-03, F-11..F-19 |
| CUJ-2 | บันทึกรายรับล้างรถ (ชำระแล้ว) → กลับ Dashboard เห็นยอดอัปเดต | F-25, F-26, F-31, F-13, F-17, F-18 |
| CUJ-3 | บันทึกรายรับค้างชำระของเต็นท์ → เห็นใน "ค้างชำระ" → สร้างบิล → เคลียร์ยอด | F-25, F-19..F-22 |
| CUJ-4 | บันทึกรายจ่ายด้วยปุ่มลัด | F-30 |
| CUJ-5 | บันทึกหลายคันต่อเนื่อง (bulk) | F-31, F-27, F-28 |
| CUJ-6 | ค้นหาประวัติ → แก้ไขราคา/สถานะ → ลบรายการผิด | F-32..F-38 |
| CUJ-7 | Export Excel รายเดือนส่งธนาคาร | F-40 |
| CUJ-8 | Logout | F-04 |
