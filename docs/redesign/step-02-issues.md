# Step 02 — Issue Log

> Step: 02 — Product Requirements & Feature Strategy · วันที่: 2026-10-14
> Branch: `docs/redesign-step-02-requirements` (แตกจาก `docs/redesign-step-01-audit`)
> รูปแบบเดียวกับ `step-01-issues.md` · สถานะ: `RESOLVED` · `UNRESOLVED` · `BLOCKED` · `NEEDS_APPROVAL`

## สรุป

| ID | เรื่อง | Severity | สถานะ |
|---|---|---|---|
| S02-01 | ไม่มีข้อมูลจากผู้ใช้จริงโดยตรง จึงมี business decision ค้าง 20 ข้อ | High | NEEDS_APPROVAL |
| S02-02 | หลักฐานเรื่อง business rule ขัดแย้งกันเอง | Medium | NEEDS_APPROVAL |
| S02-03 | Script ตรวจ ID ข้ามเอกสารรายงาน false positive | Low | RESOLVED |

### Carry-over จาก Step 01 (สถานะไม่เปลี่ยน และไม่ได้สร้างใหม่เพื่อไม่ให้ซ้ำ)

| ID | ผลต่อ Step 02 |
|---|---|
| S01-01 Supabase access (BLOCKED) | ขอบเขตของ E-01 (RLS) และ E-06 (row limit) ยังประเมินขนาดงานไม่ได้ แต่ requirement เขียนแบบไม่ขึ้นกับผลแล้ว (FR-HIST-04, NFR-SEC-01) |
| S01-02 Vercel access (BLOCKED) | NFR-OPS-03 และ AC-36-x ยังยืนยันสภาพปัจจุบันไม่ได้ |
| S01-03 ER-01 hotfix (NEEDS_APPROVAL) | ถูกถามซ้ำเป็น Q-18 เพื่อให้ตัดสินพร้อม product decisions |
| S01-04 Next upgrade (NEEDS_APPROVAL) | เช่นเดียวกัน (Q-18) |
| S01-08 / S01-09 push (NEEDS_APPROVAL) | ตอนนี้มี 3 branches ซ้อนกันที่อยู่แค่ในเครื่อง (`step-00` ← `step-01` ← `step-02`) และความเสี่ยงงานหายเพิ่มขึ้น |

---

## S02-01 — ไม่มีข้อมูลจากผู้ใช้จริงโดยตรง · High · `NEEDS_APPROVAL`

- **ประเภท:** Product input / Requirements
- **ขั้นตอนที่เกิด:** Task 1, 2, 9, 10 (goals, roles, metrics, คำถาม)
- **หลักฐาน:** repo ไม่มี interview, feedback, analytics หรือ issue tracker และ git history (130 commits) บอกได้ว่า "ทำอะไร" แต่ไม่บอกว่า "ทำเพราะผู้ใช้ขอหรือไม่"
- **สาเหตุ (ยืนยันแล้ว):** ข้อมูลเหล่านี้อยู่กับเจ้าของร้านเท่านั้น
- **สิ่งที่ทำแล้ว:**
  - ใช้พฤติกรรมปัจจุบันเป็น requirement โดยปริยาย (D-01)
  - ดึง business rule จาก commit message ที่ระบุเหตุผล (D-02..D-07)
  - ทุกเรื่องที่หลักฐานไม่พอ **ไม่ได้ถูกแต่งเป็น rule** แต่ถูกเขียนเป็นคำถาม Q-01..Q-20 พร้อมค่าเริ่มต้นที่ปลอดภัย
  - ค่าเป้าหมายเชิงตัวเลขที่เสนอทั้งหมดถูกติดเครื่องหมาย † และรวมไว้ใน Q-10
  - Success metrics ทุกตัวระบุว่า baseline ยังไม่รู้ และกำหนดวิธีวัด
- **ผล:** เอกสารครบทั้ง 6 ไฟล์ และ requirement ที่ขึ้นกับคำตอบมีค่าเริ่มต้นจึงไม่ block Step 03 ทั้งหมด
- **ระบบที่กระทบ:** `product-decisions.md`, `product-requirements.md` (Personas §3.1, NFR †, SM-xx), `scope-and-exclusions.md` §6
- **ความเสี่ยงถ้าปล่อยไว้:** Step 03 (UX research และ IA) อาจออกแบบผิดกลุ่ม โดยเฉพาะ Q-03 (อุปกรณ์), Q-04 (ป้ายเงินสดสุทธิ), Q-08 (เคลียร์บางรายการ), Q-16 (เงินสด/โอน) และ Q-17 (รูปแบบ Excel ธนาคาร)
- **สิ่งที่ต้องการจากผู้ใช้:** ตอบ Q-01..Q-20 อย่างน้อยข้อที่ Blocking = Step 03 ได้แก่ **Q-03, Q-04, Q-08, Q-16, Q-17**
- **Prompt สำหรับแก้ภายหลัง:**
  > "คำตอบ product decisions: Q-01: …, Q-03: …, Q-04: …, (ใส่เท่าที่ตอบได้) ให้ย้ายคำตอบเข้า `product-decisions.md` §1 เป็น D-xx และอัปเดต `product-requirements.md`, `feature-prioritization.md`, `acceptance-criteria.md`, `scope-and-exclusions.md` ให้สอดคล้อง โดยห้ามเปลี่ยนข้อที่ไม่ได้ตอบ แล้วปิด S02-01 เฉพาะส่วนที่ตอบแล้ว"

## S02-02 — หลักฐานเรื่อง business rule ขัดแย้งกันเอง · Medium · `NEEDS_APPROVAL`

- **ประเภท:** Requirements / Evidence conflict
- **หลักฐานและการจัดการ:**

| เรื่อง | หลักฐาน A | หลักฐาน B | การจัดการ |
|---|---|---|---|
| รูปแบบเลขที่บิล | comment `generateBill.ts:29` "RMyyMMdd-xxx" | โค้ดจริงสร้างเลข 6 หลักนับต่อเครื่อง (`:31-39`) | ยึดโค้ดจริง (พฤติกรรม production) แล้วถามใน **Q-05** |
| ป้ายกำไรสุทธิ | ป้าย UI "กำไรสุทธิวันนี้" (`NetProfitHero.tsx:9`) | สูตรเป็นเงินสด (`d0d7aff` "net cash profit") และ % เทียบใช้รายรับรวม | ยึดสูตรเดิม (D-02) แล้วถามเรื่องป้ายและฐานเทียบใน **Q-04** |
| รายรับตามลูกค้ารวมค้างชำระหรือไม่ | `31ca865` "only include paid records" | `3a6b79e` กลับมารวม "align with history page" | **ตัดสินแล้ว** D-03 ยึด commit ล่าสุด = รวม |
| แหล่งข้อมูลฝุ่น | README "WAQI API เซ็นเซอร์จริง" | โค้ดใช้ Open-Meteo (`useWeather.ts:264-266`) | ยึดโค้ด และ README ต้องแก้ใน Step 12 (TD-21) |
| route "finance" | `9153fb5` middleware ป้องกัน "finance, export" | ไม่มี route นี้แล้ว (`middleware.ts:5`) | ไม่ใช่ requirement เพราะ route ถูกลบไปแล้ว |

- **สิ่งที่ทำแล้ว:** ใช้กฎ "production behavior wins" และบันทึกทุกความขัดแย้ง
- **ความเสี่ยงถ้าปล่อยไว้:** ต่ำ ระบบคงพฤติกรรมเดิม แต่ป้าย "กำไรสุทธิ" อาจทำให้ผู้ใช้เข้าใจตัวเลขผิดต่อไป
- **สิ่งที่ต้องการจากผู้ใช้:** ตอบ Q-04, Q-05
- **Prompt สำหรับแก้ภายหลัง:** รวมอยู่ใน Prompt ของ S02-01

## S02-03 — Script ตรวจ ID ข้ามเอกสารรายงาน false positive · Low · `RESOLVED`

- **ประเภท:** Tooling / Documentation validation
- **ขั้นตอนที่เกิด:** ตรวจว่าทุก FR, NFR และ Q ที่ถูกอ้างมีนิยามอยู่จริง
- **หลักฐาน:** script รายงาน `FR-SEC-01`, `FR-OPS-01` … เป็น undefined
- **สาเหตุ (ยืนยันแล้ว):** regex `FR-[A-Z]+-\d+` จับ substring ภายใน `NFR-SEC-01`
- **การแก้:** ตรวจ NFR แยกด้วย pattern ของตัวเอง ผลคือ NFR ที่ไม่มีนิยาม = 0, FR จริงทุกตัวที่ถูกอ้างมีนิยาม (52 ตัว), Q ที่ถูกอ้างครบทั้ง 20 ตัว และ story ทั้ง 38 ตัวมี AC อย่างน้อย 1 ข้อ
- **ไฟล์ที่กระทบ:** ไม่มี (script รันใน shell เท่านั้น)
