# Design Tokens — Step 04

> วันที่: 2026-10-14 · ค่าทุกตัวในเอกสารนี้คือ **source of truth** สำหรับ implement (Step 07)
> รูปแบบ: CSS custom properties บน `:root` (theme มืดเป็นค่าเริ่มต้น) และ `[data-theme="light"]` แล้ว map เข้า Tailwind v4 ผ่าน `@theme` (`design-to-code-map.md` §2)
> Contrast ทุกคู่ใน §3.3 **คำนวณจริง** ด้วยสูตร WCAG 2.x (script ใน scratchpad ของ session นี้ ไม่ได้ commit เข้า repo → S04-03)

## 1. โครงสร้าง Token 3 ชั้น

| ชั้น | ตัวอย่าง | ใช้ที่ไหน | กฎ |
|---|---|---|---|
| **Primitive** | `--blue-700: #1D4ED8` | นิยามใน tokens เท่านั้น | **ห้าม** อ้างจาก component |
| **Semantic** | `--color-action-primary` | component และหน้าจอทั้งหมด | ชื่อบอก "หน้าที่" ไม่ใช่ "สี" |
| **Component** | `--button-height-lg` | เฉพาะ component นั้น | สร้างเมื่อจำเป็นเท่านั้น |

**Naming:** `--{category}-{role}-{variant?}-{state?}` เช่น `--color-text-secondary`, `--color-action-primary-hover`, `--space-4`, `--radius-md`

## 2. Primitive Palette

| Neutral | Hex | Blue | Hex | Green | Hex | Red | Hex |
|---|---|---|---|---|---|---|---|
| `--neutral-0` | #FFFFFF | `--blue-100` | #E3EBFD | `--green-100` | #DDF5EA | `--red-100` | #FDE7E7 |
| `--neutral-25` | #F4F6F9 | `--blue-300` | #8AB4FF | `--green-300` | #4ADE9B | `--red-300` | #FF8A8A |
| `--neutral-50` | #F1F5F9 | `--blue-600` | #2563EB | `--green-700` | #047857 | `--red-700` | #B91C1C |
| `--neutral-75` | #EDF0F4 | `--blue-700` | #1D4ED8 | `--green-800` | #05603F | `--red-750` | #C62828 |
| `--neutral-100` | #D9DFE7 | `--blue-800` | #1E40AF | `--green-950` | #0E2E24 | `--red-800` | #991B1B |
| `--neutral-200` | #CBD5E1 | `--blue-950` | #16274A | | | `--red-950` | #3A1517 |
| `--neutral-300` | #A3B0C2 | | | | | | |
| `--neutral-400` | #7B8798 | **Amber** | | **Sky** | | **Violet** | |
| `--neutral-450` | #6B7A90 | `--amber-100` | #FEF0D2 | `--sky-100` | #E0F0FA | `--violet-100` | #EFE7FD |
| `--neutral-500` | #5A6678 | `--amber-300` | #FBBF4D | `--sky-300` | #4FC3F7 | `--violet-300` | #C4A8FF |
| `--neutral-600` | #3D4A5C | `--amber-700` | #B45309 | `--sky-700` | #0369A1 | `--violet-700` | #6D28D9 |
| `--neutral-700` | #2A3647 | `--amber-800` | #8A3B05 | `--sky-950` | #0E2A3A | `--violet-950` | #26193F |
| `--neutral-800` | #1B2533 | `--amber-950` | #3A2610 | | | | |
| `--neutral-850` | #131B26 | | | | | | |
| `--neutral-900` | #0F1A2A | | | | | | |
| `--neutral-950` | #0B111A | | | | | | |

## 3. Color — Semantic Tokens

### 3.1 Surface, Text, Border, Action

| Token | Dark (default) | Light | ใช้กับ |
|---|---|---|---|
| `--color-bg` | #0B111A | #F4F6F9 | พื้นหลังแอป |
| `--color-surface` | #131B26 | #FFFFFF | การ์ด, dialog, nav |
| `--color-surface-2` | #1B2533 | #EDF0F4 | พื้นรอง (แถวสลับ, input disabled, กลุ่มรายการ) |
| `--color-surface-inverse` | #F1F5F9 | #0F1A2A | tooltip, toast |
| `--color-overlay` | rgb(0 0 0 / 0.6) | rgb(15 26 42 / 0.5) | ฉากหลัง dialog |
| `--color-text` | #F1F5F9 | #0F1A2A | ข้อความหลัก, ตัวเลขเงิน |
| `--color-text-secondary` | #CBD5E1 | #3D4A5C | ข้อความรอง, label |
| `--color-text-tertiary` | #A3B0C2 | #5A6678 | เวลา, หมายเหตุ, placeholder |
| `--color-text-inverse` | #0B111A | #FFFFFF | ข้อความบน surface-inverse |
| `--color-border` | #2A3647 | #D9DFE7 | เส้นแบ่ง, ขอบการ์ด (ตกแต่ง) |
| `--color-border-strong` | #6B7A90 | #7B8798 | **ขอบ input, checkbox, chip ที่ไม่ได้เลือก** (≥ 3:1) |
| `--color-action-primary` | #2563EB | #1D4ED8 | ปุ่มหลัก, nav active, ปุ่มบันทึก |
| `--color-action-primary-hover` | #1D4ED8 | #1E40AF | hover / pressed |
| `--color-on-action-primary` | #FFFFFF | #FFFFFF | ข้อความบนปุ่มหลัก |
| `--color-action-primary-subtle` | #16274A | #E3EBFD | chip ที่เลือก, nav active background |
| `--color-text-link` | #8AB4FF | #1D4ED8 | ลิงก์, ข้อความ action รอง |
| `--color-focus-ring` | #8AB4FF | #1D4ED8 | focus outline |

### 3.2 Status & Domain

| Token | Dark | Light | ความหมาย |
|---|---|---|---|
| `--color-success` | #047857 | #047857 | พื้นปุ่ม "เคลียร์ยอด", ไอคอนสำเร็จ |
| `--color-success-subtle` | #0E2E24 | #DDF5EA | พื้น badge "ชำระแล้ว", toast สำเร็จ |
| `--color-success-text` | #4ADE9B | #05603F | ข้อความสถานะสำเร็จ |
| `--color-danger` | #C62828 | #B91C1C | ปุ่มลบ, ปุ่มบันทึกรายจ่าย |
| `--color-danger-subtle` | #3A1517 | #FDE7E7 | banner error |
| `--color-danger-text` | #FF8A8A | #991B1B | ข้อความ error, field error |
| `--color-warning` | #B45309 | #B45309 | ไอคอนเตือน (พื้นทึบ) |
| `--color-warning-subtle` | #3A2610 | #FEF0D2 | การ์ดค้างชำระ, banner เตือน |
| `--color-warning-text` | #FBBF4D | #8A3B05 | ข้อความค้างชำระ, ป้ายวันค้าง |
| `--color-info-subtle` | #16274A | #E3EBFD | banner ข้อมูล |
| `--color-info-text` | #8AB4FF | #1E40AF | ข้อความข้อมูล |
| `--color-income` | #4ADE9B | #047857 | ยอดรายรับ (ตัวเลข) |
| `--color-expense` | #FF8A8A | #B91C1C | ยอดรายจ่าย (ตัวเลข) |
| `--color-unpaid` | #FBBF4D | #B45309 | ยอดค้างชำระ (ตัวเลข) |
| `--color-job-wash` | #4FC3F7 | #0369A1 | ล้างรถ (แถบ, ไอคอน, ข้อความ) |
| `--color-job-wash-subtle` | #0E2A3A | #E0F0FA | พื้น badge ล้างรถ |
| `--color-job-polish` | #C4A8FF | #6D28D9 | ขัดสี |
| `--color-job-polish-subtle` | #26193F | #EFE7FD | พื้น badge ขัดสี |
| `--color-env-banner` | #B45309 | #B45309 | แถบ environment ที่ไม่ใช่ production (ข้อความ `--color-on-action-primary`) |

**ระดับความเร่งด่วนของหนี้ (D-05):** ใช้ **ข้อความ + ไอคอน** เป็นหลัก ส่วนสีมีแค่ 2 ระดับ: `< 14 วัน` = `warning-text` และ `≥ 14 วัน` ("เร่งด่วน") = `danger-text` ไม่ใช้ไล่ 4 สีแบบเดิม (เหลือง/ส้ม/แดง/เทา) ที่แยกด้วยตาได้ยาก

**กราฟ:** รายรับ = `--color-income`, รายจ่าย = `--color-expense`, เส้นกริด = `--color-border` และ label แกน = `--color-text-tertiary`

### 3.3 Contrast verification (คำนวณแล้ว)

| Foreground | Background | ใช้กับ | เกณฑ์ | Light | Dark |
|---|---|---|---|---|---|
| `text` | `bg` | body text | 4.5:1 | 16.14 ✅ | 17.28 ✅ |
| `text` | `surface` | body text | 4.5:1 | 17.48 ✅ | 15.81 ✅ |
| `text` | `surface-2` | body text | 4.5:1 | 15.29 ✅ | 14.10 ✅ |
| `text-secondary` | `surface` | secondary text | 4.5:1 | 9.00 ✅ | 11.67 ✅ |
| `text-secondary` | `bg` | secondary text | 4.5:1 | 8.32 ✅ | 12.75 ✅ |
| `text-tertiary` | `surface` | tertiary text | 4.5:1 | 5.82 ✅ | 7.87 ✅ |
| `text-tertiary` | `bg` | tertiary text | 4.5:1 | 5.38 ✅ | 8.61 ✅ |
| `text-tertiary` | `surface-2` | tertiary text | 4.5:1 | 5.09 ✅ | 7.02 ✅ |
| `text-inverse` | `surface-inverse` | inverse | 4.5:1 | 17.48 ✅ | 17.28 ✅ |
| `on-primary` | `primary` | primary button | 4.5:1 | 6.70 ✅ | 5.17 ✅ |
| `on-primary` | `primary-hover` | primary hover | 4.5:1 | 8.72 ✅ | 6.70 ✅ |
| `primary-text` | `surface` | link text | 4.5:1 | 6.70 ✅ | 8.29 ✅ |
| `primary-text` | `bg` | link text | 4.5:1 | 6.19 ✅ | 9.06 ✅ |
| `primary-text` | `primary-subtle` | selected chip text | 4.5:1 | 5.61 ✅ | 7.06 ✅ |
| `focus` | `surface` | focus ring | 3.0:1 | 6.70 ✅ | 8.29 ✅ |
| `focus` | `bg` | focus ring | 3.0:1 | 6.19 ✅ | 9.06 ✅ |
| `border-strong` | `surface` | input border | 3.0:1 | 3.65 ✅ | 3.97 ✅ |
| `border-strong` | `bg` | input border | 3.0:1 | 3.37 ✅ | 4.34 ✅ |
| `on-success` | `success` | success button | 4.5:1 | 5.48 ✅ | 5.48 ✅ |
| `success-text` | `success-subtle` | success badge | 4.5:1 | 6.66 ✅ | 8.51 ✅ |
| `success-text` | `surface` | success text | 4.5:1 | 7.63 ✅ | 10.07 ✅ |
| `on-danger` | `danger` | danger button | 4.5:1 | 6.47 ✅ | 5.62 ✅ |
| `danger-text` | `danger-subtle` | danger badge | 4.5:1 | 7.03 ✅ | 7.12 ✅ |
| `danger-text` | `surface` | danger text | 4.5:1 | 8.31 ✅ | 7.63 ✅ |
| `on-warning` | `warning` | warning button | 4.5:1 | 5.02 ✅ | 5.02 ✅ |
| `warning-text` | `warning-subtle` | warning badge | 4.5:1 | 6.87 ✅ | 8.64 ✅ |
| `warning-text` | `surface` | warning text | 4.5:1 | 7.75 ✅ | 10.44 ✅ |
| `info-text` | `info-subtle` | info badge | 4.5:1 | 7.30 ✅ | 7.06 ✅ |
| `wash` | `surface` | wash text | 4.5:1 | 5.93 ✅ | 8.64 ✅ |
| `wash` | `wash-subtle` | wash badge | 4.5:1 | 5.09 ✅ | 7.43 ✅ |
| `polish` | `surface` | polish text | 4.5:1 | 7.10 ✅ | 8.57 ✅ |
| `polish` | `polish-subtle` | polish badge | 4.5:1 | 5.93 ✅ | 8.04 ✅ |
| `income` | `surface` | income amount | 4.5:1 | 5.48 ✅ | 10.07 ✅ |
| `expense` | `surface` | expense amount | 4.5:1 | 6.47 ✅ | 7.63 ✅ |
| `unpaid` | `surface` | unpaid amount | 4.5:1 | 5.02 ✅ | 10.44 ✅ |
| `income` | `bg` | income amount | 4.5:1 | 5.07 ✅ | 11.01 ✅ |
| `expense` | `bg` | expense amount | 4.5:1 | 5.98 ✅ | 8.34 ✅ |
| `unpaid` | `bg` | unpaid amount | 4.5:1 | 4.64 ✅ | 11.41 ✅ |

**ผลรวม: 38/38 คู่ผ่าน ทั้ง 2 theme** (เกณฑ์: ข้อความ 4.5:1 และ UI component/focus 3:1) ชื่อในตารางคือ semantic token โดยตัด prefix `--color-`

## 4. Typography

ฟอนต์: `--font-sans: var(--font-sarabun), "Sarabun", "Noto Sans Thai", system-ui, sans-serif`
ตัวเลข: `--font-numeric: tabular-nums` ใช้ `font-variant-numeric: tabular-nums` กับตัวเลขเงินและเวลาทุกที่ [U] ต้องตรวจว่า Sarabun มี tabular figures (S04-02) และถ้าไม่มี ให้จัดชิดขวาแทน

| Token | Size / Line-height | Weight | ใช้กับ |
|---|---|---|---|
| `--text-display` | 40px / 48px | 700 | เงินสดสุทธิวันนี้ (Compact) |
| `--text-display-lg` | 48px / 56px | 700 | เงินสดสุทธิวันนี้ (Expanded) |
| `--text-title-lg` | 28px / 36px | 700 | ยอดค้างชำระรวม, ยอดรวมประวัติ |
| `--text-title` | 24px / 32px | 700 | `h1` ชื่อหน้า |
| `--text-heading` | 20px / 28px | 600 | `h2` หัวส่วน, ชื่อลูกค้าในการ์ดหนี้ |
| `--text-subheading` | 18px / 28px | 600 | `h3`, ตัวเลขในรายการ, ทะเบียน |
| `--text-body-lg` | 18px / 28px | 400 | input (กัน iOS zoom และอ่านง่าย) |
| `--text-body` | 16px / 26px | 400 | **ขั้นต่ำของเนื้อหา**, ปุ่ม |
| `--text-label` | 16px / 24px | 500 | label ฟอร์ม |
| `--text-caption` | 14px / 22px | 400/500 | **ขั้นต่ำสุดของทั้งระบบ:** เวลา, หมายเหตุ, ป้าย nav, badge |
| `--text-plate` | 24px / 32px | 700 | ช่องกรอกทะเบียน |
| `--text-money-input` | 28px / 36px | 700 | ช่องกรอกราคาหรือจำนวนเงิน |

กฎ:
- ไม่มีข้อความเล็กกว่า 14px (NFR-A11Y-03) และป้าย nav 14px
- Line-height ≥ 1.5 สำหรับข้อความไทยที่มีหลายบรรทัด เพราะสระบนและล่างต้องการพื้นที่
- ห้าม `text-transform: uppercase` และ `letter-spacing` > 0.02em กับภาษาไทย
- ทุกขนาดใช้ `rem` (16px = 1rem) เพื่อให้ซูมหรือขยายฟอนต์ระบบได้

## 5. Spacing (4px base)

| Token | ค่า | Token | ค่า |
|---|---|---|---|
| `--space-0` | 0 | `--space-6` | 24px |
| `--space-1` | 4px | `--space-8` | 32px |
| `--space-2` | 8px | `--space-10` | 40px |
| `--space-3` | 12px | `--space-12` | 48px |
| `--space-4` | 16px | `--space-16` | 64px |
| `--space-5` | 20px | | |

| Semantic | ค่า | ใช้กับ |
|---|---|---|
| `--page-gutter` | 16px (Compact) / 24px (Medium) / 32px (Expanded) | ระยะขอบหน้า |
| `--card-padding` | 16px / 20px / 24px | ภายในการ์ด |
| `--stack-gap` | 16px (ระหว่างส่วน) / 12px (ระหว่างแถว) | ระยะแนวตั้ง |
| `--field-gap` | 20px | ระหว่าง field ในฟอร์ม |
| `--target-gap` | ≥ 8px | ระหว่างปุ่มที่กดได้ |

## 6. Size

| Token | ค่า | ใช้กับ |
|---|---|---|
| `--size-target-min` | 44px | พื้นที่แตะขั้นต่ำทุก control (NFR-A11Y-04 †) |
| `--size-control-md` | 48px | input, ปุ่มทั่วไป, chip |
| `--size-control-lg` | 56px | ปุ่มบันทึก, ปุ่ม primary ใน action bar, ช่องทะเบียน/ราคา (64px) |
| `--size-icon-sm` | 16px | ไอคอนใน badge |
| `--size-icon-md` | 20px | ไอคอนในปุ่ม, nav |
| `--size-icon-lg` | 24px | ไอคอนหลักของการ์ด |
| `--size-nav-bottom` | 64px + safe-area | bottom nav |
| `--size-sidebar` | 240px | sidebar (Expanded) |
| `--size-content-max` | 720px (Medium) / 1200px (Expanded) | ความกว้างเนื้อหา |
| `--size-dialog-max` | 480px (ทั่วไป) / 560px (แก้ไขรายการ) | dialog |

## 7. Radius

| Token | ค่า | ใช้กับ |
|---|---|---|
| `--radius-sm` | 8px | badge, chip เล็ก |
| `--radius-md` | 12px | ปุ่ม, input, chip |
| `--radius-lg` | 16px | การ์ด |
| `--radius-xl` | 20px | dialog, bottom sheet (มุมบน) |
| `--radius-full` | 9999px | ปุ่มบันทึกกลาง nav, avatar, dot |

ลดจากเดิม (สูงสุด 28–32px) เพื่อให้ดูเป็นทางการขึ้น (DP-6)

## 8. Elevation & Shadow

| ระดับ | Token | Light | Dark | ใช้กับ |
|---|---|---|---|---|
| 0 | `--elevation-0` | none + ขอบ `--color-border` | none + ขอบ `--color-border` | การ์ดปกติ |
| 1 | `--elevation-1` | `0 1px 2px rgb(15 26 42 / .06), 0 1px 3px rgb(15 26 42 / .08)` | พื้น `--color-surface-2` (ไม่ใช้เงา) | การ์ดที่กดได้ (hover) |
| 2 | `--elevation-2` | `0 4px 12px rgb(15 26 42 / .12)` | `0 4px 12px rgb(0 0 0 / .5)` | sticky action bar, nav, dropdown |
| 3 | `--elevation-3` | `0 12px 32px rgb(15 26 42 / .2)` | `0 12px 32px rgb(0 0 0 / .6)` | dialog, toast |

ห้ามเงาที่มีสี (เช่น `shadow-blue-500/20` เดิม)

## 9. Border

| Token | ค่า |
|---|---|
| `--border-width` | 1px |
| `--border-width-strong` | 2px (input ที่ focus/invalid, chip ที่เลือก) |
| `--focus-ring` | `0 0 0 3px var(--color-focus-ring)` + `outline: 2px solid transparent` (รองรับ forced-colors) |
| `--focus-ring-offset` | 2px |

## 10. Motion

| Token | ค่า | ใช้กับ |
|---|---|---|
| `--duration-instant` | 80ms | สถานะกด (pressed) |
| `--duration-fast` | 150ms | hover, เปลี่ยนสี, chip |
| `--duration-base` | 220ms | dialog, sheet, toast เข้า |
| `--duration-slow` | 320ms | ไฮไลต์รายการใหม่ (fade) |
| `--ease-standard` | cubic-bezier(0.2, 0, 0, 1) | ทั่วไป |
| `--ease-exit` | cubic-bezier(0.3, 0, 1, 1) | ปิด |

`prefers-reduced-motion: reduce` → ทุก duration = 0ms ยกเว้นการเปลี่ยนสี (≤ 150ms) และไม่มีการเลื่อนตำแหน่ง (`accessibility-guidelines.md` §6)

## 11. Z-index

| Token | ค่า |
|---|---|
| `--z-base` | 0 |
| `--z-sticky` | 10 (หัววันในประวัติ, header) |
| `--z-nav` | 20 (bottom nav, sidebar, action bar) |
| `--z-status` | 30 (offline / env bar) |
| `--z-overlay` | 40 |
| `--z-dialog` | 50 |
| `--z-toast` | 60 |

## 12. Breakpoints

| Token | ค่า | ชื่อ |
|---|---|---|
| (ค่าเริ่มต้น) | 0–599px | Compact |
| `--bp-medium` | 600px | Medium |
| `--bp-expanded` | 1024px | Expanded |
| `--bp-wide` | 1440px | Wide (เพิ่มแค่ margin) |

Tailwind: `md:` = 600px และ `lg:` = 1024px (กำหนดใหม่ใน `@theme` ไม่ใช้ค่า default 768/1024)

## 13. Token ที่เลิกใช้ (จาก `app/globals.css` เดิม)

| เดิม | แทนด้วย | เหตุผล |
|---|---|---|
| `--accent` (#6366F1) + gradient ม่วง | `--color-action-primary` | contrast 4.47 และ gradient (DP-6) |
| `--text-tertiary` (#6B7280 / #9CA3AF) | `--color-text-tertiary` | ไม่ผ่าน contrast (ux-audit §3) |
| `--amber` สำหรับขัดสี | `--color-job-polish` | ชนกับความหมาย "ค้างชำระ" |
| `--orange`, `--cyan` | — | ไม่มีความหมายใน semantic |
| `--glass-*`, `.glass` | `--color-surface` + `--elevation-2` | blur ลด performance และ contrast |
| `.pulse-urgent`, `.float-soft`, `.bounce-in` | — | motion ไม่มีความหมาย (DP-6, reduced motion) |
| `--radius-2xl` (28px) | `--radius-xl` | DP-6 |
