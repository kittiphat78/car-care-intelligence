# Feature Prioritization — Step 02

> วันที่: 2026-10-14 · อ้างอิง `feature-inventory.md` (F-01..F-42) และ `product-requirements.md`
> ป้ายกำกับ: **[V]** Verified · **[I]** Inferred · **[U]** Unknown

## 1. นิยาม

**สถานะ**

| สถานะ | ความหมาย |
|---|---|
| **Keep** | คงพฤติกรรมเดิม และปรับแค่หน้าตาตาม design system ใหม่ |
| **Improve** | คงเป้าหมายเดิม แต่แก้บั๊ก, UX หรือความถูกต้อง |
| **Replace** | คงเป้าหมายเดิม แต่เปลี่ยนวิธีทำ |
| **Remove** | เอาออก (ต้องมีหลักฐานว่าไม่ได้ใช้ และต้องได้รับอนุมัติ) |
| **Add** | ความสามารถใหม่ที่แก้ปัญหาที่พบจริง (UP-xx) |

**Priority**

| Priority | เกณฑ์ |
|---|---|
| **P0 Critical** | ต้องมีใน MVP: CUJ หลักต้องทำงานได้, ข้อมูลต้องถูกต้อง หรือเป็นความเสี่ยงด้านความปลอดภัย |
| **P1 Important** | ควรมีใน MVP ถ้าเวลาพอ หรือ release ถัดไปทันที เพราะผลต่อ UX หรือการดูแลระบบสูง |
| **P2 Later** | มีประโยชน์แต่รอได้ และไม่มีความเสี่ยงต่อข้อมูล |

**หลักการ:** ไม่มีฟีเจอร์เดิมตัวใดถูกลบเพราะไม่เข้ากับ UI ใหม่ การลบมีแค่ 2 กรณีที่มีหลักฐานว่าไม่มีผู้ใช้เรียก (F-41, F-42) และยังต้องได้รับอนุมัติ

## 2. สถานะของฟีเจอร์เดิมทั้งหมด (42 รายการ)

| F | Feature | สถานะ | Pri | เหตุผล | อ้างอิง |
|---|---|---|---|---|---|
| F-01 | Login email/password | Keep | P0 | ทางเข้าเดียวของระบบ | FR-AUTH-01 |
| F-02 | จดจำอีเมล | Keep | P1 | ลดการพิมพ์ (G1) | FR-AUTH-02 |
| F-03 | Route guard | Improve | P0 | ต้อง upgrade Next (ER-09) และเปลี่ยน middleware → proxy (TD-27) โดยพฤติกรรมเท่าเดิม | FR-AUTH-03 |
| F-04 | Logout | Keep | P1 | — | FR-AUTH-04 |
| F-05 | Bottom navigation 3 แท็บ | Keep | P0 | IA เดิมตรงกับ 3 งานหลัก แต่ Step 03 อาจปรับ | — |
| F-06 | Dark/Light theme | Keep | P2 | มีอยู่และไม่มีปัญหา ส่วนค่า default → Q-11 | FR-DASH-10 |
| F-07 | Kiosk mode (reload → หน้าแรก) | **Replace** | P1 | เป้าหมายเดิมคือกัน pull-to-refresh แต่วิธีปัจจุบันทำฟอร์มหาย (ER-18) จึงเปลี่ยนเป็นกัน pull-to-refresh ตรง ๆ + เก็บ draft | FR-PLAT-02, FR-REC-09 |
| F-08 | PWA manifest/shortcuts | Keep | P1 | — | FR-PLAT-01 |
| F-09 | Toast | Improve | P1 | ไม่แสดง error ภายใน (ER-17) | FR-PLAT-03 |
| F-10 | Error boundary / 404 | Keep | P1 | — | FR-PLAT-04 |
| F-11 | ทักทาย + วันที่ไทย | Keep | P2 | — | — |
| F-12 | สภาพอากาศ + AQI | Improve | P2 | ป้ายพื้นที่ hardcode (TD-23) และส่วนอื่นคงเดิม | FR-DASH-08 |
| F-13 | เงินสดสุทธิ + % เทียบเมื่อวาน | Improve | P0 | สูตรคงเดิม และเปลี่ยนป้ายเป็น "เงินสดสุทธิวันนี้" พร้อมคำอธิบายสูตร (ER-29, D-13) | FR-DASH-01/02 |
| F-14 | สถิติวันนี้ | Keep | P0 | — | FR-DASH-03 |
| F-15 | กราฟ 7/30 วัน | Keep | P1 | — | FR-DASH-04 |
| F-16 | รายรับตามลูกค้า | Improve | P1 | ยอดรายปีอาจถูกตัด (ER-02) ส่วนกติกาเดิมคงไว้ | FR-DASH-05 |
| F-17 | รายการวันนี้ | Improve | P0 | การ์ดกดไม่ได้ (ER-21) | FR-DASH-06 |
| F-18 | Realtime | Improve | P1 | refetch ทั้งก้อนทุก event (ER-31) | FR-DASH-07, NFR-PERF-03 |
| F-19 | แจ้งยอดค้างชำระ | Keep | P0 | — | FR-DASH-09 |
| F-20 | สมุดทวงหนี้ | Keep | P0 | หัวใจของ G3 | FR-DEBT-01/02 |
| F-21 | เคลียร์ยอด | Improve | P0 | บั๊ก NULL (ER-03), `window.confirm` (ER-25) | FR-DEBT-03/04 |
| F-22 | บิลเงินสด PDF | Improve | P0 | ตัวบิลคงไว้ แต่เลขบิลซ้ำข้ามเครื่อง (ER-34) → Q-05 | FR-DEBT-06/07 |
| F-23 | สลับรายรับ/รายจ่าย | Keep | P0 | — | — |
| F-24 | เลือกวันที่ | Improve | P0 | ใช้คีย์บอร์ดไม่ได้ (ER-22) | FR-REC-04 |
| F-25 | บันทึกรายรับ | Improve | P0 | sanitize แปลงข้อความ (ER-08) และ validation ต้องใช้ร่วมกับ Edit (TD-09) | FR-REC-01/02/11 |
| F-26 | `seq_number` | Improve | P1 | ซ้ำได้ (ER-04) → Q-06 | FR-REC-10 |
| F-27 | ลูกค้าประจำ ครั้งที่ N | Keep | P1 | — | FR-REC-06 |
| F-28 | ลูกค้าล่าสุด | Keep | P1 | เก็บต่อเครื่องเหมือนเดิม | FR-REC-07 |
| F-29 | ค้นหายี่ห้อ | Keep | P1 | — | FR-REC-01 |
| F-30 | บันทึกรายจ่าย + ปุ่มลัด | Keep | P0 | — | FR-REC-03 |
| F-31 | บันทึกแล้วทำต่อ | Keep | P0 | — | FR-REC-05/08 |
| F-32 | เลือกเดือน/ปี | Improve | P0 | ข้อมูลอาจถูกตัด (ER-02) | FR-HIST-01/04 |
| F-33 | แท็บรายรับ/รายจ่าย | Keep | P0 | — | FR-HIST-01 |
| F-34 | Summary | Keep | P0 | — | FR-HIST-02 |
| F-35 | ค้นหาและกรอง | Improve | P0 | กรองวันที่ตัด 00:00–06:59 (ER-10) | FR-HIST-03/09 |
| F-36 | รายการจัดกลุ่มตามวัน | Keep | P0 | — | — |
| F-37 | แก้ไขรายการ | Improve | P0 | วันที่เลื่อน (ER-01), ไม่มี validation (ER-05) | FR-HIST-05/06 |
| F-38 | ลบรายการ | Improve | P0 | ลบถาวรและกู้ไม่ได้ (ER-06) → Q-02 | FR-HIST-07 |
| F-39 | Audit trail ล่าสุด | Improve | P1 | ค่าปลอมได้เพราะมาจาก client (ER-14) | FR-HIST-08, NFR-SEC-03 |
| F-40 | Export Excel | Improve | P0 | ไฟล์อาจไม่ครบ (ER-02, ER-07) และเป็น backup ระยะยาว (`c6b8ad4`) | FR-EXP-01..03 |
| F-41 | `/api/insights` (Gemini) | **Remove** (รออนุมัติ) | P1 | UI ถูกถอดโดยตั้งใจใน `089b2c6` และไม่มี caller จึงเป็น attack surface และค่าใช้จ่ายโดยไม่มีประโยชน์ → Q-12 | TD-16 |
| F-42 | `/api/export-excel` (stub) | **Remove** (รออนุมัติ) | P1 | เป็น stub คืนข้อมูลจำลอง ไม่มี caller และ export จริงทำฝั่ง client | TD-17 |

**สรุป:** Keep 21 · Improve 18 · Replace 1 · Remove 2

## 3. ความสามารถใหม่ (Add)

แต่ละรายการมาจากปัญหาที่ยืนยันแล้ว ไม่ได้มาจากความชอบด้าน UI

| A | ความสามารถ | แก้ปัญหา | Pri | เงื่อนไข |
|---|---|---|---|---|
| A-01 | เก็บ draft ของฟอร์มบันทึก (ไม่หายเมื่อ reload) | UP-07 | P1 | — |
| A-02 | แก้ไขรายการจากหน้า dashboard | UP-08 | P0 | ใช้ EditModal ชุดเดียวกับ History |
| A-03 | Dialog ยืนยันการเคลียร์ยอดที่แสดงจำนวนรายการกับยอด | ER-25 | P1 | — |
| A-04 | กู้คืนรายการที่ลบ (soft delete) หรือ undo ชั่วคราว | UP-09 | P1 | **ขึ้นกับ Q-02** และเป็น schema change |
| A-05 | ประวัติการแก้ไข (audit log) | UP-09 | P2 | **ขึ้นกับ Q-13** |
| A-06 | เลขบิลแบบรวมศูนย์ไม่ซ้ำ | UP-05 | P1 | **ขึ้นกับ Q-05** |
| A-07 | ตั้งค่าข้อมูลร้านสำหรับบิล | NFR-MAINT-03 | P2 | **ขึ้นกับ Q-09** |
| A-08 | ป้ายบอก environment ที่ไม่ใช่ production | R01 (Step 00) | P0 | แสดงเฉพาะ Preview/local |

## 4. งานที่ไม่ใช่ feature แต่เป็น P0 ของ MVP

| ID | งาน | อ้างอิง |
|---|---|---|
| E-01 | ยืนยันและแก้ RLS / ปิด public sign-up | ER-12, ER-13, S01-01 |
| E-02 | Staging Supabase + แยก env | Step 00 R01, NFR-OPS-03 |
| E-03 | Upgrade Next.js 16.4.x | ER-09, S01-04 |
| E-04 | แก้ ER-01 (วันที่เลื่อน) | S01-03 |
| E-05 | CI pipeline | ER-30, NFR-OPS-01 |
| E-06 | Pagination หรือ aggregation เพื่อไม่ให้ข้อมูลถูกตัด | ER-02 |
| E-07 | Baseline migration (schema-only dump) | Step 00 R08 |
| E-08 | Regression test ของ CUJ-1..8 ก่อนเปลี่ยน UI | SM-04 |

## 5. Dependencies

```
E-02 staging ──┬──► E-07 baseline migration ──► E-01 RLS fix ──► NFR-SEC-03/05 (DB-side audit + constraints)
               │                                            └──► A-04 soft delete, A-06 bill number, F-26 seq
               └──► ทุกงานที่ต้องทดสอบการเขียนข้อมูล (F-21, F-37, F-38, F-40 …)
E-05 CI ──► ทุก PR หลังจากนี้
E-03 Next upgrade ──► F-03 middleware→proxy
E-08 regression tests ──► งาน UI redesign ทุกหน้า (Step 07)
D-13 ──► ป้ายและข้อความบน dashboard (Step 03/04)
Q-01 ──► permission model (Step 05)
D-12 ──► NFR-PERF/COMP targets, responsive breakpoints มือถือ/tablet/PC (Step 03)
Step 03 IA ──► F-05 nav, ตำแหน่ง logout, A-02
```

## 6. Change Risks (เฉพาะการเปลี่ยนแปลงใน Step 02)

| ID | ความเสี่ยงจากการเปลี่ยน | ผลต่อผู้ใช้ | การลดความเสี่ยง |
|---|---|---|---|
| CR-01 | แก้ ER-01 แล้ว **ข้อมูลที่เคยเลื่อนไปแล้วไม่ถูกแก้ย้อนหลัง** | ยอดเก่าอาจผิดต่อไป | วัดขอบเขตด้วย SQL U-7 ก่อน แล้วถามเจ้าของ (Q-14) และห้าม backfill อัตโนมัติ |
| CR-02 | แก้ ER-03 ให้ครอบคลุม NULL ทำให้เคลียร์รายการมากกว่าที่เคย | ยอดหนี้ลดลงทันทีเมื่อกด | Dialog แสดงจำนวนรายการที่จะเคลียร์ (A-03) + test บน staging |
| CR-03 | ทำให้ query ไม่ถูกตัด (ER-02) ทำให้ **ยอดรายปีเปลี่ยน** จากที่ผู้ใช้เคยเห็น | ผู้ใช้อาจคิดว่าระบบผิด | สื่อสารก่อน release และเทียบกับ SQL count |
| CR-04 | เปลี่ยน kiosk mode (F-07) | Tablet ที่พึ่งพฤติกรรมเดิมอาจแสดงหน้าอื่นหลัง reload | ทดสอบบนมือถือ, tablet และ PC ทั้ง Chrome และ Safari (D-12) |
| CR-05 | ลบ `/api/insights` | ไม่มี (ไม่มี caller) แต่ถ้าเจ้าของอยากเอากลับมา ต้องเขียนใหม่ | git history เก็บโค้ดไว้ และต้องอนุมัติ Q-12 |
| CR-06 | เลขบิลรวมศูนย์ (A-06) | เลขบิลเปลี่ยนรูปแบบหรือเริ่มนับใหม่ | ต่อเลขจากค่าสูงสุดเดิม (Q-05) |
| CR-07 | Validation ฝั่ง DB (NFR-SEC-05) | **ข้อมูลเก่าที่ผิดกติกา** อาจทำให้ migration fail หรือแก้ไขรายการเก่าไม่ได้ | ใช้ constraint แบบ `NOT VALID` ก่อน แล้วตรวจข้อมูลเก่าบน staging |
| CR-08 | เปลี่ยนการเก็บ `services[]` (TD-06) | รายการเก่าแสดงผิด | NFR-DATA-04, expand/contract |
| CR-09 | ปรับ UI ทั้งหมดพร้อมกัน | ผู้ใช้วัยผู้ใหญ่ต้องเรียนใหม่ | Release ทีละหน้าและคงตำแหน่งปุ่มหลัก (ดู `scope-and-exclusions.md` §4) |
