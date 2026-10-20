# Screen Specifications — Step 04

> วันที่: 2026-10-14 · ครอบคลุม **ทุก route ใน `sitemap.md`** + ทุก dialog + องค์ประกอบ global
> แต่ละหน้าระบุ: วัตถุประสงค์ · layout ตาม breakpoint · โครงสร้างพร้อม component · ข้อมูลที่ใช้ · states · interactions · a11y · AC ที่เกี่ยวข้อง
> ชื่อ component ตาม `component-specifications.md` · ข้อความบนจอเป็นถ้อยคำสุดท้ายที่ใช้ implement ได้ (ปรับได้เล็กน้อยใน review)

## 0. App Shell (ทุกหน้าหลัง login)

| ส่วน | Compact (<600) | Medium (600–1023) | Expanded (≥1024) |
|---|---|---|---|
| StatusBar (env/offline/realtime) | บนสุด เต็มกว้าง | เหมือนกัน | เหนือเนื้อหา (ขวาของ SideNav) |
| Navigation | BottomNav | BottomNav | SideNav 240px |
| Main | `padding-inline: 16px`, เต็มกว้าง | 24px, max 720px กึ่งกลาง | 32px, max 1200px |
| Toast | เหนือ nav/ActionBar | เหนือ nav | มุมขวาล่าง |
| Skip link | "ข้ามไปเนื้อหา" → `#main` | เหมือนกัน | เหมือนกัน |
| `padding-bottom` ของ main | nav 64 + safe-area (+ ActionBar 80 บน `/add`) | เหมือนกัน | 32px |

Landmarks: `<nav aria-label="เมนูหลัก">`, `<main id="main">` และแต่ละหน้ามี `h1` เดียว

---

## 1. `/login` — เข้าสู่ระบบ

| | |
|---|---|
| วัตถุประสงค์ | ยืนยันตัวตน (F-01, F-02) |
| Layout | ทุกขนาด: กล่องกลางจอ max 400px บนพื้น `bg` (ไม่มี nav, ไม่มีวงกลมตกแต่ง) |
| โครงสร้าง | โลโก้ 64px (พื้น `action-primary`) · `h1` "คาร์แคร์" · คำอธิบาย "ระบบจัดการร้านล้างรถ" · Card > **LoginForm** · footer เล็ก "Car Care Intelligence · v{version}" |
| ข้อมูล | `remembered_email` (localStorage), query `next` |
| States | ปกติ · validation (ช่องว่าง/รูปแบบอีเมล → FormField error) · busy ("กำลังเข้าสู่ระบบ…") · error banner 3 แบบ (UF-AUTH-01) · offline (StatusBar + ปุ่ม disabled + "ไม่มีอินเทอร์เน็ต") · env bar ถ้าไม่ใช่ production |
| Interactions | Enter ในช่องรหัสผ่าน = submit · เมื่อข้อมูลผิด: ล้างรหัสผ่าน + focus ช่องรหัสผ่าน · สำเร็จ → `next` หรือ `/` |
| A11y | label ผูกจริง, `autocomplete="username"`/`current-password`, ปุ่มแสดงรหัสผ่าน focus ได้ + `aria-pressed` |
| AC | AC-01-1..3, AC-02-1 |

## 2. `/` — ภาพรวม

| | |
|---|---|
| วัตถุประสงค์ | ยอดวันนี้, ค้างชำระ, รายการวันนี้ และแนวโน้ม (F-11..F-19) |
| `h1` | "ภาพรวมวันนี้" (มองเห็น) |

### 2.1 โครงสร้าง (ลำดับ Compact)

| # | Component | เนื้อหาและข้อมูล | Expanded |
|---|---|---|---|
| 1 | PageHeader | บรรทัดเล็ก: "อังคาร 14 ต.ค. 2569" · `h1` "ภาพรวมวันนี้" · ขวา: WeatherStrip + ปุ่ม "อัปเดต 09:41 ⟳" (IconButton + ข้อความ) | เต็มกว้าง |
| 1a | Banner warning (RainAlert) | เมื่อ `prob > 40` | เต็มกว้าง |
| 2 | MoneyHero | `stats.netProfit`, `todayTotalIncome`, `diffPct`, `isUp`, `todayExpense`, `washCount`, `polishCount` | คอลัมน์ซ้าย (7/12) |
| 3 | DebtSummaryCard | `totalUnpaidAmount`, จำนวนกลุ่ม, จำนวนคัน (ซ่อนเมื่อ 0) | คอลัมน์ขวา (5/12) บนสุด |
| 4 | Section "รายการวันนี้ (N)" | RecordRow × N (ใหม่→เก่า S03-03) และ 10 แถวแรก + Button ghost "ดูทั้งหมด (N)" (ขยายในที่เดิม) | คอลัมน์ซ้าย |
| 5 | ChartCard "รายรับ-รายจ่าย" | `chartData`, `chartMode` | คอลัมน์ขวา |
| 6 | CustomerBreakdownCard | `customerBreakdown` | คอลัมน์ขวา |

ไม่มีคำทักทาย "สวัสดีตอนเช้า, {ชื่อ}" ในตำแหน่งหลักเพื่อเว้นที่ให้ตัวเลข (ชื่อบัญชีอยู่ใน SideNav/`/more`) ทั้งนี้ฟีเจอร์ F-11 ยังคงไว้ในรูปวันที่ไทยบน header ส่วนคำทักทายย้ายเป็นข้อความเล็กใต้วันที่บน Expanded เท่านั้น

### 2.2 States (อ้างอิง IS §4)
- **โหลดครั้งแรก:** Skeleton ของแต่ละส่วนแยกกัน และ MoneyHero ต้องมาก่อน (ไม่รอข้อมูลรายปี)
- **วันนี้ยังไม่มีรายการ:** MoneyHero แสดง ฿0 (หลังโหลดสำเร็จ) + EmptyState ในรายการ "ยังไม่มีงานวันนี้" + Button primary "บันทึกรายการแรก" → `/add`
- **Error รายส่วน:** ErrorState ในการ์ดนั้น + "ลองอีกครั้ง"
- **Refresh เงียบ:** ปุ่ม ⟳ หมุน และ "กำลังอัปเดต…"
- **Realtime หลุด:** StatusBar `realtime-lost`
- **รายการใหม่จาก realtime:** RecordRow highlight (ไม่ประกาศเสียง)

### 2.3 Interactions
แตะ RecordRow → `?edit=income:<id>` (dialog §8) · แตะ DebtSummaryCard → `/debts` · ⟳ → refresh ทุกส่วน · WeatherStrip → WeatherDetail

**AC:** AC-14-x, AC-15-1, AC-16-x, AC-17-1, AC-18-1, AC-19-x

## 3. `/debts` — ค้างชำระ

| | |
|---|---|
| วัตถุประสงค์ | ทวงหนี้, ออกบิล และเคลียร์ยอด (F-20..F-22) |
| `h1` | "ค้างชำระ" |

| # | Component | เนื้อหา | Expanded |
|---|---|---|---|
| 1 | PageHeader | `h1` + สรุป "฿12,800 · 3 ราย · 9 คัน" (ยอด `--text-title-lg` `unpaid`) | เต็มกว้าง |
| 2 | ตัวเรียง | SegmentedControl (radiogroup) "ยอดมากสุด" / "ค้างนานสุด" → `?sort` | ขวาของ header |
| 3 | DebtCustomerCard × N | ตาม `groupedUnpaid` · v2.2.0: แถวติดต่อ `DebtContact` เหนือปุ่ม (โทรเบอร์หลักของลูกค้าที่ตรงทะเบียน/ชื่อ · "โทร… (N ราย)" · "เพิ่มเบอร์" → `?customer=new`) ดู `docs/features/customer-directory.md` §6.7 | grid 2 คอลัมน์ |

**States:** Skeleton.Card × 3 · Empty: EmptyState ไอคอน check-circle "ไม่มีรายการค้างชำระ" + "ทุกรายการได้รับชำระแล้ว" + Button secondary "กลับภาพรวม" · Error: ErrorState (ห้ามแสดง ฿0) · offline: ปุ่ม "เคลียร์ยอด" disabled + hint "ต้องเชื่อมต่ออินเทอร์เน็ต"
**Interactions:** "สร้างบิล" → UF-BILL-01 · "เคลียร์ยอด" → `?settle=` (dialog §9) · แตะแถวรถ → `?edit=` (dialog §8) · "ดูอีก N คัน" ขยายในที่
**AC:** AC-20-1/2, AC-21-1, AC-22-1..3, AC-23-1

## 4. `/add` — บันทึกรายการ

| | |
|---|---|
| วัตถุประสงค์ | บันทึกรายรับหรือรายจ่าย (F-23..F-31) |
| `h1` | "บันทึกรายการ" |
| Component หลัก | RecordEditor `mode="create"` |

### 4.1 โครงสร้าง — รายรับ (`?type=income`)

| # | Component | รายละเอียด | Expanded (2 คอลัมน์) |
|---|---|---|---|
| 1 | Tabs | "รายรับ" / "รายจ่าย" (`tablist`) | เต็มกว้าง |
| 2 | Banner info (มีเงื่อนไข) | "กู้ข้อมูลที่กรอกค้างไว้แล้ว" + Button ghost "ล้างฟอร์ม" | เต็มกว้าง |
| 3 | FormErrorSummary (มีเงื่อนไข) | หลังกดบันทึกแล้วไม่ผ่าน | เต็มกว้าง |
| 4 | DateField | "วันที่ทำรายการ" + ปุ่มลัด วันนี้/เมื่อวาน | ซ้าย |
| 5 | ChoiceGroup tile | "ประเภทงาน\*": ล้างรถ (tone wash, "บริการทั่วไป") / ขัดสี (tone polish, "เต็นท์รถ") | ซ้าย |
| 6 | PlateField | "ป้ายทะเบียน\*" + Badge "ลูกค้าประจำ · ครั้งที่ 3" | ซ้าย |
| 7 | ChoiceGroup tile grid 3 คอลัมน์ | "ประเภทรถ\*" (6 ตัวเลือกจาก `CAR_TYPES`, clearable) | ซ้าย |
| 8 | MoneyField | "ราคา (บาท)\*" | ซ้าย |
| 9 | ChoiceGroup chip | "สถานะการชำระ": ชำระแล้ว (success) / ค้างชำระ (warning) | ขวา |
| 10 | CustomerField | "ลูกค้า / เต็นท์" **แสดงเมื่อค้างชำระ** หรือกด "เพิ่มชื่อลูกค้า" (disclosure) | ขวา |
| 11 | BrandPicker | "ยี่ห้อรถ" (ไม่บังคับ, disclosure "เลือกยี่ห้อ" บน Compact) | ขวา |
| 12 | FormField + TextInput | "หมายเหตุ" (max 200) | ขวา |
| 13 | ActionBar | ป้าย "บันทึกย้อนหลัง: 13 ต.ค. 2569" (มีเงื่อนไข) · [บันทึกแล้วทำต่อ] [บันทึก] | ท้ายฟอร์ม เต็มกว้าง |

### 4.2 โครงสร้าง — รายจ่าย (`?type=expense`)
Tabs · DateField · MoneyField tone expense "จำนวนเงินที่จ่าย (บาท)\*" · ChoiceGroup chip (danger tone, clearable) 8 ปุ่มลัด + TextInput "หรือพิมพ์รายการเอง" ภายใต้ FormField "จ่ายค่าอะไร\*" · TextInput "หมายเหตุ" · ActionBar (ปุ่มหลักใช้ variant `danger` "บันทึกรายจ่าย" ตามสีเดิมที่แยกโหมด)

### 4.3 States & Interactions
- Validation, คำเตือน (ค้างชำระไม่มีชื่อ → ConfirmDialog §11, ราคา 0, วันที่ย้อนหลัง/อนาคต), busy, ผลสำเร็จ, failure banner, offline และ session หมดอายุ: UF-REC-01..05
- สลับแท็บ: draft ของแต่ละแท็บแยกกัน (ไม่ล้างเมื่อสลับ)
- "บันทึกแล้วทำต่อ" สำเร็จ: toast "บันทึก กข 1234 แล้ว" → focus PlateField
- "บันทึก" สำเร็จ → `/` + toast + highlight

**AC:** AC-04-1..3, AC-05-1, AC-06-1, AC-07-1, AC-08-1, AC-09-1, AC-10-1/2, AC-11-1/2, AC-12-1/2, AC-13-1/2, AC-35-1

## 5. `/history` — ประวัติ

| | |
|---|---|
| วัตถุประสงค์ | ค้นหา, ตรวจสอบ, แก้ไข, ลบ และส่งออก (F-32..F-40) |
| `h1` | "ประวัติ" |

| # | Component | รายละเอียด | Expanded |
|---|---|---|---|
| 1 | PageHeader + MonthYearPicker | `h1` + เดือน/ปี (`?m`, `?y`) | แถวเดียว |
| 2 | Tabs | รายรับ / รายจ่าย (`?tab`) | |
| 3 | PeriodSummary | ยอด + ล้าง/ขัด (รายรับ) + ปุ่ม "ส่งออก Excel" (`?export=1`) | การ์ดแนวนอน |
| 4 | FilterPanel | ค้นหา (`?q`), ช่วงวันที่ (`?from`/`?to`), ประเภท (`?job`) | แถวตัวกรองถาวร |
| 5 | Banner danger (มีเงื่อนไข) | error โหลด อยู่ **บน** รายการ | |
| 6 | รายการ | DayGroupHeader + RecordRow (Compact/Medium) | **DataTable**: วันที่ · เวลา · ทะเบียน/รายการ · ประเภท · ลูกค้า · สถานะ · ราคา · ผู้บันทึก · [แก้ไข] |

**States:** Skeleton (summary + 6 rows) · Empty 2 แบบ: "ไม่มีรายการในเดือน ต.ค. 2569" / "ไม่พบรายการที่ตรงกับ 'กข 99'" + [ล้างตัวกรอง] · Error (ห้ามแสดงยอด ฿0) · offline: แสดงข้อมูลที่โหลดแล้ว + StatusBar
**Interactions:** เปลี่ยนเดือน/ปี → โหลดใหม่ · พิมพ์ค้นหา debounce 250ms + URL replace · แตะรายการ/ปุ่มแก้ไข → dialog §8 · ส่งออก → dialog §10
**AC:** AC-24-1/2, AC-25-1/2, AC-26-x, AC-27-1, AC-28-1, AC-29-1

## 6. `/more` — เพิ่มเติม

| # | Component | เนื้อหา |
|---|---|---|
| 1 | PageHeader | `h1` "เพิ่มเติม" |
| 1a | Link + Card (v2.2.0, Q-1) | การ์ดใหญ่ ≥ 72px "ลูกค้า · ชื่อ เบอร์โทร และทะเบียนรถ ›" → `/customers` (ทางเข้าหลักบนมือถือ) |
| 2 | Card "บัญชี" | อีเมลที่ login อยู่ |
| 3 | Card "การแสดงผล" | Switch "ธีมมืด" (บันทึกใน localStorage `car-care-theme` เดิมเพื่อคงค่าผู้ใช้) |
| 4 | Card "เกี่ยวกับ" | เวอร์ชันแอป, environment (เฉพาะ non-production) และข้อความ "ลืมรหัสผ่านหรือต้องการบัญชีใหม่ ติดต่อผู้ดูแลร้าน" |
| 5 | Button danger-ghost full | "ออกจากระบบ" → `?logout=1` (dialog §12) |

Expanded: เนื้อหาเดียวกันอยู่ล่าง SideNav และ `/more` ยังเปิดได้ (คอลัมน์เดียว max 560px)
**AC:** AC-03-1, AC-36-1

## 6A. `/customers` — ลูกค้า (v2.2.0)

ออกแบบละเอียดใน `docs/features/customer-directory.md` §6 · โค้ด `features/customers/components/CustomersScreen.tsx`

| # | Component | เนื้อหา |
|---|---|---|
| 1 | PageHeader | `h1` "ลูกค้า" · "ทั้งหมด N ราย" · Button primary "+ เพิ่มลูกค้า" → `?new=1` |
| 2 | SearchField | "ค้นชื่อ เบอร์ หรือทะเบียน" (ชื่อ a11y "ค้นหาชื่อ เบอร์ หรือทะเบียน") · ผลเปลี่ยนทันทีขณะพิมพ์ · `?q=` ตามหลัง 300 ms ด้วย `replaceState` · "พบ N ราย" (aria-live) |
| 3a | มือถือ/แท็บเล็ต: การ์ดต่อคน | ลิงก์ (ชื่อ ›, ทะเบียนแรก "· TOYOTA Vios · +N คัน", "ยังไม่มีเบอร์", "ตรงกับ: …" ตอนค้น) + แถวปุ่ม `CallLink` "โทร 080-000-0001" (`<a href="tel:">` ≥ 44px) และ IconButton คัดลอก |
| 3b | PC ≥ 1024: ตาราง | ชื่อ (ลิงก์ + "ตรงกับ: …") · รถ (ทะเบียนแรก + "+N คัน") · ยี่ห้อ / รุ่น (ของคันแรก) · เบอร์หลัก (โทร + คัดลอก + ป้ายเบอร์) |
| 4 | States | Skeleton 6 แถว · ErrorState + ลองอีกครั้ง · "ยังไม่มีลูกค้า" + เพิ่มลูกค้า (เมื่อไม่ได้ค้น) · ไม่พบ "<คำค้น>" + "เพิ่มลูกค้าใหม่ด้วยเบอร์/ทะเบียน …" หรือ "…ชื่อ …" → `?new=search` (เติมคำค้นในช่องที่ตรงชนิด AC-02-5) |

## 6B. `/customers/<id>` — ข้อมูลลูกค้า (v2.2.0)

| # | Component | เนื้อหา |
|---|---|---|
| 1 | ลิงก์ "‹ ลูกค้า" | ถ้ามาจากรายชื่อ = back (คำค้นยังอยู่) ไม่งั้นไป `/customers` |
| 2 | `h1` | ชื่อลูกค้า (title ของหน้าเป็น "ลูกค้า · คาร์แคร์" ไม่ใส่ชื่อ) |
| 3 | Card "เบอร์โทร" | ทุกเบอร์: เบอร์ (เลือกทั้งเบอร์ได้ด้วยการแตะค้าง) · ป้าย · Badge "เบอร์หลัก" (เมื่อมี > 1 เบอร์) · โทร + คัดลอก (Q-10: มือถือด้วย) |
| 4 | Card "รถ" | ทุกคัน: ทะเบียน · "รถกระบะ · TOYOTA Vios · ขาว" · หมายเหตุรถ |
| 5 | Card "หมายเหตุ" | เมื่อมี |
| 6 | Audit | เพิ่มโดย / แก้ไขล่าสุด (อีเมล · เวลา) |
| 7 | ปุ่ม | [แก้ไข] primary ซ้าย → `?edit=customer:<id>` · [ลบลูกค้า] danger-ghost ขวา (ห่างจากปุ่มหลัก) → ConfirmDialog "ลบ <ชื่อ>?" "เบอร์ N เบอร์ · รถ N คัน จะถูกลบด้วย" "ประวัติการล้างรถไม่ถูกลบ" focus ที่ยกเลิก |
| 8 | States | Skeleton · ErrorState · "ไม่พบลูกค้านี้" + กลับรายชื่อ · ลบ/แก้ต้องออนไลน์ |

PC: เบอร์และรถเป็น 2 คอลัมน์ (ประวัติการมาใช้บริการเพิ่มใน Phase 3)

## 6C. Dialog — เพิ่ม/แก้ไขลูกค้า (`?new=1|search`, `?edit=customer:<id>`)

`Dialog` sheet (มือถือ) / 560px (PC) · `<form method="post">` · ปุ่ม "บันทึก" (`form=` ของ footer) disabled จน hydrate, ออฟไลน์ ("รอเชื่อมต่อ" + เหตุผล) และตอนแก้ไขที่ยังไม่เปลี่ยนอะไร · Enter ไปช่องถัดไป (`enterMovesToNextField`) · FormErrorSummary + Banner ผิดพลาด (focus) · ปิดเมื่อมีข้อมูลค้าง → "ทิ้งข้อมูลที่กรอก?" / "ยกเลิกการแก้ไข?"

| ส่วน | เนื้อหา |
|---|---|
| ชื่อ | "ชื่อลูกค้า / เต็นท์" * ≤ 50 |
| เบอร์โทร (fieldset) | ต่อแถว: "เบอร์"/"เบอร์ N" (tel, ตัดช่องว่าง/ขีดเมื่อออกจากช่อง) · "ชื่อเรียกเบอร์ (ไม่บังคับ)" ≤ 30 · radio "เบอร์หลัก" และปุ่มลบ (เมื่อมี > 1 แถว) · คำเตือน "เบอร์นี้เป็นของ B ด้วย" (บันทึกได้, Q-3) · "+ เพิ่มเบอร์" (focus แถวใหม่) |
| รถ (fieldset) | ต่อคัน: "ทะเบียน" (PlateField) · ทะเบียนเต็มของคนอื่น → กล่องเตือน "ทะเบียนนี้อยู่กับ B" + [ย้ายรถมาที่ลูกค้านี้] → "จะย้ายรถคันนี้จาก B มาที่ลูกค้านี้เมื่อกดบันทึก" + [ไม่ย้าย] · ทะเบียนเลขล้วนซ้ำ → คำเตือน "ทะเบียน 1234 มีกับ B ด้วย ตรวจว่าเป็นคันเดียวกันไหม" · ประเภทรถ (ChoiceGroup เลือก/ยกเลิกได้) · ยี่ห้อ (select) · รุ่น ≤ 30 (พิมพ์เอง เช่น Vios, M013) · สี ≤ 30 · "ลบคันที่ N" · "+ เพิ่มรถ" |
| หมายเหตุ | ≤ 200 |
| ผลบันทึก | เพิ่ม → toast "เพิ่มลูกค้า <ชื่อ> แล้ว" + ไปหน้าลูกค้า · แก้ → toast "บันทึกการแก้ไขแล้ว" · CONFLICT → Banner "ลูกค้านี้ถูกแก้จากเครื่องอื่น" + [โหลดข้อมูลล่าสุด] · NOT_FOUND → toast + ปิด · ทะเบียนถูกเพิ่มให้คนอื่นระหว่างกรอก → Banner + โหลดสมุดใหม่ (ปุ่มย้ายปรากฏ) |
| Draft | เฉพาะลูกค้าใหม่: sessionStorage `car-care-draft:<user>:customer` ล้างเมื่อบันทึก/ทิ้ง/ออกจากระบบ · Banner "กู้ข้อมูลที่กรอกค้างไว้แล้ว" + ล้างฟอร์ม |

## 7. not-found & error

| | not-found | error |
|---|---|---|
| Layout | กล่องกลางจอ max 400px, ไม่มี nav | เหมือนกัน |
| เนื้อหา | ไอคอน search-x 40px · `h1` "ไม่พบหน้านี้" · "ลิงก์อาจไม่ถูกต้องหรือถูกย้ายไปแล้ว" · Button primary "กลับหน้าภาพรวม" | ไอคอน alert-triangle · `h1` "เกิดข้อผิดพลาด" · "ข้อมูลที่บันทึกไว้แล้วไม่ได้รับผลกระทบ" · "รหัสอ้างอิง: {digest}" (14px, เลือกคัดลอกได้) · [ลองอีกครั้ง] (primary) [กลับหน้าภาพรวม] (secondary) |

## 8. Dialog — แก้ไขรายการ (`?edit=<kind>:<id>`)

| | |
|---|---|
| Container | Dialog `sheet` (Compact) / `modal` 560px (Medium+) |
| Header | `h2` "แก้ไขรายรับ" / "แก้ไขรายจ่าย" + รอง "กข 1234 · 14 ต.ค. 2569" + IconButton ปิด |
| Body | RecordEditor `mode="edit"`: DateField + TimeField (แถวเดียว) · field เดียวกับ §4 (ไม่มี ActionBar) · AuditInfo |
| Footer (ติดล่าง) | Button danger-ghost "ลบ" (ซ้าย) · Button primary "บันทึกการแก้ไข" (ขวา, disabled จนกว่าจะแก้) |
| ยืนยันลบ | footer เปลี่ยนเป็น inline confirm: "ลบ กข 1234 ฿150 (14 ต.ค.)?" [ยกเลิก] (focus) [ลบรายการ] (danger) |
| ปิดเมื่อมีการแก้ | ConfirmDialog "ยกเลิกการแก้ไข?" [กลับไปแก้ไข] (focus) [ยกเลิกการแก้ไข] |
| States | loading (หา record), not found → toast, validation, busy, failure banner, offline (ปุ่ม disabled) และ session หมดอายุ (UF-EDIT-01, UF-DEL-01) |
| AC | AC-26-1..4, AC-27-1, AC-29-1 |

## 9. Dialog — ยืนยันเคลียร์ยอด (`?settle=<customer>`)

ConfirmDialog (`alertdialog`, 400px):
- `h2` "เคลียร์ยอด เต็นท์ A?"
- สรุป: "จำนวน 6 คัน" · "ยอดรวม ฿8,400" · รายการทะเบียน (สูงสุด 6 แล้วตามด้วย "และอีก N คัน")
- คำอธิบาย "ทุกรายการจะเปลี่ยนเป็น ชำระแล้ว"
- [ยกเลิก] (secondary, focus เริ่มต้น) · [เคลียร์ยอด] (success, loading "กำลังเคลียร์ยอด…")
- ผลไม่ครบ / error แสดงเป็น Banner ใน dialog (UF-DEBT-02)
- **AC:** AC-22-1..3

## 10. Dialog — ส่งออก Excel (`?export=1`)
Dialog modal/sheet 480px · `h2` "ส่งออก Excel" · ExportForm · footer [ยกเลิก] [ดาวน์โหลด Excel] · validation ช่วงเดือน (ข้อความใต้ "ถึง") · loading · empty · error (UF-EXP-01) · **AC:** AC-30-1/2, AC-31-1

## 11. Dialog — บันทึกค้างชำระโดยไม่มีชื่อ
ConfirmDialog: `h2` "ยังไม่ได้ใส่ชื่อลูกค้า" · "รายการค้างชำระที่ไม่มีชื่อจะไปอยู่ในกลุ่ม 'ลูกค้าทั่วไป' และติดตามได้ยาก" · [ใส่ชื่อลูกค้า] (primary, focus → ปิดแล้ว focus CustomerField) · [บันทึกโดยไม่ใส่ชื่อ] (secondary)

## 12. Dialog — ออกจากระบบ (`?logout=1`)
ConfirmDialog: `h2` "ออกจากระบบ?" · "บัญชี x@…" · "ข้อมูลที่กรอกค้างในเครื่องนี้จะถูกล้าง" · [ยกเลิก] (focus) · [ออกจากระบบ] (danger)

## 13. Dialog — ล้างฟอร์ม
ConfirmDialog: "ล้างข้อมูลที่กรอกไว้?" · [ยกเลิก] (focus) · [ล้างฟอร์ม] (danger)

## 14. WeatherDetail (popover / sheet)
`h2` "สภาพอากาศ · {พื้นที่}" · ไอคอน + สภาพ + อุณหภูมิ · ตาราง 2 คอลัมน์: รู้สึกเหมือน, ความชื้น, ลม, โอกาสฝนวันนี้, AQI (ค่า + ระดับข้อความ) · ข้อความแนะนำ · "อัปเดต 09:41" + IconButton รีเฟรช · error: "โหลดข้อมูลอากาศไม่สำเร็จ" + ลองใหม่

---

## 15. Design ↔ User Flow Consistency Check (Task 12)

ตรวจทุก flow ใน `user-flows.md` ว่ามีหน้าจอ, component และ state รองรับครบ

| Flow | หน้าจอ / Dialog | Component ที่รองรับทุกเส้นทาง | ผล |
|---|---|---|---|
| UF-AUTH-01 Login | §1 | LoginForm, FormField error, Banner (3 แบบ), Button loading, StatusBar offline | ✅ |
| UF-AUTH-02 Guard | §0 (redirect) | — (พฤติกรรม route) | ✅ |
| UF-AUTH-03 Session หมดอายุ | dialog ใน shell | ConfirmDialog ("เข้าสู่ระบบอีกครั้ง") + Banner info กู้ draft | ⚠ เพิ่มสเปก §16 |
| UF-AUTH-04 Logout | §6, §12 | ConfirmDialog, Toast | ✅ |
| UF-PERM-01 สิทธิ์ถูกปฏิเสธ | ทุกหน้าที่เขียนข้อมูล | Banner danger "บัญชีนี้ไม่มีสิทธิ์…" | ✅ |
| UF-REC-01 บันทึกรายรับ | §4.1, §11 | RecordEditor, FormErrorSummary, FormField, ConfirmDialog, ActionBar loading, Banner, Toast | ✅ |
| UF-REC-02 Validation | §4 | FormField error + counter | ✅ |
| UF-REC-03 รายจ่าย | §4.2 | เหมือน REC-01 | ✅ |
| UF-REC-04 Offline | §4.3 | StatusBar, ActionBar disabled + hint | ✅ |
| UF-REC-05 Draft | §4.1 #2, §13 | Banner info, ConfirmDialog ล้างฟอร์ม | ✅ |
| UF-EDIT-01 แก้ไข | §8 | RecordEditor edit, ConfirmDialog ปิดเมื่อมีการแก้, Toast not found | ✅ |
| UF-DEL-01 ลบ | §8 inline confirm | Button danger, Toast (+ เลิกทำถ้า Q-02) | ✅ |
| UF-DEBT-01 ดู/เรียง | §3 | SegmentedControl, DebtCustomerCard, EmptyState, ErrorState | ✅ |
| UF-DEBT-02 เคลียร์ยอด | §9 | ConfirmDialog, Banner (ผลไม่ครบ), Toast | ✅ |
| UF-BILL-01 บิล | §3 | Button loading, Toast success/error | ✅ |
| UF-DASH-01 โหลด progressive | §2.2 | Skeleton รายส่วน, ErrorState รายการ์ด, StatusBar realtime | ✅ |
| UF-HIST-01 ค้นหา/กรอง | §5 | FilterPanel, EmptyState 2 แบบ, Banner | ✅ |
| UF-EXP-01 ส่งออก | §10 | ExportForm, validation, loading, empty, error | ✅ |

ผล: 17/18 ครบตั้งแต่ร่างแรก และ 1 รายการ (UF-AUTH-03) ไม่มีหน้าจอเฉพาะ จึงเพิ่ม §16 แล้ว

## 16. Dialog — เซสชันหมดอายุ (เพิ่มจากการตรวจ §15)
ConfirmDialog แบบไม่มีปุ่มยกเลิก (ปิดด้วย Esc ไม่ได้ เพราะทำงานต่อไม่ได้): `h2` "กรุณาเข้าสู่ระบบอีกครั้ง" · "เซสชันหมดอายุ ข้อมูลที่กรอกไว้ยังอยู่ และจะกลับมาหลังเข้าสู่ระบบ" · [เข้าสู่ระบบ] (primary) → `/login?next=<หน้าเดิม>`

## 17. Route → Screen Coverage

| Route / Dialog (sitemap) | Spec |
|---|---|
| `/login` | §1 |
| `/` (+ `?edit`) | §2, §8 |
| `/debts` (+ `?sort`, `?edit`, `?settle`) | §3, §8, §9 |
| `/add` (+ `?type`) | §4, §11, §13 |
| `/history` (+ `?tab`, `?y`, `?m`, `?q`, `?from`, `?to`, `?job`, `?edit`, `?export`) | §5, §8, §10 |
| `/more` (+ `?logout`) | §6, §12 |
| `/customers` (+ `?q`, `?new`) | §6A, §6C |
| `/customers/<id>` (+ `?edit=customer:<id>`) | §6B, §6C |
| not-found, error | §7 |
| Global (shell, status, session) | §0, §16 |
| Weather | §14 |
