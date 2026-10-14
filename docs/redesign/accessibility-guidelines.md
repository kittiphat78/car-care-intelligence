# Accessibility Guidelines — Step 04

> วันที่: 2026-10-14 · เป้าหมาย: **WCAG 2.2 AA** (NFR-A11Y-01) + ข้อกำหนดเพิ่มสำหรับผู้ใช้วัยผู้ใหญ่ (NFR-A11Y-03/04)
> ส่วนนี้เป็นกติกาบังคับสำหรับ implement และ review (Step 07–09) โดยรายละเอียดพฤติกรรมอยู่ใน `interaction-specifications.md` §7

## 1. Checklist ตามหลัก WCAG ที่เกี่ยวข้องกับระบบนี้

| SC | หัวข้อ | การปฏิบัติในระบบ | ปัญหาเดิมที่แก้ |
|---|---|---|---|
| 1.1.1 | Non-text content | ไอคอนสื่อความหมายมีข้อความ, กราฟมีสรุปข้อความ + ตาราง และ emoji ตกแต่ง `aria-hidden` | TD-33, PP-25 |
| 1.3.1 | Info & relationships | label ผูก input, `fieldset`/`legend` สำหรับกลุ่มตัวเลือก, `<table>` จริงบน Expanded และ heading ตามลำดับ | ER-24, ไม่มี `h1` |
| 1.3.4 | Orientation | ใช้ได้ทั้ง 2 แนว | — |
| 1.3.5 | Input purpose | `autocomplete` บน login | — |
| 1.4.1 | Use of color | สถานะมีข้อความหรือไอคอนเสมอ (DP-4) และ chip ที่เลือกมี ✓ | PP-25 |
| 1.4.3 | Contrast (text) | 4.5:1 ทุกคู่ (ตรวจแล้ว 38/38 ใน `design-tokens.md` §3.3) | PP-12 |
| 1.4.4 | Resize text | ใช้ rem และซูม 200% ได้ | PP-11 |
| 1.4.10 | Reflow | 320px ไม่มี scroll แนวนอน (ยกเว้น DataTable ซึ่งมีบน Expanded เท่านั้น) | — |
| 1.4.11 | Non-text contrast | ขอบ input `border-strong` ≥ 3:1 และ focus ring ≥ 3:1 | ขอบเดิม 8% opacity |
| 1.4.12 | Text spacing | ไม่ fix ความสูงของกล่องข้อความ (เลิก `h-[7.5rem]` ใน StatCard) | — |
| 1.4.13 | Content on hover/focus | popover อากาศปิดด้วย Esc และไม่หายเมื่อเลื่อนเมาส์เข้า | — |
| 2.1.1 | Keyboard | ทุก control เป็น element ที่ focus ได้จริง (`button`, `a`, `input`) ไม่ใช่ `div role="button"` | ER-21, ER-22, ER-27, PP-28 |
| 2.1.2 | No keyboard trap | focus trap เฉพาะใน dialog และ Esc ออกได้ (ยกเว้น §16 session ที่มีปุ่มเดียว) | — |
| 2.2.1 | Timing adjustable | toast success 5 วินาทีหยุดเมื่อ focus/hover และ toast error ค้างจนปิด | PP-19 |
| 2.3.1 / 2.3.3 | Flashes / Animation | ไม่มีกะพริบต่อเนื่อง และเคารพ reduced motion | `pulse-urgent` |
| 2.4.1 | Bypass blocks | skip link | — |
| 2.4.2 | Page titled | `<title>` ต่อหน้า (sitemap §2) | ปัจจุบันชื่อเดียวทุกหน้า |
| 2.4.3 | Focus order | ตามลำดับการมองเห็น และ dialog คืน focus | — |
| 2.4.6 | Headings & labels | ป้ายบอกหน้าที่ชัด ("เงินสดสุทธิวันนี้") | PP-14 |
| 2.4.7 / 2.4.11 | Focus visible / not obscured | ring 3px และ `scroll-padding-bottom` เท่าความสูง nav + ActionBar | — |
| 2.5.3 | Label in name | `aria-label` ขึ้นต้นด้วยข้อความที่มองเห็น | — |
| 2.5.7 | Dragging | ไม่มี action ที่ต้องลาก (เลิก drag-scroll ยี่ห้อ) | `EditModal.tsx:204` |
| 2.5.8 | Target size | ≥ 44px (เกิน AA ที่กำหนด 24px) | — |
| 3.1.1 | Language | `lang="th"` | ✓ คงเดิม |
| 3.2.2 | On input | เลือก chip ไม่ submit และเปลี่ยนเดือนโหลดข้อมูลแต่ไม่ย้ายหน้า | — |
| 3.3.1 / 3.3.3 | Error identification / suggestion | ข้อความใต้ช่องบอกวิธีแก้ + summary | PP-08 |
| 3.3.4 | Error prevention (financial) | ยืนยันก่อนลบหรือเคลียร์ยอด พร้อมแสดงขอบเขต | PP-15 |
| 3.3.7 | Redundant entry | draft + "บันทึกแล้วทำต่อ" คงค่า | PP-03 |
| 3.3.8 | Accessible authentication | ไม่มี CAPTCHA, ไม่บล็อกการวาง (paste) รหัสผ่าน และรองรับ password manager | — |
| 4.1.2 | Name, role, value | ARIA ตาม component spec (`aria-pressed`, `aria-checked`, `aria-expanded`, `aria-current`) | — |
| 4.1.3 | Status messages | toast/banner ผ่าน live region ที่ถูก role | — |

## 2. Typography & Readability (เกินกว่า AA สำหรับกลุ่มผู้ใช้)

- เนื้อหา ≥ 16px และข้อความเล็กสุด 14px (ไม่มี 10–12px)
- น้ำหนัก ≥ 400 สำหรับข้อความทั่วไป และไม่ใช้ 300 หรือต่ำกว่า
- ความยาวบรรทัดไม่เกิน ~70 ตัวอักษรบน Expanded
- ไม่ใช้ตัวเอียง (italic) กับภาษาไทย (เดิมใช้กับหมายเหตุใน `RecordCard.tsx:53`)
- ตัวเลขเงินมี ฿ และคั่นหลักพันเสมอ

## 3. Screen Reader

| องค์ประกอบ | สิ่งที่อ่าน |
|---|---|
| RecordRow | "ล้างรถ กข 1234 TOYOTA ฿150 ชำระแล้ว 09:40 น. ปุ่ม แก้ไข" |
| MoneyHero | "เงินสดสุทธิวันนี้ 3,450 บาท" แล้ว "รายรับรวม 4,200 บาท เพิ่มขึ้น 12 เปอร์เซ็นต์จากเมื่อวาน" |
| Badge ค้างชำระบน nav | "ค้างชำระ 3 ราย" |
| Chip ที่เลือก | "รถเก๋ง ปุ่มตัวเลือก เลือกแล้ว 1 จาก 6" |
| Toast | "บันทึก กข 1234 150 บาทแล้ว" (status) |
| Loading | "กำลังโหลด…" ครั้งเดียวต่อส่วน |
| Realtime | ไม่ประกาศ (กันรบกวน) แต่สถานะการเชื่อมต่อหลุดจะประกาศ |

ทดสอบด้วย VoiceOver (iOS/macOS) และ TalkBack (Android) ในงาน CUJ-2, CUJ-3, CUJ-6

## 4. Focus Management

| เหตุการณ์ | Focus ไปที่ |
|---|---|
| เปิดหน้าใหม่ | `h1` ของหน้า (`tabindex="-1"`) |
| เปิด dialog | หัวข้อ dialog หรือปุ่มปลอดภัย (IS §3.2) |
| ปิด dialog | element ที่เปิด dialog |
| Validation ไม่ผ่าน | FormErrorSummary |
| "บันทึกแล้วทำต่อ" สำเร็จ | PlateField / MoneyField (รายจ่าย) |
| ลบรายการสำเร็จ | รายการถัดไปในลิสต์ หรือหัวรายการถ้าไม่มี |
| เคลียร์ยอดสำเร็จ | การ์ดลูกค้าถัดไป หรือหัวหน้าถ้าไม่มี |

## 5. Forced Colors / High Contrast
- ใช้ `outline` (ไม่ใช่แค่ `box-shadow`) สำหรับ focus เพื่อให้เห็นใน Windows High Contrast
- สถานะ selected ใช้ทั้งขอบและไอคอน ✓ จึงไม่หายในโหมด forced-colors
- ทดสอบด้วย `forced-colors: active` บน Edge/Chrome (Step 09)

## 6. Reduced Motion

| Animation | ปกติ | `prefers-reduced-motion: reduce` |
|---|---|---|
| Dialog เข้า/ออก | slide/scale + fade 220ms | fade 150ms |
| Sheet | slide-up 220ms | fade 150ms |
| Toast | slide + fade | fade |
| ปุ่มกด (pressed) | scale 0.98 | ไม่มี scale |
| Skeleton shimmer | 1.5s loop | พื้นนิ่ง |
| Highlight รายการใหม่ | fade พื้น 2s | พื้นค้าง 2s แล้วหาย |
| Spinner | หมุน | หมุนช้าลง (ยังต้องสื่อว่ากำลังทำงาน) + ข้อความ "กำลัง…" |
| Scroll ไป error | smooth | instant |
| ลบออกทั้งหมด | `fade-up`, `delay-*`, `bounce-in`, `float-soft`, `pulse-urgent`, `slide-up-spring` เดิม | — |

กฎ: animation ทั้งหมดอยู่ใน tokens (`--duration-*`) และ global rule ตั้งค่าเป็น 0 เมื่อ reduce จึงไม่ต้องเขียนเงื่อนไขในแต่ละ component

## 7. Testing Gate (Step 08/09)

| เครื่องมือ | เกณฑ์ |
|---|---|
| axe-core (ทุกหน้า + ทุก dialog, 2 theme) | serious/critical = 0 (AC-34-1) |
| Lighthouse Accessibility | ≥ 95 † (SM-05) |
| Keyboard-only CUJ-2, CUJ-3, CUJ-6 | ทำได้ครบ (AC-34-2) |
| VoiceOver + TalkBack | CUJ-2, CUJ-3 |
| Zoom 200% + text spacing bookmarklet | ไม่มีเนื้อหาถูกตัด |
| Reduced motion | ตรวจตาราง §6 |
