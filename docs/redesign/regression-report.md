# Step 08 — Regression Report

> 2026-10-18 · เทียบฟีเจอร์ v1 (`feature-inventory.md` F-01…F-40) กับ v2.0.0 + `qa/step-08`
> ป้ายหลักฐาน: [V] Verified · [I] Inferred · [U] Unknown · สถานะ: Passed / Failed / Blocked / Not Run
> E2E = Playwright บน phone (Pixel 7) และ desktop (1440×900) · unit = Vitest · SQL = `supabase/tests`
> F-41/F-42 (API ที่ไม่มีใครเรียก) ลบไปใน A8 (Step 07) จึงไม่อยู่ในตาราง

## 1. สรุป

| สถานะ | จำนวน |
|---|---|
| Passed | 36 |
| Passed บางส่วน (ส่วนที่เหลือ Not Run) | 2 (F-08, F-12) |
| Blocked | 1 (F-18) |
| Not Run | 0 |
| Failed | 0 |
| ถอดตามการตัดสินใจ (พฤติกรรมแทนผ่าน) | 1 (F-07) |

รวม 40 · ไม่พบ regression ที่ไม่ได้ตั้งใจ · การเปลี่ยนที่ตั้งใจอยู่ใน `release-2.0.0.md`

## 2. ตาราง

### ทั่วไป / Auth

| ID | ฟีเจอร์ | Test | สถานะ |
|---|---|---|---|
| F-01 | Login | unit `login.test.tsx` (11) · E2E CUJ-1, security sign-in | Passed [V] |
| F-02 | จดจำอีเมล | unit "fills in a remembered email", "signs in, remembers the email" | Passed [V] |
| F-03 | Route guard | unit `proxy.test.ts` (10), `layout.test.tsx` · E2E 5 หน้า → `/login?next=`, UF-AUTH-02, open redirect · production `/history` → 307 | Passed [V] |
| F-04 | Logout | unit `logout.test.tsx` (8) · E2E CUJ-8, `logout.spec.ts` (2 เครื่อง, เน็ตหลุด) | Passed [V] · v1 ออกทุกเครื่อง ตอนนี้ออกเฉพาะเครื่องที่กด (D-03 ตามที่เจ้าของเลือก) |
| F-05 | Bottom navigation | unit `shell.test.tsx` (5 ปลายทาง, badge) · E2E ใช้เมนูจริงบน phone | Passed [V] · เปลี่ยนจาก 3 เป็น 5 แท็บตามแบบ |
| F-06 | ธีมมืด/สว่าง | unit "keeps the v1 storage key" · E2E `regression.spec.ts` สลับแล้ว reload ยังจำ · axe ธีมสว่าง | Passed [V] |
| F-07 | Kiosk mode | — | ถอดตามการตัดสินใจ (`feature-prioritization.md` F-07 Replace) · พฤติกรรมแทน: reload อยู่หน้าเดิม + draft ไม่หาย (unit AC-12-1) Passed [V] |
| F-08 | PWA ติดตั้งได้ | E2E `regression.spec.ts`: `manifest.json` + icon ทุกไฟล์ตอบ 200 โดยไม่ต้อง login | Passed [V] · ติดตั้งบนเครื่องจริง Not Run |
| F-09 | Toast | unit Toast (3) · E2E ทุก CUJ ตรวจข้อความ toast | Passed [V] |
| F-10 | Error / 404 | unit `error-pages.test.tsx` | Passed [V] |

### หน้าภาพรวม

| ID | ฟีเจอร์ | Test | สถานะ |
|---|---|---|---|
| F-11 | ทักทาย + วันที่ไทย | unit "greets by Bangkok hour", `bangkok.test.ts` | Passed [V] |
| F-12 | สภาพอากาศ | unit `useWeatherCache.test.ts` (cache 30 นาที, JSON เสีย) | Passed บางส่วน [V] · widget กับ API จริง Not Run (บริการภายนอก, E2E ตั้งใจไม่รอ) |
| F-13 | กำไรสุทธิ + % เทียบเมื่อวาน | unit `toStats` (สูตรเดิม) · SQL `dashboard_rpcs` · `DashboardScreen` | Passed [V] |
| F-14 | สถิติวันนี้ | SQL `dashboard_rpcs` · `DashboardScreen` | Passed [V] |
| F-15 | กราฟ 7/30 วัน | unit `toChartData`, `chartSummary` · axe หน้าภาพรวม | Passed [V] |
| F-16 | รายรับตามลูกค้า | unit `topCustomers`, `toCustomerBreakdown` · SQL `customer_breakdown` | Passed [V] |
| F-17 | รายการวันนี้ | unit newest first, เปิด dialog แก้ไขผ่าน URL · E2E CUJ-2 เห็นรายการบนหน้าภาพรวม | Passed [V] · v1 กดไม่ได้ ตอนนี้กดแก้ไขได้ (ตั้งใจ) |
| F-18 | Realtime | — | **Blocked** · Supabase ในเครื่อง/CI ไม่ได้เปิดบริการ realtime และ production ปิด realtime อยู่ (`release-2.0.0.md`) · ใช้ปุ่ม "อัปเดต" แทน |
| F-19 | แจ้งยอดค้างชำระ | unit `DashboardScreen` (ซ่อนเมื่อไม่มีหนี้) · E2E non-member ไม่เห็นการ์ดหนี้ | Passed [V] |

### ค้างชำระ

| ID | ฟีเจอร์ | Test | สถานะ |
|---|---|---|---|
| F-20 | สมุดทวงหนี้ | unit debt rules (จัดกลุ่ม, ระดับเร่งด่วน), `DebtsScreen` · E2E CUJ-3 | Passed [V] |
| F-21 | เคลียร์ยอด | unit `settleRecords`, จ่ายบางส่วน (UF-DEBT-02) · SQL `settle_records` · E2E CUJ-3 · outsider เคลียร์ไม่ได้ | Passed [V] · ER-03 แก้แล้ว (B4) |
| F-22 | บิล PDF | E2E CUJ-3 ดาวน์โหลด `.pdf` ได้ทั้ง phone/desktop (Chromium) | Passed [V] · เนื้อหา PDF ไม่ได้ตรวจด้วยตา · iPhone Not Run (S07-41) |

### บันทึก

| ID | ฟีเจอร์ | Test | สถานะ |
|---|---|---|---|
| F-23 | สลับรายรับ/รายจ่าย | E2E CUJ-4 (`/add?type=expense`) · unit editor | Passed [V] |
| F-24 | เลือกวันที่ย้อนหลัง | unit "puts the record on the chosen Bangkok day", `bangkok.test.ts` 3 TZ | Passed [V] |
| F-25 | บันทึกรายรับครบทุกช่อง | unit `record-editor`, `schema`, `editor` · E2E CUJ-2 · ฐานข้อมูลบังคับกฎซ้ำ (23514) | Passed [V] |
| F-26 | เลขลำดับรายวัน | SQL `data_rules_seq` · E2E ส่ง 999 แล้วฐานข้อมูลไม่ใช้ · unit "leaves the daily number to the database" | Passed [V] · ฐานข้อมูลออกเลขเอง (M009) |
| F-27 | ลูกค้าประจำครั้งที่ N | unit "shows a regular customer after the plate lookup", "counts earlier visits" | Passed [V] |
| F-28 | ลูกค้าล่าสุด | E2E `regression.spec.ts`: บันทึกแล้วรายการถัดไปเสนอชื่อให้กดได้ | Passed [V] |
| F-29 | เลือกยี่ห้อรถ | E2E `regression.spec.ts`: เลือก HONDA แล้วเปิดแก้ไขยังเป็น HONDA · unit "reads car type, brand and note back" | Passed [V] |
| F-30 | รายจ่าย + ปุ่มลัด | unit `ExpenseEditor` · E2E CUJ-4 | Passed [V] |
| F-31 | "บันทึกแล้วทำต่อ" / "บันทึก" | E2E CUJ-5, CUJ-2, keyboard-only · unit กดซ้ำส่งครั้งเดียว (AC-06-1) | Passed [V] · หลังแก้ D-01 |

### ประวัติ

| ID | ฟีเจอร์ | Test | สถานะ |
|---|---|---|---|
| F-32 | เลือกเดือน/ปี | unit history api (ทั้งปี), history rules | Passed [V] |
| F-33 | แท็บรายรับ/รายจ่าย | unit "keeps the tab in the URL" | Passed [V] |
| F-34 | สรุปยอด + จำนวนคัน | unit "shows the month total" | Passed [V] · แสดงจำนวนคันและยอดเงินพร้อมกัน ไม่ต้องกดสลับ (ตั้งใจ) |
| F-35 | ค้นหา/กรอง | unit history rules (ทะเบียน/ลูกค้า/หมายเหตุ, ช่วงวันที่รวม 00:00–06:59) · E2E CUJ-6 | Passed [V] |
| F-36 | จัดกลุ่มตามวัน + ผู้บันทึก | unit "groups by day, newest first" | Passed [V] |
| F-37 | แก้ไขรายการ | unit `EditRecordDialog` (7 รวมกันแก้ทับ ADR-07) · E2E CUJ-6 | Passed [V] · ER-01 แก้แล้ว |
| F-38 | ลบรายการ | unit ยืนยันก่อนลบ · E2E CUJ-6 | Passed [V] |
| F-39 | ผู้สร้าง/ผู้แก้ไขล่าสุด | E2E `regression.spec.ts` (dialog แสดงอีเมลผู้บันทึก) · E2E ปลอมอีเมลไม่ได้ · SQL `indexes_idempotency_audit` | Passed [V] |
| F-40 | Export Excel | E2E CUJ-7 · unit กันสูตร, export ทั้งเดือน, ไม่สร้างไฟล์จากข้อมูลครึ่งเดียว (ER-07) | Passed [V] |

## 3. Regression จากการแก้ใน Step 08

| การแก้ | ตรวจซ้ำ | ผล |
|---|---|---|
| D-01 Enter ไม่บันทึก (`RecordEditor.tsx`) | unit ทั้งหมด 393 · E2E CUJ-2/4/5 (บันทึกด้วยการคลิก), keyboard-only | Passed [V] |
| D-02 `ci_fixtures.sql` | SQL tests 5/5 · E2E global-setup | Passed [V] |
| CI step ตรวจ bundle | script จำลองในเครื่อง | Passed [V] · บน GitHub รอ CI ของ PR |
