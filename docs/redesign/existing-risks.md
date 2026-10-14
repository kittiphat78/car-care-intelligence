# Existing Risks & Defects — Step 01

> วันที่: 2026-10-14 · ตรวจที่ commit `7f58eec` (= Production candidate `v1.0.0`)
> ป้ายกำกับ: **[V]** Verified · **[I]** Inferred · **[U]** Unknown
> Severity: Critical / High / Medium / Low
> ไฟล์นี้คือปัญหาที่ **มีอยู่แล้วใน Production** ซึ่งต่างจาก `change-risk-register.md` (Step 00) ที่เป็นความเสี่ยงจากการเปลี่ยนแปลง

**Step 01 ไม่ได้แก้บั๊กใดเลย** ทุกรายการต้องผ่าน Step 02 (จัดลำดับ) และได้รับอนุมัติก่อนแก้

## 1. Data Integrity

### ER-01 — แก้ไขรายการที่บันทึกช่วง 00:00–06:59 ทำให้วันที่ถอยหลัง 1 วัน · **High** · [V reproduced]

- **ที่มา:** `lib/dateUtils.ts:69-73` `splitDateTime` เอา **วันที่จาก UTC** (`toISOString()`) แต่เอา **ชั่วโมงจาก local time** แล้ว `mergeDateTime` (`:79-84`) ประกอบกลับเป็น local
- **ผล:** เปิด EditModal (`EditModal.tsx:74`) แล้วกด "บันทึกการแก้ไข" **แม้ไม่ได้แก้วันที่** `created_at` จะถูกเลื่อนไป −24 ชั่วโมงสำหรับรายการที่เวลาท้องถิ่น (UTC+7) อยู่ระหว่าง 00:00–06:59
- **หลักฐาน:** จำลองด้วย logic เดียวกันภายใต้ `TZ=Asia/Bangkok`:
  ```
  2026-10-14T03:30+07:00 → form 2026-10-13 03:30 → saved shift −24h
  2026-10-14T06:59+07:00 → form 2026-10-13 06:59 → saved shift −24h
  2026-10-14T07:00+07:00 → form 2026-10-14 07:00 → shift 0
  ```
- **ทำไม test ไม่จับ:** test round-trip ใช้เวลา 14:30 (`lib/__tests__/dateUtils.test.ts:340`, `tests/dateUtils.test.ts:377`)
- **ขอบเขตผลกระทบ:** [I] ร้านคาร์แคร์ไม่น่าเปิดก่อน 07:00 แต่ **รายการที่บันทึกย้อนหลังผ่าน `/add` ไม่โดน** เพราะใช้เวลาปัจจุบัน ส่วนรายการที่ถูกแก้เวลาเป็นช่วงเช้ามืดจะโดน [U] ข้อมูลจริงมีรายการช่วงนั้นหรือไม่

### ER-02 — ยอดรวมรายปีและไฟล์ Excel อาจถูกตัดที่ 1,000 แถวโดยไม่มี error · **High (รอยืนยัน)** · [I]

- **ที่มา:** query รายปีและช่วงเวลาไม่มี pagination (`useHistoryData.ts:19-20`, `useDashboard.ts:72`, `app/history/page.tsx:102-103`)
- **กลไก:** Supabase จำกัดแถวต่อ response ด้วยค่า "Max rows" (default 1000) [I]
- **ผล:** ถ้าปีหนึ่งมีรายการเกิน limit ยอดในหน้า History (โหมด "ตลอดทั้งปี" และทุกเดือนหลังจากถูกตัด เพราะ order `desc` ทำให้ **เดือนแรก ๆ ของปีหายไป**), รายรับตามลูกค้ารายปี และ Excel จะผิดโดยไม่มีคำเตือน
- **ยืนยันโดย:** ค่า Max rows (Supabase → Settings → API) + `select count(*) from records where created_at >= date_trunc('year', now())`

### ER-03 — "เคลียร์ยอด" ของลูกค้าทั่วไปอาจไม่เคลียร์ทุกรายการ · **Medium** · [V โค้ด] / [U ข้อมูล]

- **ที่มา:** การจัดกลุ่มใช้ `(customer_name || '').trim()` (`useDashboard.ts:272`) แต่การ update ใช้ `.eq('customer_name', '')` (`:146`)
- **ผล:** รายการที่ `customer_name` เป็น `NULL` หรือมีช่องว่างหน้า/หลัง จะแสดงในกลุ่มเดียวกันแต่ **ไม่ถูก update** ทำให้ optimistic UI ลบออกไปก่อน แล้วกลับมาโผล่หลัง refetch โดยไม่มีข้อความอธิบาย
- **ยืนยันโดย:** `select count(*) from records where payment_status='unpaid' and (customer_name is null or customer_name <> btrim(customer_name))`

### ER-04 — `seq_number` ซ้ำได้ · **Medium** · [V]

- **ที่มา:** `app/add/page.tsx:102-111` นับ record ของวันนั้นแล้ว +1 ฝั่ง client
- **ผล:** (a) บันทึกพร้อมกัน 2 เครื่องจะได้เลขเดียวกัน (b) **ลบรายการแล้วเพิ่มใหม่ได้เลขซ้ำกับรายการที่มีอยู่** เพราะ count ลดลง

### ER-05 — แก้ไขรายการไม่มี validation · **Medium** · [V]

- `EditModal.tsx:97, 108` ใช้ `parseInt(price) || 0` จึง **ลบราคาจนว่างแล้วบันทึกได้เป็น 0 บาท**, ทะเบียนว่างได้, ชื่อรายจ่ายว่างได้ และไม่มีจำกัดความยาว (ต่างจาก Add)
- ไม่มีสถานะ saving ทำให้กดซ้ำได้ระหว่างรอ (`EditModal.tsx:282`)

### ER-06 — ลบแบบถาวรและไม่มีประวัติการแก้ไข · **Medium** · [V]

- `useHistoryData.ts:46` hard delete และ audit เก็บแค่ "ผู้แก้ไขล่าสุด" จึงกู้คืนหรือตรวจย้อนหลังไม่ได้ถ้าไม่มี backup (ดู `rollback-readiness.md` §3.1)

### ER-07 — Export ไม่ตรวจ error · **Medium** · [V]

- `app/history/page.tsx:101-104` ไม่อ่าน `error` ของ query ถ้า query หนึ่งล้มเหลว อีกฝั่งยังถูก export ทำให้ **ไฟล์ขาดรายรับหรือรายจ่ายโดยไม่มีคำเตือน** หรือได้ข้อความ "ไม่พบข้อมูล"
- `ExportModal.tsx:33-35` ไม่มี try/catch ถ้า `exportToExcel` throw ปุ่มจะหมุนค้าง

### ER-08 — ข้อมูลข้อความถูกแก้โดย sanitize · **Low** · [V]

- DOMPurify แปลง `<` เป็น `&lt;` ก่อนบันทึก (ทดสอบจริง: `"ราคา <500"` → `"ราคา &lt;500"`) ทั้งใน DB และไฟล์ Excel/PDF

### ER-34 — เลขที่บิลไม่ unique ข้ามเครื่อง · **Medium** · [V]

- `lib/generateBill.ts:31-39` นับใน localStorage ของแต่ละเครื่อง จึงได้เลขบิลซ้ำเมื่อออกบิลจากหลายเครื่อง และเลขเริ่มใหม่เมื่อล้าง browser หรือเปลี่ยน domain และไม่มีบันทึกว่าออกบิลอะไรไปแล้ว

### ER-10 — ตัวกรองวันที่ใน History ตัดรายการ 00:00–06:59 ของวันเริ่มต้น · **Low** · [V logic]

- `app/history/page.tsx:61` `new Date('YYYY-MM-DD')` ถูก parse เป็น UTC midnight (= 07:00 เวลาไทย)

### ER-11 — การคำนวณ "วันนี้" ขึ้นกับ timezone ของอุปกรณ์ · **Low** · [I]

- ทุก boundary ใช้ local time ของเครื่อง (`lib/dateUtils.ts`) ถ้าอุปกรณ์ตั้ง timezone ผิด ยอดวันนี้และกราฟจะผิด

## 2. Security

### ER-09 — Next.js 16.2.1 มี advisory ระดับ Critical/High ที่ยังไม่ patch · **High** · [V audit] / [I applicability]

`npm audit` (2026-10-14): ทั้งโปรเจกต์มี 29 รายการ (critical 3, high 16, moderate 9, low 1) และ `next` แก้ได้ที่ **16.4.0 (non-major)**

| Advisory กลุ่ม | เข้าเงื่อนไขระบบนี้หรือไม่ [I] |
|---|---|
| RCE บน Windows-hosted server | ไม่ (Vercel เป็น Linux) |
| RCE ใน `next/og` / Image Optimization + AVIF | ไม่ได้ใช้ `next/og` หรือ `next/image` แต่ endpoint `/_next/image` ยังเปิดอยู่ตาม default |
| **Middleware/Proxy bypass** (หลาย GHSA) | **เข้าเงื่อนไขบางส่วน** แอปใช้ middleware เป็น page guard แต่ผลกระทบจำกัด เพราะหน้าเป็น static shell และข้อมูลยังต้องผ่าน Supabase session หรือ RLS |
| DoS / cache poisoning / SSRF ใน Server Actions, rewrites, WebSocket | ส่วนใหญ่ไม่เข้าเงื่อนไข (ไม่มี Server Actions หรือ rewrites) |

ข้อเสนอ: upgrade เป็น patch แยก PR เป็นลำดับแรกของ Step 07 (หรือ hotfix ถ้าอนุมัติ)

Dev-only: `vitest` (critical ผ่าน `tinypool`/UI server) ไม่ได้ deploy จึงเสี่ยงเฉพาะเครื่อง dev

### ER-12 — Authorization ขึ้นกับ RLS ทั้งหมด และยังไม่รู้สถานะ · **Critical (รอยืนยัน)** · [U]

- ดู `current-architecture.md` §3 ถ้า RLS ปิดหรือ policy เป็น `using (true)` สำหรับ `anon` **ใครก็ตามที่มี anon key (อยู่ใน JS bundle สาธารณะ) อ่าน แก้ หรือลบข้อมูลร้านได้โดยไม่ต้อง login**
- ยืนยันด้วย SQL ข้อ 1, 2, 10 ใน `production-baseline.md` §8

### ER-13 — Public sign-up อาจเปิดอยู่ · ~~Critical~~ → **Low (mitigated)** · [V]

> **อัปเดต 2026-10-14:** เจ้าของส่ง screenshot Supabase Auth แสดงว่า "Allow new users to sign up" **ปิดอยู่** และ anonymous sign-ins ปิด ความเสี่ยงที่เหลือคือบัญชีที่อาจถูกสร้างไว้ก่อนหน้า (ตอนที่ยังเปิดอยู่ ถ้าเคยเปิด) จึงต้องเทียบรายชื่อด้วย SQL ข้อ 13 และ allowlist `app_members` (ADR-04) ยังทำตามแผนเป็นการป้องกันชั้นที่สอง

- ไม่มี role ในแอป ถ้า Supabase เปิด "Allow new users to sign up" ไว้ คนนอกสมัครผ่าน Auth API แล้วได้สิทธิ์ `authenticated` เท่ากับพนักงาน

### ER-14 — Audit fields ปลอมได้ · **Medium** · [V]

- `created_by`, `created_by_email`, `updated_by_email`, `updated_at` ส่งจาก client (`app/add/page.tsx:111-112`, `EditModal.tsx:102-103`) แทนการตั้งด้วย DB default หรือ trigger จาก `auth.uid()`

### ER-15 — CSP อนุญาต `'unsafe-eval'` และ `'unsafe-inline'` ใน `script-src` · **Low** · [V]

- `next.config.ts:51` ซึ่ง `'unsafe-eval'` ไม่จำเป็นใน production build [I] และ CSP ยังอนุญาต `generativelanguage.googleapis.com` ที่ client ไม่ได้ใช้

### ER-16 — Rate limit แบบ in-memory ใช้ไม่ได้จริงบน serverless · **Low** · [V โค้ด] / [I runtime]

- `insights/route.ts:6`, `export-excel/route.ts:6` แต่ละ instance มี Map ของตัวเอง ความเสี่ยงต่ำเพราะ endpoint ต้อง auth และไม่มีคนใช้

### ER-17 — ข้อความ error ภายในแสดงต่อผู้ใช้ · **Low** · [V]

- `useHistoryData.ts:50, 72`, `useDashboard.ts:154`, `app/add/page.tsx:166` แสดง `error.message` ของ Supabase หรือ JS ตรง ๆ

## 3. UX & Accessibility

| ID | ปัญหา | หลักฐาน | Severity |
|---|---|---|---|
| ER-18 | Kiosk mode: กด reload ที่ `/add` หรือ `/history` แล้วถูกพากลับหน้าแรก **ทำให้ข้อมูลในฟอร์มที่กรอกค้างหาย** | `useKioskMode.ts:18-25` [V] | Medium |
| ER-19 | ปิดการซูม (`maximumScale: 1`, `userScalable: false`) ขัด WCAG 1.4.4 และไม่เหมาะกับผู้ใช้สูงวัย | `app/layout.tsx:46-47` [V] | Medium |
| ER-20 | ตัวอักษร 10–12px 42 จุด | ดู `technical-debt.md` §5 [V] | Medium |
| ER-21 | การ์ด "รายการวันนี้" บน Dashboard ประกาศตัวเป็นปุ่ม (`role="button"`, `tabIndex=0`) แต่กดแล้วไม่มีอะไรเกิดขึ้น จึงต้องไปแก้ที่ History | `RecordCard.tsx:21-27`, `RecordListSection.tsx:25` [V] | Medium |
| ER-22 | DatePicker ใช้คีย์บอร์ดไม่ได้: `Card` เป็น `div` ที่ focus ไม่ได้ และ input จริงเป็น `tabIndex=-1` + `aria-hidden` | `DatePicker.tsx:14, 25`, `Shared.tsx:11-13` [V] | Medium |
| ER-23 | Modal ไม่มี focus trap หรือคืน focus และ ExportModal ไม่มี `role="dialog"` หรือ Escape | `ExportModal.tsx:39` [V] | Medium |
| ER-24 | `SectionLabel` เป็น `<label>` ที่ไม่ผูกกับ input (ไม่มี `htmlFor`) และ label ใน ExportModal ไม่ผูกกับ select | `Shared.tsx:5-9`, `ExportModal.tsx:59, 71` [V] | Low |
| ER-25 | "เคลียร์ยอด" ใช้ `window.confirm` และไม่มี undo ทั้งที่เป็น bulk update | `useDashboard.ts:130` [V] | Medium |
| ER-26 | ปุ่ม Export อยู่เฉพาะแท็บรายรับ แต่ไฟล์มีรายจ่ายด้วย | `SummaryCard.tsx:54` [V] | Low |
| ER-27 | SummaryCard toggle เป็น `div role="button"` ที่ไม่มี `tabIndex` และ key handler | `SummaryCard.tsx:33-38` [V] | Low |
| ER-28 | ปุ่มแสดงรหัสผ่าน `tabIndex=-1` | `login/page.tsx:100` [V] | Low |
| ER-29 | นิยาม "กำไรสุทธิ" (ยอดชำระแล้ว − รายจ่าย) กับ "% เทียบเมื่อวาน" (ยอดรวมรวมค้างชำระ) ใช้ฐานต่างกัน อาจทำให้ผู้ใช้เข้าใจผิด | `useDashboard.ts:203, 210, 214` [V] | ถามใน Step 02 |

## 4. Operational

| ID | ปัญหา | Severity |
|---|---|---|
| ER-30 | ไม่มี CI, error monitoring หรือ uptime alert จึงรู้ปัญหาเมื่อผู้ใช้แจ้งเท่านั้น [V] | High |
| ER-31 | Realtime event ใดก็ตามทำให้ **ทุกอุปกรณ์** refetch 4 queries (รวมข้อมูล 1 ปี) [V] เมื่อข้อมูลโตจะเพิ่ม egress และ latency [I] | Medium |
| ER-32 | Middleware เรียก `supabase.auth.getUser()` (network call ไป Supabase Auth) ทุก page request รวมไฟล์ใน `/public` [I จาก matcher] | Low |
| ER-33 | Local branches ที่ยังไม่ push (ดู Step 00 R09) | Medium |

## 5. สรุปตาม Severity

| Severity | รายการ |
|---|---|
| Critical (รอยืนยัน) | ER-12 RLS, ER-13 public sign-up |
| High | ER-01 date shift, ER-02 row-limit truncation (รอยืนยัน), ER-09 Next advisories, ER-30 ไม่มี CI/monitoring |
| Medium | ER-03, ER-04, ER-05, ER-06, ER-07, ER-34, ER-14, ER-18–ER-23, ER-25, ER-31, ER-33 |
| Low | ER-08, ER-10, ER-11, ER-15–ER-17, ER-24, ER-26–ER-28, ER-32 |
