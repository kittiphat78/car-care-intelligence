# Step 04 — Issue Log

> Step: 04 — UX/UI Design System & Screen Specifications · วันที่: 2026-10-14
> Branch: `docs/redesign-step-04-design-system` (แตกจาก `docs/redesign-step-03-ux` @ `65d0908`)
> สถานะ: `RESOLVED` · `UNRESOLVED` · `BLOCKED` · `NEEDS_APPROVAL`

## สรุป

| ID | เรื่อง | Severity | สถานะ |
|---|---|---|---|
| S04-01 | Library ใหม่ที่เสนอ (ไอคอน, dialog, axe) | Medium | NEEDS_APPROVAL |
| S04-02 | ยังไม่รู้ว่า Sarabun มี tabular figures หรือไม่ | Low | UNRESOLVED |
| S04-03 | Script ตรวจ contrast อยู่นอก repo จึงตรวจซ้ำไม่ได้ | Low | NEEDS_APPROVAL |
| S04-04 | ความเสี่ยงชื่อ variable ชนกันใน Tailwind v4 `@theme` | Low | UNRESOLVED |
| S04-05 | ต้องมี lint rule กันตัวอักษรเล็กกว่า 14px และสี hardcode | Low | NEEDS_APPROVAL |
| S04-06 | ยังไม่มี visual mockup ให้เจ้าของดูก่อน implement | Medium | NEEDS_APPROVAL |
| S04-07 | Palette ร่างแรกมีคู่สีไม่ผ่าน 1 คู่ (dark primary hover) | Low | RESOLVED |
| S04-08 | Python บน Windows เขียน UTF-8 ไม่ได้ในโหมด isolated | Low | RESOLVED |
| S04-09 | Design ↔ flow check พบ UF-AUTH-03 ไม่มีหน้าจอ | Low | RESOLVED |

Carry-over ที่กระทบ Step นี้: **S03-01** (ยังไม่มี baseline Lighthouse/axe จึงเทียบก่อน/หลังไม่ได้) และ **S03-05** (`interactive-widget` ใน viewport meta [I] อาจไม่รองรับบน Safari ต้องทดสอบบนเครื่องจริง)

---

## S04-01 — Library ใหม่ที่เสนอ · Medium · `NEEDS_APPROVAL`
- **รายการ:** `lucide-react` (ไอคอน), headless dialog เช่น Radix (หรือ `<dialog>` native) และ `@axe-core/playwright` (dev)
- **เหตุผล:** ลดโค้ด SVG ซ้ำ (TD-33) และได้ focus trap ที่ทดสอบแล้ว (PP-20)
- **ความเสี่ยง:** เพิ่ม dependency ซึ่งขัดกับ "หลีกเลี่ยง dependency ที่ไม่จำเป็น" ใน master prompt จึงต้องชั่งใน Step 05 (ขนาด bundle, license, การดูแล)
- **ค่าเริ่มต้นถ้าไม่อนุมัติ:** `<dialog>` native + SVG ชุดเดียวที่เขียนเองใน `components/ui/Icon.tsx`
- **Prompt:** > "S04-01: อนุมัติ/ไม่อนุมัติ lucide-react, Radix Dialog, @axe-core/playwright ให้ประเมินใน Step 05 พร้อมขนาด bundle จริง"

## S04-02 — Tabular figures ของ Sarabun · Low · `UNRESOLVED`
- **หลักฐาน:** ไม่ได้ตรวจไฟล์ฟอนต์ (feature `tnum`) ในขั้นนี้
- **ผลถ้าไม่มี:** `font-variant-numeric: tabular-nums` ไม่มีผล ตัวเลขในรายการอาจไม่ตรงหลัก แต่จัดชิดขวาแล้ว จึงยังอ่านได้
- **Prompt:** > "S04-02: ตรวจว่า `public/fonts/Sarabun-Regular.ttf` มี OpenType feature `tnum` (เช่น ด้วย fontTools) และรายงานผล ถ้าไม่มีให้เสนอทางเลือก"

## S04-03 — Script ตรวจ contrast อยู่นอก repo · Low · `NEEDS_APPROVAL`
- **สถานะ:** ผลลัพธ์ (38/38 ผ่าน) ฝังอยู่ใน `design-tokens.md` §3.3 แต่ script อยู่ใน scratchpad ของ session จึงไม่ถูก commit
- **ข้อเสนอ:** Step 07 เพิ่ม `scripts/check-contrast.mjs` ที่อ่านค่าจาก `tokens.css` จริง แล้วรันใน CI เพื่อกัน regression
- **Prompt:** รวมใน Step 07

## S04-04 — ชื่อ variable ชนกันใน Tailwind v4 `@theme` · Low · `UNRESOLVED`
- **รายละเอียด:** `design-to-code-map.md` §1.2 ใช้ชื่อเดียวกันใน tokens และ `@theme inline` ซึ่งอาจเกิด self-reference [I]
- **การจัดการ:** spike เล็กใน Step 07 ก่อน migrate และใช้ prefix `--cc-` ถ้าชน

## S04-05 — Lint rule สำหรับ design system · Low · `NEEDS_APPROVAL`
- **ข้อเสนอ:** ESLint rule หรือ grep ใน CI ที่ห้าม `text-[10-13px]`, `text-xs`, hex ใน className และ `style={{ color/background }}`
- **เหตุผล:** กันหนี้ TD-32/TD-34 กลับมา

## S04-06 — ยังไม่มี visual mockup · Medium · `NEEDS_APPROVAL`
- **สถานะ:** Step 04 ส่งมอบเป็นสเปกข้อความ + tokens + wireframe ข้อความ **ไม่มีภาพ mockup หรือ prototype** และไม่ได้สร้างโดยอ้างว่ามี
- **ความเสี่ยง:** เจ้าของ ("ขอดูง่าย แต่มือโปร") ยังไม่เห็นหน้าตาจริงก่อน implement จึงอาจต้องแก้หลัง R2
- **ข้อเสนอ:** (a) ทำหน้า **style preview** แบบ static (HTML เดียว) แสดง tokens + component หลัก + หน้าภาพรวมตัวอย่างด้วยข้อมูลสมมติ ทั้ง 2 theme ให้เจ้าของดูบนมือถือ/tablet/PC ก่อน Step 07 โดยไม่แตะแอปจริง หรือ (b) ข้ามไปทำใน R2 บน Preview (staging)
- **Prompt:** > "S04-06: ทำ style preview HTML จาก design-tokens.md และ component-specifications.md (ข้อมูลสมมติ, 2 theme, หน้า ภาพรวม/บันทึก/ค้างชำระ) เพื่อให้เจ้าของรีวิว ห้ามแก้โค้ดแอป"

## S04-07 — Palette ร่างแรกไม่ผ่าน 1 คู่ · Low · `RESOLVED`
- **หลักฐาน:** `on-primary` บน `primary-hover` (dark, #3B74F0) = 4.25:1 < 4.5
- **การแก้:** เปลี่ยน dark `primary-hover` เป็น #1D4ED8 (hover เข้มขึ้นแทนสว่างขึ้น) แล้วตรวจซ้ำได้ 6.70:1 ทำให้ทุกคู่ผ่าน 38/38

## S04-08 — Python เขียน UTF-8 ไม่ได้ · Low · `RESOLVED`
- **หลักฐาน:** `UnicodeEncodeError: 'charmap' codec` เมื่อพิมพ์หัวตารางภาษาไทย และ `PYTHONIOENCODING` ไม่มีผลเพราะรันด้วย `-I` (isolated)
- **การแก้:** รันด้วย `python -I -X utf8`

## S04-09 — UF-AUTH-03 ไม่มีหน้าจอ · Low · `RESOLVED`
- **พบจาก:** consistency check (`screen-specifications.md` §15)
- **การแก้:** เพิ่ม §16 Dialog เซสชันหมดอายุ ผลคือ 18/18 flow มีหน้าจอรองรับ
