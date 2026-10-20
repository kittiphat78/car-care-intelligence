# Sitemap & Route Map — Step 03

> วันที่: 2026-10-14 · อ้างอิง `information-architecture.md` (UXD-01..09)
> สถานะ route: **คงเดิม** = path เดิมใช้ต่อ · **ใหม่** = path ใหม่ · **เปลี่ยน** = path เดิมแต่พฤติกรรมเปลี่ยน · **ลบ (รออนุมัติ)** = Q-12
> การ implement จริง (App Router segments, parallel/intercepting routes) ตัดสินใน Step 05 และเอกสารนี้กำหนดแค่ **พฤติกรรมที่ผู้ใช้เห็น**

## 1. Sitemap

```
Car Care Intelligence
├── /login                         เข้าสู่ระบบ                      [public]
├── /                              ภาพรวม                         [auth]
│   └── ?edit=<kind>:<id>          ↳ dialog แก้ไขรายการ
├── /debts                         ค้างชำระ (สมุดทวงหนี้)            [auth]  ใหม่
│   ├── ?sort=amount|age
│   ├── ?edit=income:<id>          ↳ dialog แก้ไขรายการ
│   ├── ?settle=<customer>         ↳ dialog ยืนยันเคลียร์ยอด
│   └── ?customer=new              ↳ dialog เพิ่มลูกค้าจากการ์ด (v2.2.0, pushState)
├── /add                           บันทึก                          [auth]
│   ├── ?type=income|expense
│   └── ?customer=new              ↳ dialog "บันทึกเป็นลูกค้า" (v2.2.0, pushState)
├── /history                       ประวัติ                          [auth]
│   ├── ?tab=income|expense&y=&m=&q=&from=&to=&job=
│   ├── ?edit=<kind>:<id>          ↳ dialog แก้ไขรายการ
│   └── ?export=1                  ↳ dialog ส่งออก Excel
├── /customers                     ลูกค้า (สมุดรายชื่อ)              [auth]  ใหม่ v2.2.0
│   ├── ?q=<คำค้น>                 ↳ ไม่ส่งไป server (history.replaceState, ADR-23)
│   └── ?new=1|search              ↳ dialog เพิ่มลูกค้า (search = เติมคำค้นในช่องที่ตรงชนิด)
├── /customers/<id>                ข้อมูลลูกค้า                      [auth]  ใหม่ v2.2.0
│   ├── ?edit=customer:<id>        ↳ dialog แก้ไขลูกค้า
│   └── ?edit=income:<id>          ↳ dialog แก้ไขรายการจากการ์ดประวัติ (Phase 3b)
├── /more                          เพิ่มเติม                        [auth]  ใหม่
│   └── ?logout=1                  ↳ dialog ยืนยันออกจากระบบ
├── (not-found)                    ไม่พบหน้า                        [any]
├── (error)                        เกิดข้อผิดพลาด                    [any]
└── /api/insights, /api/export-excel                              ลบ (รออนุมัติ Q-12)
```

`<kind>` = `income` | `expense` · `<id>` = UUID ของรายการ · `<customer>` = ชื่อลูกค้าแบบ URL-encoded (หรือ token แทนกลุ่ม "ลูกค้าทั่วไป")

**v2.2.0 สมุดรายชื่อลูกค้า** (`docs/features/customer-directory.md`): ทุกพารามิเตอร์ของ `/customers` และ `/customers/<id>` (`q`, `new`, `edit`) เปลี่ยนด้วย `history.pushState`/`replaceState` ของเบราว์เซอร์ จึงไม่มี request ไป server และชื่อ/เบอร์ที่พิมพ์ค้นไม่อยู่ใน log ของ Vercel (ยกเว้นตอนรีเฟรชหน้าที่มี `?q=` ซึ่งเบราว์เซอร์ส่ง URL ทั้งหมด) · `<id>` ของลูกค้าเป็น UUID (ไม่มีชื่อใน URL) · มือถือเข้าจากการ์ด "ลูกค้า" บนสุดของ `/more` (BottomNav คง 5 ช่อง และ "เพิ่มเติม" ติดสถานะเมื่ออยู่ในหน้าลูกค้า) · PC อยู่ใน SideNav ระหว่าง "ประวัติ" กับ "เพิ่มเติม" (Q-1)

## 2. Route Map

| Route | ชื่อหน้า (`<title>`) | Access | วัตถุประสงค์ | Query params | เข้าจาก | ไปต่อได้ | Features | สถานะ | Release |
|---|---|---|---|---|---|---|---|---|---|
| `/login` | เข้าสู่ระบบ · คาร์แคร์ | public (ถ้ามี session → `/`) | ยืนยันตัวตน | `next` (path ภายในเท่านั้น) | เปิดแอปครั้งแรก, session หมดอายุ, logout | `next` หรือ `/` | F-01, F-02 | เปลี่ยน (เพิ่ม `next`) | R5 |
| `/` | ภาพรวม · คาร์แคร์ | auth | ยอดวันนี้, ค้างชำระ, รายการวันนี้, แนวโน้ม | `edit` | nav, หลัง login, หลังบันทึก, PWA start_url | `/debts`, `/add`, `/history`, dialog แก้ไข | F-11..F-19 | เปลี่ยน | R3 |
| `/debts` | ค้างชำระ · คาร์แคร์ | auth | ทวงหนี้, ออกบิล, เคลียร์ยอด | `sort`, `edit`, `settle` | nav, การ์ดค้างชำระบน `/` | dialog แก้ไข, ดาวน์โหลด PDF | F-20..F-22 | **ใหม่** (แทน modal) | R3 |
| `/add` | บันทึกรายการ · คาร์แคร์ | auth | บันทึกรายรับหรือรายจ่าย | `type` | nav (ปุ่มกลาง), PWA shortcut | `/` (บันทึก) หรืออยู่หน้าเดิม (บันทึกแล้วทำต่อ) | F-23..F-31 | เปลี่ยน (`type` ใน URL) | R2 |
| `/history` | ประวัติ · คาร์แคร์ | auth | ค้นหา, ตรวจสอบ, แก้ไข, ลบ และส่งออก | `tab`, `y`, `m`, `q`, `from`, `to`, `job`, `edit`, `export` | nav, PWA shortcut, "ดูทั้งหมด" จาก `/` | dialog แก้ไข, dialog ส่งออก | F-32..F-40 | เปลี่ยน (ตัวกรองใน URL) | R4 |
| `/customers` | ลูกค้า · คาร์แคร์ | auth | ค้นชื่อ/เบอร์/ทะเบียนบางส่วน, โทร, คัดลอกเบอร์, เพิ่มลูกค้า | `q`, `new` | SideNav (PC), การ์ดบน `/more` (มือถือ) | `/customers/<id>`, dialog เพิ่ม | US-01..04 | **ใหม่** | v2.2.0 |
| `/customers/<id>` | ลูกค้า · คาร์แคร์ (ไม่ใส่ชื่อลูกค้าใน title) | auth | ทุกเบอร์ ทุกคัน หมายเหตุ แก้ไข ลบ | `edit` | แถวในรายชื่อ, หลังเพิ่มลูกค้า | กลับรายชื่อ (คงคำค้น), dialog แก้ไข | US-05..09 | **ใหม่** | v2.2.0 |
| `/more` | เพิ่มเติม · คาร์แคร์ | auth | ลิงก์ลูกค้า, บัญชี, theme, logout, เวอร์ชัน | `logout` | nav | `/customers`, `/login` (หลัง logout) | F-04, F-06 | **ใหม่** | R5 |
| not-found | ไม่พบหน้า | any | — | — | URL ผิด, `edit` id ไม่พบ (§4) | `/` | F-10 | คงเดิม | R5 |
| error | เกิดข้อผิดพลาด | any | — | — | runtime error | ลองใหม่, `/` | F-10 | เปลี่ยน (แสดงรหัสอ้างอิง) | R5 |

### 2.1 ค่าเริ่มต้นของ query params

| Param | ค่าเริ่มต้น | Validation | ถ้าค่าไม่ถูกต้อง |
|---|---|---|---|
| `type` (add) | `income` | `income` \| `expense` | ใช้ค่าเริ่มต้น |
| `tab` | `income` | `income` \| `expense` | ใช้ค่าเริ่มต้น |
| `y` | ปีปัจจุบัน (ค.ศ. ใน URL และแสดงเป็น พ.ศ.) | 4 หลัก, ไม่เกินปีปัจจุบัน | ใช้ค่าเริ่มต้น |
| `m` | เดือนปัจจุบัน | `0` (ทั้งปี) หรือ `1..12` | ใช้ค่าเริ่มต้น |
| `q` | ว่าง | ≤ 50 ตัวอักษร | ตัดส่วนเกิน |
| `from`, `to` | ว่าง | `YYYY-MM-DD` และ `from ≤ to` | ไม่ใช้ตัวกรองนั้น |
| `job` | `all` | `all` \| `wash` \| `polish` | `all` |
| `sort` | `amount` | `amount` \| `age` | `amount` |
| `q` (customers) | ว่าง | ข้อความใดก็ได้ (ค้นในเบราว์เซอร์) | — · ลิงก์ "ออกจากระบบ" ตัด `q` ของหน้าลูกค้าออก (ไม่ส่งไป server) |
| `new` (customers) | ไม่มี | `1` (ฟอร์มว่าง) \| `search` (เติมคำค้น) | เปิดฟอร์มว่าง |
| `edit` (customer) | ไม่มี | `customer:<id ของหน้านี้>` | ไม่เปิด dialog |
| `next` (login) | `/` | ต้องขึ้นต้นด้วย `/` และไม่ใช่ `//` (กัน open redirect) | `/` |

> ตัวเลือกปีใน History จำกัดไม่เกินปีปัจจุบัน (ปัจจุบันมีถึง +10 ปี) โดยไม่กระทบข้อมูล

## 3. ความเข้ากันได้กับของเดิม

| ของเดิม | ของใหม่ | การรองรับ |
|---|---|---|
| `/add` (bookmark, PWA shortcut "บันทึกรายรับ") | `/add` = `/add?type=income` | ไม่ต้องทำอะไร |
| `/history` (PWA shortcut "ประวัติรายการ") | `/history` ตามค่าเริ่มต้น | ไม่ต้องทำอะไร |
| Modal ค้างชำระบน `/` | `/debts` | การ์ดค้างชำระลิงก์ไป `/debts` |
| PWA `start_url: "/"` | `/` | ไม่ต้องทำอะไร |
| Manifest shortcuts | เสนอเพิ่ม "ค้างชำระ" → `/debts` และ "บันทึกรายจ่าย" → `/add?type=expense` (ไม่เกิน 4 รายการ) | ต้องติดตั้ง PWA ใหม่หรือรอ browser อัปเดต manifest ซึ่งเป็นพฤติกรรมของ OS [I] |
| Kiosk redirect หลัง reload | reload อยู่หน้าเดิม (FR-PLAT-02) | ลบ `useKioskMode` ใน release ที่มี draft (R2) |
| `/api/insights`, `/api/export-excel` | — | ลบหลังอนุมัติ Q-12 และไม่มี client เรียก |

## 4. Edge cases ของ route

| กรณี | พฤติกรรม |
|---|---|
| ไม่มี session แล้วเปิด route auth ใด ๆ | ไป `/login?next=<path+query>` และหลัง login กลับมาที่เดิม |
| Session หมดอายุระหว่างใช้งาน (เช่น กดบันทึก) | ไม่ redirect ทันที แต่แสดง dialog "กรุณาเข้าสู่ระบบอีกครั้ง" และเก็บ draft ไว้ (`user-flows.md` UF-AUTH-03) |
| มี session แล้วเปิด `/login` | ไป `/` |
| `?edit=income:<id>` แต่ไม่พบรายการ (ถูกลบจากเครื่องอื่น) | ไม่เปิด dialog แต่แสดง toast "ไม่พบรายการนี้ อาจถูกลบไปแล้ว" แล้วลบ `edit` ออกจาก URL |
| `?settle=<ชื่อ>` แต่ลูกค้าไม่มียอดค้างแล้ว | ไม่เปิด dialog และแสดง toast "ไม่มียอดค้างชำระของลูกค้านี้" |
| เปิด `/history?y=2030` | ใช้ปีปัจจุบัน |
| กด back ขณะ dialog เปิด | ปิด dialog และอยู่หน้าเดิม |
| กด back ขณะฟอร์ม `/add` มีข้อมูลค้าง | ออกจากหน้าได้เลยเพราะ draft ถูกเก็บไว้แล้ว (ไม่ถามซ้ำ) และกลับมาจะเห็นข้อมูลเดิม |
| Deep link `/debts` ขณะไม่มียอดค้าง | แสดง empty state |
| `/customers/<id>` ที่ไม่มีหรือถูกลบ | "ไม่พบลูกค้านี้" + ลิงก์กลับรายชื่อ (AC-05-2) |
| เพิ่มลูกค้าแล้ว | ไปหน้าลูกค้าคนนั้นแทนที่ entry ของ dialog · กด back กลับรายชื่อพร้อมคำค้นเดิม |
| ลบลูกค้า | กลับรายชื่อ (back ถ้ามาจากรายชื่อ ไม่งั้น replace ไป `/customers`) |
| พิมพ์ค้นแล้วแตะลูกค้าทันที (< 300 ms) | เขียนคำค้นลง URL ทันทีตอนแตะ และไม่เปลี่ยน URL ภายหลัง (กันการนำทางถูกยกเลิก) |
