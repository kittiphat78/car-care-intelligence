# Component Specifications — Step 04

> วันที่: 2026-10-14 · อ้างอิง tokens ใน `design-tokens.md` · พฤติกรรมอ้างอิง `interaction-specifications.md` (IS)
> ทุก component ระบุ: วัตถุประสงค์, anatomy, variants, states, พฤติกรรม, ARIA และ tokens
> ไฟล์ปลายทางเป็น **ข้อเสนอ** โดยโครงสร้างโฟลเดอร์สุดท้ายตัดสินใน Step 05 (`design-to-code-map.md` §3)

## 0. Conventions

| เรื่อง | กติกา |
|---|---|
| ชื่อ component | PascalCase ภาษาอังกฤษ ไม่มีคำว่า "Custom" หรือ "New" เช่น `Button`, `MoneyField`, `DebtCustomerCard` |
| ชั้น | **Primitive** (`ui/`): ไม่รู้จัก domain เช่น Button, Dialog · **Pattern** (`patterns/`): ประกอบ primitive และยังไม่รู้จัก domain เช่น FormField, EmptyState · **Domain** (`features/<domain>/`): รู้จักข้อมูลร้าน เช่น RecordRow, DebtCustomerCard |
| Props | `variant`, `size`, `tone` ใช้ string union · ข้อความที่ผู้ใช้เห็นส่งเป็น prop (ไม่ hardcode ใน primitive) · boolean ขึ้นต้นด้วย `is`/`has` เฉพาะสถานะ (`isLoading`) |
| สไตล์ | ใช้ semantic tokens ผ่าน Tailwind utility ที่ map แล้วเท่านั้น และห้ามมี hex, `rgba()` หรือ `style={{}}` สำหรับสี (TD-32) |
| State attributes | ใช้ `data-state="selected|loading|invalid"` และ ARIA จริง (`aria-pressed`, `aria-invalid`, `aria-busy`) แทน className เงื่อนไขยาว |
| Focus | ทุก component ที่ focus ได้ใช้ `:focus-visible` + `--focus-ring` |
| ตัวอักษรขั้นต่ำ | 14px (`--text-caption`) |

### 0.1 State model ร่วม

| State | Visual (สรุป) | กฎ |
|---|---|---|
| Default | ตาม variant | — |
| Hover | ใช้เฉพาะ `@media (hover: hover)` เปลี่ยนพื้นเป็น `*-hover` หรือ `surface-2` | ห้ามใช้ hover เป็นทางเดียวในการเห็นข้อมูล |
| Focus-visible | วงแหวน 3px `--color-focus-ring` + offset 2px | ต้องไม่ถูกบังโดย sticky element |
| Active (pressed) | `transform: scale(0.98)` 80ms (ไม่มีเมื่อ reduced motion) และพื้น `*-hover` | — |
| Selected | พื้น `action-primary-subtle`, ขอบ 2px `action-primary`, ไอคอน ✓ และข้อความ `text-link` | **ต้องมีไอคอน ✓** ไม่ใช้สีอย่างเดียว |
| Disabled | opacity 0.5 ของทั้ง control, `cursor: not-allowed` และยังอ่านได้ | ใช้ `disabled` จริงหรือ `aria-disabled` + เหตุผลใน hint |
| Loading | spinner 20px แทนไอคอนนำหน้า, ข้อความเปลี่ยน, ความกว้างคงที่ และ `aria-busy` | กดซ้ำไม่ได้ |
| Invalid | ขอบ 2px `danger-text`, ไอคอน ⚠ + ข้อความใต้ช่อง และ `aria-invalid` | — |

---

## 1. Primitives (`ui/`)

### 1.1 Button

| | |
|---|---|
| ใช้กับ | ทุกการกระทำ |
| Anatomy | [ไอคอนนำหน้า?] ข้อความ [ไอคอนตามหลัง?] |
| Variants | `primary` (พื้น `action-primary`) · `secondary` (พื้น `surface`, ขอบ `border-strong`, ข้อความ `text`) · `ghost` (ไม่มีพื้น, ข้อความ `text-link`) · `danger` (พื้น `danger`) · `danger-ghost` (ข้อความ `danger-text`) · `success` (พื้น `success`) สำหรับ "เคลียร์ยอด" เท่านั้น |
| Sizes | `md` 48px (ข้อความ 16px/600) · `lg` 56px (18px/600) |
| Width | `auto` หรือ `full` |
| States | §0.1 ทั้งหมด และ loading: ข้อความจาก prop `loadingText` (เช่น "กำลังบันทึก…") |
| ARIA | `<button type="button">` ค่าเริ่มต้น (`type="submit"` เฉพาะใน form) และ `aria-busy` เมื่อ loading |
| กฎ | ข้อความเป็นคำกริยาเฉพาะ ("บันทึก", "ลบรายการ") และ primary ≤ 1 ปุ่มต่อพื้นที่มองเห็น (DP-3) |

### 1.2 IconButton
ปุ่มไอคอนอย่างเดียว ขนาด 44×44 (`md`) หรือ 48×48 · **ต้องมี `aria-label`** · variants: `ghost` (ค่าเริ่มต้น), `secondary` · ใช้กับ: ปิด dialog, รีเฟรช, แสดงรหัสผ่าน, ย้อนกลับ

### 1.3 TextInput (input พื้นฐาน)
| | |
|---|---|
| Size | สูง 48px, ข้อความ 18px (`--text-body-lg`) และ padding x 16px |
| Visual | พื้น `surface`, ขอบ 1px `border-strong`, radius md · focus: ขอบ 2px `action-primary` + focus ring · invalid: ขอบ 2px `danger-text` · disabled: พื้น `surface-2` |
| Slots | prefix (เช่น ฿, 🔍) · suffix (เช่น ปุ่มล้าง) |
| ห้าม | placeholder แทน label |

### 1.4 Chip / ChoiceGroup (radiogroup)
| | |
|---|---|
| ใช้กับ | ประเภทงาน, ประเภทรถ, ยี่ห้อ, สถานะชำระ, ปุ่มลัดรายจ่าย, quick-pick ลูกค้า, ตัวกรองประเภท |
| Variants | `chip` (สูง 44px, ข้อความ 16px) · `tile` (การ์ดเลือกใหญ่ 72px: ไอคอน 24px + ข้อความ + คำอธิบาย สำหรับ ล้างรถ/ขัดสี และประเภทรถ) |
| Tone ของสถานะเลือก | `primary` (ค่าเริ่มต้น) · `wash` · `polish` · `success` (ชำระแล้ว) · `warning` (ค้างชำระ) · `danger` (ปุ่มลัดรายจ่าย) โดยแต่ละ tone ใช้ `*-subtle` + ขอบสีหลัก + ✓ |
| Mode | `single` (`role="radiogroup"` + `role="radio"` + `aria-checked` และลูกศรเลื่อน) · `single-clearable` (แตะซ้ำแล้วยกเลิก ใช้กับประเภทรถ/ยี่ห้อตามเดิม) · `multi` (ไม่ใช้ใน MVP) |
| Layout | wrap (ค่าเริ่มต้น) หรือ grid N คอลัมน์ และห้าม scroll แนวนอนเป็นทางเดียว (เลิกใช้ drag-scroll ใน EditModal) |

### 1.5 SegmentedControl / Tabs
| | |
|---|---|
| ใช้กับ | รายรับ/รายจ่าย (`/add`, `/history`), 7/30 วัน, สัปดาห์/เดือน/ปี |
| Visual | ราง `surface-2`, ช่องที่เลือกพื้น `surface` + elevation-1 + ข้อความ `text` 600 และสูง 44px |
| ARIA | ถ้าสลับ **เนื้อหา** ใช้ `tablist`/`tab`/`tabpanel` และถ้าสลับ **ค่า** ใช้ radiogroup |

### 1.6 Card
พื้น `surface`, ขอบ `border`, radius lg, padding `--card-padding` และ elevation-0
Variants: `static` · `interactive` (ทั้งการ์ดเป็น `<button>` หรือ `<a>` ไม่ใช่ `div role="button"`, hover elevation-1) · `tone="warning"` (พื้น `warning-subtle`, ขอบ `warning`)

### 1.7 Badge
สูง 24px, ข้อความ 14px/500, radius sm และมีไอคอน 16px ได้
Tones: `neutral` · `success` "ชำระแล้ว" · `warning` "ค้างชำระ" · `danger` "เร่งด่วน" · `wash` "ล้างรถ" · `polish` "ขัดสี" · `info`
กฎ: badge สถานะมีข้อความเสมอ

### 1.8 Dialog
| | |
|---|---|
| Variants | `modal` (กลางจอ, max 480/560px) บน Medium/Expanded · `sheet` (bottom sheet, มุมบน radius xl, สูงสุด 90dvh, มี handle) บน Compact · `alert` (`role="alertdialog"`, กลางจอทุกขนาด, max 400px) |
| Anatomy | Header (หัวข้อ `h2` + IconButton ปิด) · Body (scroll ได้) · Footer (ปุ่มติดล่าง) |
| พฤติกรรม | focus trap, focus เริ่มต้นตามสเปก (IS §3.2), Esc ปิด, คลิกฉากหลังปิด (ยกเว้น alert), back ปิด (URL state) และคืน focus |
| Motion | sheet เลื่อนขึ้น 220ms และ modal fade+scale 0.98→1 220ms (reduced: fade อย่างเดียว) |
| ARIA | `role="dialog"` + `aria-modal="true"` + `aria-labelledby` |
| Implementation | ใช้ `<dialog>` element หรือ library ที่จัดการ focus ได้ (ตัดสิน Step 05) |

### 1.9 Toast
| | |
|---|---|
| ตำแหน่ง | Compact: บน action bar/nav ด้านล่าง · Expanded: มุมขวาล่าง |
| Visual | พื้น `surface-inverse`, ข้อความ `text-inverse` 16px, ไอคอนสถานะ, ปุ่มปิด และปุ่ม action (เช่น "ลองอีกครั้ง") ได้ 1 ปุ่ม |
| Tones | `success` (ไอคอน ✓ สี `success-text` ของ theme ตรงข้าม) · `error` · `info` |
| เวลา | success/info 5 วินาที (หยุดเมื่อ hover/focus) และ error ค้างจนปิด (IS §3.1) |
| Stack | สูงสุด 3 อัน โดยอันใหม่อยู่ใกล้ขอบ |
| ARIA | success/info `role="status"` และ error `role="alert"` |

### 1.10 Banner (Alert)
แถบเต็มความกว้างของส่วน: ไอคอน + หัวข้อ (16px/600) + รายละเอียด + action (ปุ่ม ghost)
Tones: `info`, `success`, `warning`, `danger` (พื้น `*-subtle`, ข้อความ `*-text`) · `role="alert"` สำหรับ danger และ `status` สำหรับอื่น

### 1.11 Skeleton
บล็อกพื้น `surface-2` ขนาดเท่าของจริง, radius เท่ากับ element จริง และ shimmer 1.5s (ปิดเมื่อ reduced motion) · ชุดสำเร็จรูป: `Skeleton.Text`, `Skeleton.Money`, `Skeleton.Row`, `Skeleton.Card` · container มี `aria-busy="true"` และข้อความ sr-only "กำลังโหลด…"

### 1.12 Spinner
วงกลม 20px (ปุ่ม) หรือ 32px (ส่วนของหน้า) ใช้ `currentColor` และ `aria-hidden` (สถานะประกาศผ่าน container)

### 1.13 Icon
ชุดไอคอนเส้นเดียว (เสนอ **Lucide** ซึ่งเป็น MIT license และ tree-shake ได้ → ตัดสิน Step 05 S04-01) ขนาดจาก `--size-icon-*`, stroke 2 และ `aria-hidden` เสมอ (ความหมายมาจากข้อความข้างเคียง)
Mapping หลัก: ล้างรถ = droplets · ขัดสี = sparkles · รายจ่าย = arrow-up-right / receipt · ค้างชำระ = clock · บิล = file-text · เคลียร์ยอด = check-circle · ประวัติ = history · ภาพรวม = layout-dashboard · บันทึก = plus · เพิ่มเติม = more-horizontal · ฝน = cloud-rain · ฝุ่น = wind

---

## 2. Patterns (`patterns/`)

### 2.1 FormField
Wrapper ของทุก input: `label` (16px/500, `htmlFor` ผูกจริง) · ป้าย "จำเป็น" (ดอกจัน + sr-only) · control · hint (14px `text-tertiary`) · error (14px `danger-text` + ไอคอน, `id` ผูก `aria-describedby`) · counter (แสดงเมื่อเหลือ ≤ 10 ตัว)
แก้ ER-24 (`SectionLabel` ไม่ผูก input)

### 2.2 FormErrorSummary
Banner danger บนสุดของฟอร์ม "กรุณาแก้ไข N ช่อง" + รายการลิงก์ไปแต่ละช่อง และรับ focus เมื่อแสดง (`tabindex="-1"`)

### 2.3 Specialized fields

| Component | สเปก |
|---|---|
| `PlateField` | สูง 64px, ข้อความ 24px/700 กึ่งกลาง, `autocapitalize="characters"`, max 20 + counter และ slot ใต้ช่องสำหรับ "ลูกค้าประจำ ครั้งที่ N" (Badge info) |
| `MoneyField` | สูง 64px, prefix "฿", ข้อความ 28px/700 ชิดขวา, `inputMode="numeric"`, รับเฉพาะตัวเลข และแสดงคั่นหลักพันเมื่อ blur · tone `expense` สำหรับรายจ่าย (ตัวเลข `expense`) |
| `DateField` | ปุ่มแสดง "วันนี้ · 14 ต.ค. 2569" (พ.ศ.) ที่ focus ได้ แล้วเปิด native date input · ถ้าไม่ใช่วันนี้ แสดง Badge warning "บันทึกย้อนหลัง" · มีปุ่มลัด "วันนี้" / "เมื่อวาน" |
| `TimeField` | native `type="time"` 24 ชม. |
| `SearchField` | TextInput + ไอคอนค้นหา + ปุ่มล้าง, `type="search"` และ `enterkeyhint="search"` |
| `CustomerField` | quick-pick chips (3) + TextInput + datalist (30 ชื่อล่าสุด) |
| `BrandPicker` | SearchField + Chip group (8 ยอดนิยม) + ปุ่ม "ดูทั้งหมด (24)" |
| `MonthYearPicker` | 2 select (เดือนรวม "ทั้งปี" และปี พ.ศ. ถึงปีปัจจุบัน) โดยมี label ที่ผูกจริง |

### 2.4 ActionBar
แถบติดล่างเหนือ nav: พื้น `surface`, elevation-2, padding 12px + safe-area และมีปุ่ม secondary (ซ้าย, 40%) + primary (ขวา, 60%) ขนาด `lg` · ป้าย "บันทึกย้อนหลัง" อยู่บนแถบเมื่อมี · ซ่อนเมื่อ virtual keyboard เปิดบน Compact (IS §2.4) · Expanded: เป็นแถวปกติท้ายฟอร์ม

### 2.5 EmptyState
ไอคอน 40px (`text-tertiary`) + หัวข้อ 18px/600 + คำอธิบาย 16px + ปุ่ม (ถ้ามี) และจัดกึ่งกลาง

### 2.6 ErrorState
เหมือน EmptyState แต่ tone danger + ปุ่ม "ลองอีกครั้ง" + รหัสอ้างอิง (ถ้ามี) และ `role="alert"`

### 2.7 ConfirmDialog
Dialog `alert`: หัวข้อ (คำถาม) + สรุปขอบเขต (รายการ key-value) + ปุ่ม [ยกเลิก] (secondary, focus เริ่มต้น) + [คำกริยา] (danger/success/primary)

### 2.8 StatusBar
แถบบนสุดของ viewport (สูง 36px, ข้อความ 14px) แบบ `offline` (warning-subtle) · `env` (พื้น `env-banner`, ข้อความขาว "ทดสอบ · ไม่ใช่ข้อมูลจริง") · `realtime-lost` (info-subtle + "แตะเพื่อรีเฟรช") · `role="status"`

### 2.9 PageHeader
`h1` (24px/700) + คำอธิบายรอง (optional) + action ขวา (optional) และ Compact มีปุ่มย้อนกลับเฉพาะหน้าที่ไม่ได้อยู่ใน nav (ไม่มีใน MVP)

### 2.10 Navigation

| Component | สเปก |
|---|---|
| `BottomNav` | Compact/Medium: สูง 64px + safe-area, 5 ช่องเท่ากัน (ไอคอน 24px + ป้าย 14px/500) · active: ไอคอนและข้อความ `text-link` + pill พื้น `action-primary-subtle` + `aria-current="page"` · ช่อง "บันทึก" ตรงกลาง: วงกลม 56px พื้น `action-primary` ไอคอนขาว (ไม่ใช้ gradient) และป้ายด้านล่าง · Badge ค้างชำระ: วงกลม 20px พื้น `warning` ตัวขาว 14px (ตัวเลข ≤ 9 แล้วแสดง "9+") |
| `SideNav` | Expanded: กว้าง 240px, พื้น `surface`, ขอบขวา `border` · บนสุด: โลโก้ + ชื่อ "คาร์แคร์" · ปุ่ม "บันทึกรายการ" (Button primary lg full) · รายการ nav 48px (ไอคอน + ข้อความ 16px) · ล่างสุด: theme toggle, ชื่อบัญชี, "ออกจากระบบ" และเวอร์ชัน |

### 2.11 ChartCard
Card + หัวข้อ + SegmentedControl (7/30 วัน) + กราฟแท่ง (recharts เดิม) สูง 200px (Compact) / 240px (Expanded) + **สรุปข้อความ** ("7 วันล่าสุด: รายรับ ฿x, รายจ่าย ฿y") + ปุ่ม "ดูเป็นตาราง" (เปิด `<table>` ใน disclosure) · สีจาก tokens โดยอ่านจาก CSS variables (ไม่ hardcode ตาม theme แบบเดิม)

### 2.12 DataTable (Expanded เท่านั้น)
`<table>` จริง มี `caption` (sr-only), หัวตาราง sticky, แถวสูง 52px, ตัวเลขชิดขวา tabular และแถวกดได้ (ปุ่ม "แก้ไข" ในแถว ไม่ทำให้ทั้งแถวเป็นลิงก์) · ใช้ใน `/history` บน Expanded ส่วน Compact/Medium ใช้ RecordRow

---

## 3. Domain Components (`features/`)

### 3.1 MoneyHero (`dashboard`)
| | |
|---|---|
| เนื้อหา | ป้าย "เงินสดสุทธิวันนี้" (16px/500 `text-secondary`) · ตัวเลข `--text-display` · คำอธิบาย "รับเงินแล้ว − รายจ่าย" (14px `text-tertiary`) · แถวตัวรอง 4 ช่อง (StatItem): รายรับรวม (+ แนวโน้ม ▲/▼ x% "จากเมื่อวาน"), รายจ่าย, ล้างรถ N คัน และขัดสี N คัน |
| ติดลบ | ตัวเลข `expense` + "−฿" + sr-only "ติดลบ" |
| Loading | Skeleton.Money + 4 Skeleton.Text |
| Error | ErrorState ในการ์ด (ห้ามแสดง ฿0) |
| ARIA | `<section aria-labelledby>` และไม่ใช้ `aria-live` กับตัวเลข (กันเสียงรบกวนจาก realtime) |

### 3.2 StatItem
ป้าย (14px/500 `text-secondary`) + ค่า (20px/700 tabular) + หน่วย (14px) + trend (optional) โดยไม่มีไอคอนพื้นหลังสีเหมือนเดิม และใช้ไอคอนเส้น 20px สีตาม domain

### 3.3 DebtSummaryCard (`dashboard`)
Card `tone="warning"` เป็นลิงก์ไป `/debts` ทั้งการ์ด: ไอคอน clock + "ค้างชำระ" + ยอด (`--text-title-lg` `unpaid`) + "3 ราย · 9 คัน" + "ดูทั้งหมด ›" · ไม่กะพริบ · ซ่อนเมื่อยอด = 0 (ข้อมูลโหลดสำเร็จแล้ว)

### 3.4 RecordRow (`records`)
| | |
|---|---|
| ใช้กับ | รายการวันนี้, ประวัติ (Compact/Medium), รายการในการ์ดหนี้ (แบบ compact) |
| Anatomy | แถบซ้าย 4px (สี job) · ไอคอน job 24px ในกล่อง 40px (`job-*-subtle`) · บรรทัด 1: ทะเบียน (18px/600) + ยี่ห้อ (14px `text-secondary`) · บรรทัด 2: Badge job + Badge "ค้างชำระ" (ถ้ามี) + `#seq` (14px) · บรรทัด 3 (ถ้ามี): ลูกค้า · หมายเหตุ (14px `text-tertiary`, ตัดบรรทัดเดียว) · ขวา: ราคา (18px/700 tabular, `unpaid` ถ้าค้าง) + เวลา "09:40 น." (14px) |
| Variant `expense` | ไอคอนตามหมวด (จากปุ่มลัด) · ชื่อรายการ · หมายเหตุ · ราคา "−฿350" สี `expense` |
| Interactive | เป็น `<button>` ทั้งแถว (ไม่ใช่ `article role="button"` แบบเดิม) เปิด dialog แก้ไข พร้อม `aria-label` ที่สรุปรายการ ("ล้างรถ กข 1234 ฿150 ค้างชำระ 09:40 น. แตะเพื่อแก้ไข") |
| Highlight | รายการที่เพิ่งบันทึก: พื้น `action-primary-subtle` แล้ว fade ใน 2 วินาที (reduced: ไม่ fade แต่หายทันทีหลัง 2 วินาที) |
| Audit | ประวัติแสดง "เพิ่มโดย x · แก้โดย y" (14px) ใต้แถว |

### 3.5 DayGroupHeader (`history`)
Sticky: "14 ต.ค. 2569 · อังคาร" (16px/600) + "ล้างรถ 18 · ขัดสี 2" (14px) + ยอดรายวัน (16px/700 สี income/expense) และพื้น `bg` ทึบ (ไม่ใช้ glass)

### 3.6 PeriodSummary (`history`)
Card: ป้ายช่วง ("ยอดรวม ตุลาคม 2569") + ยอด `--text-title-lg` + แถว StatItem (ล้างรถ N คัน ฿x · ขัดสี N คัน ฿y และแสดงทั้งจำนวนและยอดพร้อมกัน แทน toggle) + Button secondary "ส่งออก Excel" (ทั้ง 2 แท็บ)

### 3.7 FilterPanel (`history`)
SearchField + ปุ่ม "ตัวกรอง (2)" ที่เปิด/ปิดส่วน: ช่วงวันที่ (2 DateField แบบ native) + ChoiceGroup ประเภทงาน (รายรับเท่านั้น) + ปุ่ม "ล้างตัวกรอง" · Expanded: แสดงเป็นแถวเดียวตลอด (ไม่พับ)

### 3.8 DebtCustomerCard (`debts`)
| | |
|---|---|
| Header | ชื่อลูกค้า (20px/600) + ยอด (24px/700 `unpaid`) |
| Meta | "6 คัน" · Badge ความเร่งด่วน: ไอคอน clock + "ค้างนานสุด 15 วัน" + ระดับ ("เร่งด่วน" danger ≥ 14 วัน, ต่ำกว่าเป็น warning) |
| รายการ | RecordRow แบบ compact (ทะเบียน, วันที่ "2 ต.ค.", "12 วัน", ราคา และหมายเหตุ) โดยแต่ละแถวเปิด dialog แก้ไขได้ · แสดง 5 แถวแรก + "ดูอีก N คัน" ถ้ามีมากกว่า 5 |
| Actions | Button secondary "สร้างบิล" (ไอคอน file-text) + Button success "เคลียร์ยอด" (ไอคอน check-circle) โดยแต่ละปุ่มมีสถานะ loading แยกกัน |
| ARIA | `<article aria-labelledby="ชื่อลูกค้า">` และปุ่มมี `aria-label` รวมชื่อลูกค้า |

### 3.9 WeatherStrip & WeatherDetail (`dashboard`)
**Strip** (ใน header): ไอคอนสภาพอากาศ 20px + อุณหภูมิ + ไอคอนฝน + "% ฝน" เป็นปุ่มที่เปิด WeatherDetail (popover บน Expanded หรือ sheet บน Compact) · **RainAlert:** Banner warning เมื่อโอกาสฝน > 40% "มีโอกาสฝน 65% วันนี้" + ข้อความแนะนำ · **Detail:** ข้อมูลเดิมครบ ได้แก่ สภาพอากาศ, รู้สึกเหมือน, ความชื้น, ลม, AQI + ระดับ (ข้อความ), ข้อความแนะนำ, เวลาอัปเดต, ปุ่มรีเฟรช และชื่อพื้นที่จาก config · พื้นใช้ surface ปกติ (เลิกใช้ gradient ตามสภาพอากาศเพื่อ contrast คงที่ ส่วนไอคอนยังบอกกลางวันหรือกลางคืน)

### 3.10 CustomerBreakdownCard (`dashboard`)
Card + SegmentedControl (สัปดาห์/เดือน/ปี) + รายการลูกค้า (Top 4 + ลูกค้าทั่วไป D-04): ชื่อ, ยอดรวม, แถบสัดส่วน (มีตัวเลขกำกับ ไม่พึ่งแถบอย่างเดียว) และ "ล้าง N ฿x · ขัดสี N ฿y" (ขยายดูได้)

### 3.11 RecordEditor (`records`)
ฟอร์มชุดเดียวที่ใช้ใน `/add` และ dialog แก้ไข (DP-5, TD-08): props `mode="create|edit"`, `kind="income|expense"` และ `initialValue`
- create: DateField + ฟอร์ม + ActionBar
- edit: DateField + TimeField + ฟอร์ม + AuditInfo + footer [ลบ (danger-ghost ซ้าย)] [บันทึกการแก้ไข (primary)] ซึ่ง disabled จนกว่าจะมีการเปลี่ยน

### 3.12 AuditInfo (`records`)
รายการ key-value 14px: "เพิ่มโดย" · "แก้ไขล่าสุดโดย (เวลา)" โดยไม่มีบล็อก "บัญชีปัจจุบัน" แบบเดิม (ซ้ำกับหน้าเพิ่มเติม)

### 3.13 ExportForm (`history`)
SegmentedControl โหมด (ฉบับธนาคาร / ฉบับภายใน) + คำอธิบายโหมด + MonthYearPicker × 2 (ตั้งแต่ / ถึง) + ข้อความจำนวนรายการ ("พบ 312 รายการ") + Button primary "ดาวน์โหลด Excel" (loading: "กำลังเตรียมไฟล์…")

### 3.14 LoginForm (`auth`)
FormField อีเมล (`type="email"`, `autocomplete="username"`) · รหัสผ่าน + IconButton แสดง/ซ่อน (focus ได้) · Checkbox "จดจำอีเมล" (44px target) · Banner danger · Button primary lg full "เข้าสู่ระบบ" · ข้อความ "ลืมรหัสผ่าน? ติดต่อผู้ดูแลร้าน"

### 3.15 Checkbox / Switch
Checkbox 24px ในพื้นที่แตะ 44px, ขอบ `border-strong` และ checked พื้น `action-primary` + ✓ · Switch (theme toggle) 52×32 พร้อมข้อความ "ธีมมืด" และ `role="switch"` + `aria-checked`

## 4. Component Inventory Summary

| ชั้น | จำนวน | รายการ |
|---|---|---|
| Primitive | 15 | Button, IconButton, TextInput, Chip/ChoiceGroup, SegmentedControl/Tabs, Card, Badge, Dialog, Toast, Banner, Skeleton, Spinner, Icon, Checkbox, Switch |
| Pattern | 20 | FormField, FormErrorSummary, PlateField, MoneyField, DateField, TimeField, SearchField, CustomerField, BrandPicker, MonthYearPicker, ActionBar, EmptyState, ErrorState, ConfirmDialog, StatusBar, PageHeader, BottomNav, SideNav, ChartCard, DataTable |
| Domain | 15 | MoneyHero, StatItem, DebtSummaryCard, RecordRow, DayGroupHeader, PeriodSummary, FilterPanel, DebtCustomerCard, WeatherStrip, WeatherDetail, CustomerBreakdownCard, RecordEditor, AuditInfo, ExportForm, LoginForm |
