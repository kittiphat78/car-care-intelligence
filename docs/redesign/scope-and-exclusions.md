# Scope & Exclusions — Step 02

> วันที่: 2026-10-14 · อ้างอิง `feature-prioritization.md`, `product-requirements.md`

## 1. MVP ของ Redesign

**นิยาม:** ระบบเดิมที่ **ทำได้ทุกอย่างเท่าเดิม** (ไม่มีฟีเจอร์ที่ใช้งานอยู่หายไป) บน UI ใหม่ที่ใช้ design system เดียวกันทุกหน้า โดย **ข้อมูลถูกต้อง, ปลอดภัย และทดสอบได้** และ release ได้โดยไม่ทำให้ร้านต้องหยุดงาน

### 1.1 MVP ประกอบด้วย

| กลุ่ม | ขอบเขต |
|---|---|
| **Foundation (ต้องเสร็จก่อนแตะ UI)** | E-01 RLS/sign-up, E-02 staging, E-03 Next 16.4.x, E-05 CI, E-07 baseline migration, E-08 regression tests ของ CUJ-1..8, A-08 environment banner |
| **Data correctness** | E-04 (ER-01), E-06 (ER-02), FR-DEBT-03 (ER-03), FR-EXP-03 (ER-07), FR-HIST-06 (ER-05) |
| **UI redesign ทุกหน้า** | Login, Dashboard, Add, History, Debt modal, Edit modal, Export modal, Error/404 ตาม design system ใหม่ (Step 03–04) |
| **Feature ทุกตัวที่สถานะ Keep/Improve/Replace และเป็น P0** | ดู `feature-prioritization.md` §2 |
| **Accessibility baseline** | NFR-A11Y-01..06 |
| **Add ที่เป็น P0** | A-02 แก้ไขจาก dashboard, A-08 environment banner |

### 1.2 MVP Exit Criteria

- [ ] AC ทุกข้อของ story P0 ผ่าน (`acceptance-criteria.md`)
- [ ] CUJ-1..CUJ-8 ผ่านบน staging (SM-04)
- [ ] SM-01, SM-02, SM-03, SM-09 ผ่าน
- [ ] lint, type-check, test และ build ผ่านใน CI
- [ ] ไม่มี Critical/High ที่ยังไม่จัดการใน `existing-risks.md`
- [ ] Rollback plan ของ release ได้รับอนุมัติ (`rollback-readiness.md`)
- [ ] เจ้าของร้านทดลองใช้บน staging และอนุมัติ

### 1.3 Post-MVP (P1 → release ถัดไป, P2 → ภายหลัง)

**P1:** A-01 draft, A-03 dialog เคลียร์ยอด, A-04 soft delete (ถ้า Q-02 = ใช่), A-06 เลขบิล (ถ้า Q-05 = ใช่), FR-REC-10 seq, FR-REC-11 ไม่แปลงข้อความ, FR-DASH-07 realtime แบบเบา, NFR-OPS-02 monitoring, F-41/F-42 remove (ถ้าอนุมัติ), refactor TD-01/TD-03/TD-08 เท่าที่จำเป็นต่อการทำ UI

**P2:** A-05 audit log, A-07 ตั้งค่าร้าน, FR-DASH-08 ป้ายพื้นที่อากาศ, FR-EXP-04 export จากแท็บรายจ่าย, FR-DEBT-05 undo เคลียร์ยอด

> หมายเหตุ: Step 07 อาจย้าย P1 บางข้อเข้า MVP ถ้าเป็นผลพลอยได้จากการแก้ P0 (เช่น A-01 อาจทำพร้อม F-07) โดยต้องระบุใน PR

## 2. In Scope

- Redesign UX/UI ของทุกหน้าและทุก modal ที่มีอยู่
- แก้ defect ที่อยู่ใน `existing-risks.md` ตาม priority
- Schema changes แบบ backward-compatible (expand/contract) ที่จำเป็นต่อ FR/NFR ข้างต้น
- Test (unit, integration บน staging, E2E ของ CUJ), CI และ monitoring
- เอกสาร: requirements, design system, architecture, runbook และ handover

## 3. Out of Scope / Exclusions

| รายการ | เหตุผล |
|---|---|
| ระบบหลายสาขาหรือหลายร้าน (multi-tenant) | ไม่มีหลักฐานว่าต้องการ และข้อมูลปัจจุบันเป็นร้านเดียว [V] |
| Role/permission ใหม่ | **ยังไม่อยู่ใน scope** จนกว่า Q-01 จะตัดสิน (ค่าเริ่มต้นคือคงเดิม) |
| สมัครสมาชิกเอง / reset password ในแอป | บัญชีสร้างโดยผู้ดูแล (FR-AUTH-05) ส่วน reset password → Q-15 |
| Offline mode / service worker | ไม่มีหลักฐานว่าร้านมีปัญหาเน็ต [U] และเพิ่มความซับซ้อนด้านข้อมูลซ้ำ |
| การรับชำระเงินออนไลน์ หรือ QR PromptPay | ไม่มีในระบบเดิม และไม่มีคำขอ |
| แจ้งเตือนผ่าน LINE / SMS / email | ไม่มีในระบบเดิม และไม่มีคำขอ |
| AI insights (Gemini) | ถูกถอดจาก UI โดยตั้งใจ (`089b2c6`) → Q-12 |
| ระบบลูกค้า/CRM แยก (ตารางลูกค้า, เบอร์โทร) | ไม่มีหลักฐานว่าต้องการ และปัจจุบันใช้ชื่ออิสระ |
| Inventory / สต็อกน้ำยา | ไม่มีในระบบเดิม |
| ระบบคิว / สถานะงานระหว่างทำ (`job_status`) | column มีอยู่แต่ไม่เคยใช้ (TD-19) และไม่มี UI (D-15) |
| แก้ข้อมูลเก่าที่ได้รับผลจาก ER-01 ย้อนหลังอัตโนมัติ | ต้องตัดสินใจรายกรณี (Q-14) |
| Native app (iOS/Android) | PWA เพียงพอ (F-08) |
| เปลี่ยน hosting หรือ database provider | ใช้ Vercel + Supabase เดิม |
| Upgrade major ที่ไม่จำเป็น (TypeScript 7, ESLint 10, Vitest 5, React minor) | แยกเป็นงาน maintenance หลัง MVP ยกเว้นข้อที่จำเป็นด้าน security |

## 4. Constraints

| ID | Constraint | ที่มา |
|---|---|---|
| C-01 | Production ต้องใช้งานได้ตลอด ห้ามมี downtime ตามแผน | Master prompt |
| C-02 | ห้ามแตะ Production DB, secrets หรือ deployment โดยไม่ได้รับอนุมัติ | Master prompt |
| C-03 | ห้าม destructive schema change ใน release เดียวกับโค้ดที่เปลี่ยน | `rollback-readiness.md` §3.2 |
| C-04 | client เก่า (tablet ที่เปิดค้าง) ต้องทำงานกับ schema ใหม่ได้อย่างน้อย 1 release | NFR-OPS-05, R05 |
| C-05 | `localStorage` keys เดิมต้องอ่านได้ (theme, remembered_email, recentCustomers, last_bill_number) | `production-baseline.md` §5.1 |
| C-06 | ภาษาไทยและปี พ.ศ. | NFR-COMP-02 |
| C-07 | ตัวเลขบน dashboard, history และ Excel ต้องเท่ากับ v1.0.0 ยกเว้นส่วนที่ตั้งใจแก้ | Regression gate |

## 5. Release Strategy ที่เสนอ (รายละเอียดใน Step 06)

ปล่อยทีละ **vertical slice** เพื่อลดภาระการเรียนรู้ของผู้ใช้วัยผู้ใหญ่ (CR-09) และลดขอบเขตการ rollback:

1. **R0 Foundation:** ไม่มีการเปลี่ยน UI (E-01..E-08, A-08) และผู้ใช้ไม่เห็นความต่าง
2. **R1 Data fixes:** ER-01/02/03/05/07 บน UI เดิม ผู้ใช้เห็นแค่ตัวเลขที่ถูกต้องขึ้น
3. **R2 Design system + Add page**
4. **R3 Dashboard + Debt**
5. **R4 History + Edit + Export**
6. **R5 Login, error pages และ cleanup** (F-41/F-42 ถ้าอนุมัติ)

## 6. Assumptions (ต้องยืนยัน ถ้าผิดต้องกลับมาแก้ scope)

| ID | Assumption | ยืนยันโดย |
|---|---|---|
| AS-01 | ผู้ใช้ทุกคนมีสิทธิ์เท่ากันและยังต้องการแบบนั้น | Q-01 |
| AS-02 | ~~มี tablet ประจำร้าน~~ ยืนยันแล้ว: ใช้มือถือ + tablet + PC บน Chrome/Safari | ✅ D-12 |
| AS-03 | ~~รูปแบบ Export ธนาคารต้องคงเดิม~~ ยืนยันแล้ว: ปรับรูปแบบได้ แต่ข้อมูลต้องครบ | ✅ D-16 |
| AS-04 | ข้อมูลเก่าไม่ต้องถูกย้ายไปโครงสร้างใหม่ทันที (อ่านรูปแบบเดิมได้) | Step 05 |
