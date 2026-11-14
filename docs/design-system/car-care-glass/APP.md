# ระบบดีไซน์ "คาร์แคร์กระจก" (Car Care Glass)

> สถานะ: **PR 1/8 tokens** (2026-11-14) · ADR-28 (`docs/redesign/architecture-decisions.md`) · **ไฟล์นี้ override [`MASTER.md`](./MASTER.md)** ซึ่งเป็นผลดิบจากสกิล
> ค่าจริงอยู่ที่ `app/styles/tokens.css` · ตาราง contrast ที่ `docs/redesign/design-tokens.md` §3.3–3.4 · test `app/styles/__tests__/tokens.test.ts`

## 1. ที่มา

- **โจทย์ของเจ้าของ (2026-11-14):** "modern SaaS analytics dashboard … glassmorphism cards … real-time data visualization … clarity and professional feel" + รูปตัวอย่าง 2 รูป แปลงเป็นแอปร้านล้างรถ ไม่ใช่หน้าขายของ · ฟอนต์ Noto Sans Thai · ปุ่มหลักน้ำเงิน · ไม่เพิ่มไลบรารี
- **สกิล ui-ux-pro-max 2.15.0:** `--design-system "SaaS analytics dashboard glassmorphism real-time data visualization professional clarity car wash staff Thai" --variance 6 --density 6 --motion 3 -p "Car Care Glass"` + ค้นแยก 11 คำค้น (ผลดิบอยู่ใน mockup และ `MASTER.md`)
- **Mockup ที่เจ้าของ OK:** หน้าแรก, เพิ่มรายการ, ประวัติ, ลูกค้า, เข้าสู่ระบบ ทั้งมือถือ 390 / จอคอม 1440 / สว่าง / มืด

## 2. หลักการ

1. **กระจกเพื่อความชัด ไม่ใช่ตกแต่ง:** การ์ดโปร่งพอเห็นแสงไล่สีด้านหลัง แต่ทึบพอให้ตัวอักษรผ่าน AA ทุกจุด
2. **blur เฉพาะชิ้นที่ลอยทับ:** แถบบน, เมนูล่าง, เมนูข้าง, แถบปุ่มบันทึก, dialog, toast · การ์ด แถว และตารางไม่มี blur (มือถือ Android ราคาประหยัดวาด blur ช้า)
3. **ตัวเลขจริงเท่านั้น:** ป้ายและการ์ดทุกใบใช้ข้อมูลที่ระบบโหลดอยู่แล้ว ไม่มีตัวเลขโฆษณา ไม่มี "Live" ถ้าข้อมูลไม่ได้สด
4. **ความหมายของสีเดิม:** น้ำเงิน = ปุ่มหลัก · เขียว/แดง = เงินเข้า/ออก (มี +/− หรือลูกศรเสมอ) · อำพัน = ค้างชำระ · ฟ้า = ล้างรถ · ม่วง = ขัดสี
5. **ไม่ช้าลง:** ทุก PR วัดแบบจับคู่กับ develop ถ้าช้าลงต้องแจ้งเจ้าของก่อนส่ง

## 3. Tokens

ชื่อ token เดิมทั้งหมดคงไว้ (component ไม่ต้องเปลี่ยนชื่อ) เปลี่ยนค่า และเพิ่มชุดกระจก:

| Token | มืด | สว่าง | ใช้กับ |
|---|---|---|---|
| `--color-bg` | #0A0F1E | #F3F6FD | พื้นหลังแอป |
| `--color-glow-a` | rgb(37 99 235 / .28) | rgb(96 165 250 / .24) | แสงฟ้ามุมซ้ายบน (ชั้นตรึงหลังหน้า `body::before`) |
| `--color-glow-b` | rgb(124 58 237 / .24) | rgb(167 139 250 / .20) | แสงม่วงมุมขวาบน |
| `--color-glass` | rgb(255 255 255 / .06) | rgb(255 255 255 / .74) | การ์ดกระจก (ไม่ blur) |
| `--color-glass-border` | rgb(255 255 255 / .10) | rgb(255 255 255 / .90) | ขอบสว่างบางของกระจก |
| `--color-glass-float` | rgb(15 22 41 / .72) | rgb(255 255 255 / .70) | ชิ้นลอยที่ blur |
| `--color-glass-float-solid` | #121A2E | #F7F9FE | ชิ้นลอยเมื่อไม่ blur (ไม่รองรับ / ลดความโปร่งใส) |
| `--blur-float` | 12px | 12px | ค่า blur เดียวของทั้งแอป |
| `--color-gradient-from` → `-to` | #60A5FA → #C084FC | #1D4ED8 → #6D28D9 | หัวข้อและเส้นกราฟไล่สี |
| `--color-action-primary` | #2563EB | #2563EB | ปุ่มหลัก (สว่างเดิม #1D4ED8) |
| `--color-action-primary-edge` | #60A5FA | #2563EB | ขอบปุ่มหลัก ให้ปุ่มเห็นชัดบนกระจกมืด |
| `--color-live` | #22C55E | #22C55E | จุดสถานะ "ออนไลน์" (มีข้อความกำกับเสมอ) |

ค่าอื่นที่เปลี่ยน: neutral ทั้งชุด (พื้น, การ์ด, ข้อความรอง, เส้น) ทั้งสองธีม · **ธีมสว่าง** ตัวเลขรายรับ/รายจ่าย/ค้างชำระ/ล้างรถ เข้มขึ้นหนึ่งระดับ (เพื่อผ่าน 4.5:1 บนจุดที่แสงไล่สีเข้มสุด) · ความหมายสีเหมือนเดิม

## 4. กฎของกระจก

| ชิ้น | พื้น | blur | ขอบ / เงา |
|---|---|---|---|
| การ์ด (Card, ส่วนสรุป, แถวในการ์ด) | `--color-glass` | ไม่มี | `--color-glass-border` + `--shadow-elevation-1` |
| แถบบน, เมนูล่าง, เมนูข้าง, แถบปุ่มบันทึก | `--color-glass-float` | `--blur-float` | `--color-glass-border` |
| Dialog, Toast | `--color-glass-float` | `--blur-float` | `--shadow-elevation-3` |
| ช่องกรอก, ปุ่มรอง | `--color-surface` (ทึบ) | ไม่มี | `--color-border-strong` (3:1) |

- `@supports (backdrop-filter: blur())` เท่านั้นที่ใช้พื้นโปร่ง ถ้าไม่รองรับใช้ `--color-glass-float-solid`
- `@media (prefers-reduced-transparency: reduce)` → พื้นทึบ ไม่ blur
- ตัวอักษรทุกสีที่วางบนกระจกได้ 4.5:1 เมื่อวัดบน **กรณีแย่ที่สุด** = กระจกซ้อนบนจุดที่แสงไล่สีเข้มที่สุด (test ตรวจทุกครั้ง)
- ห้าม blur บนรายการยาว, การ์ดซ้อน blur, หรือ blur เกิน 12px

## 5. ตัวอักษร

**Noto Sans Thai** (variable 100–900, ใช้ 400–700) ผ่าน `next/font/google` · ไทย + ละติน **56 KB** (Sarabun 4 น้ำหนักเดิม 84 KB) · ขนาดและ line-height ตาม `design-tokens.md` §4 เดิม · ตัวเลขเงิน `tabular-nums` · บิล PDF ยังใช้ Sarabun ของตัวเอง (`public/fonts`)

## 6. มุม เงา ระยะ

- มุม: `sm` 10 · `md` 14 (ปุ่ม, ช่องกรอก) · `lg` 20 (การ์ด) · `xl` 24 (sheet, dialog) · `full` (ป้าย, ชิป)
- เงา: กว้างและนุ่ม (`0 10px 30px -16px`) สีน้ำเงินเทาในธีมสว่าง ดำในธีมมืดพร้อมแสงบนบาง ๆ
- ระยะ: ตามเดิม (density 6 ของสกิล = มาตรฐาน 4–64px) · ปุ่มและแถวสูง ≥ 44px ห่างกัน ≥ 8px

## 7. การเคลื่อนไหว

CSS เท่านั้น (ไม่ใช้ GSAP ที่สกิลแนะนำ, ADR-14) · transform / opacity ≤ 200ms · กดแล้วย่อ 2% · ไม่มี scroll reveal · ปิดเมื่อ `prefers-reduced-motion`

## 8. ส่วนที่ override `MASTER.md`

| MASTER.md (สกิล) | แอปใช้ | เหตุผล |
|---|---|---|
| Primary #1E293B slate | น้ำเงิน #2563EB | เจ้าของกำหนด "ปุ่มหลักสีน้ำเงิน" · `--domain color` "Analytics Dashboard" ก็เป็นโทนน้ำเงิน |
| Accent #22C55E เป็นปุ่ม CTA | เขียวเฉพาะสถานะดี / เงินเข้า | สีมีความหมายเดียว (DP-2) |
| Fira Code + Fira Sans | Noto Sans Thai | Fira ไม่มีอักษรไทย · `--domain typography "Thai font dashboard"` ผลที่ 1 = Noto Sans Thai |
| Backdrop blur 10–20px ทุกการ์ด | 12px เฉพาะชิ้นลอย | ความเร็วบนมือถือราคาประหยัด · quick-reference `blur-purpose` |
| การ์ดโปร่ง 15–30% | 74% (สว่าง) / 6% (มืด) | การ์ดไม่ blur จึงต้องทึบพอให้ตัวอักษรผ่าน · pro-rules "Surface readability" |
| GSAP Scroll Reveal | CSS ≤ 200ms ไม่มี scroll reveal | ADR-14 · เนื้อหาต้องเห็นครบตั้งแต่โหลด |
| Pattern "Real-Time / Operations Landing" (CTA Start trial) | ไม่มี CTA ขายของ | เป็นแอปใช้งาน ไม่ใช่หน้าขาย · ใช้เฉพาะข้อ "label live only when backed by a current source" |
| Library กราฟ D3 / CanvasJS / ApexCharts | recharts เดิม + SVG/CSS | ADR-14, ADR-18 |

## 9. ข้อมูลบนหน้าแรก (ตกลงกับเจ้าของแล้ว)

| ส่วน | ข้อมูล |
|---|---|
| ยอดวันนี้ + ▲/▼ % จากเมื่อวาน | `dashboard_today` |
| กราฟเส้นไล่สี 7/30 วัน | `daily_series` 30 วัน |
| การ์ด วันนี้ / สัปดาห์นี้ (ตั้งแต่วันจันทร์) / เดือนนี้ | `dashboard_today` + `customer_breakdown` |
| โดนัทล้าง/ขัด, แถบรับเงินแล้ว/ค้าง | `dashboard_today` |
| ป้าย ซิงก์แล้ว · ลูกค้าเดือนนี้ · ค้างชำระ N ราย | เวลาโหลด + `customer_breakdown` + รายการค้างชำระ |

**ยังไม่ทำ (เจ้าของสั่ง 2026-11-14):** % เทียบสัปดาห์/เดือนก่อน และจำนวนลูกค้าทั้งหมดในสมุด (ต้องดึงข้อมูลเพิ่ม)

## 10. แผน PR

| # | branch | เนื้อหา | สถานะ |
|---|---|---|---|
| 1 | `feature/ux-glass-tokens` | tokens + ฟอนต์ + แสงพื้นหลัง + เอกสารนี้ + ADR-28 | ส่งตรวจ |
| 2 | ชิ้นส่วนพื้นฐาน | Button, TextInput, Card, Dialog, Badge, Tabs, Switch, Toast, Skeleton | |
| 3 | เมนู | BottomNav, SideNav, PageHeader, ActionBar (blur) | |
| 4 | หน้าแรก | ส่วนบน + กราฟ + ทางลัด + การ์ด 3 ช่อง + ป้ายสถานะ | |
| 5 | เพิ่ม / แก้รายการ | | |
| 6 | ประวัติ | | |
| 7 | ลูกค้า + ค้างชำระ | | |
| 8 | ตั้งค่า + เข้าสู่ระบบ + PWA | `manifest.json` theme/background color ตาม `--color-bg` ใหม่ | |
