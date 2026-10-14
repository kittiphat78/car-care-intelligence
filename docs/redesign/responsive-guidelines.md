# Responsive Guidelines — Step 04

> วันที่: 2026-10-14 · อุปกรณ์เป้าหมาย: มือถือ + tablet + PC บน Chrome และ Safari (D-12)
> Breakpoint tokens: `design-tokens.md` §12 · checklist R-1..R-10: `interaction-specifications.md` §8

## 1. Breakpoints & Layout Grid

| ชื่อ | ช่วง | อุปกรณ์ตัวแทน | Columns | Gutter | Margin | Content max | Nav |
|---|---|---|---|---|---|---|---|
| Compact | 0–599 | มือถือแนวตั้ง (360–430) | 4 | 16 | 16 | 100% | BottomNav |
| Medium | 600–1023 | tablet แนวตั้ง, มือถือแนวนอน | 8 | 16 | 24 | 720 | BottomNav |
| Expanded | 1024–1439 | tablet แนวนอน, laptop | 12 | 24 | 32 | 1200 (ไม่รวม sidebar) | SideNav 240 |
| Wide | ≥ 1440 | desktop | 12 | 24 | auto (กึ่งกลาง) | 1200 | SideNav 240 |

**Mobile-first:** เขียน style ฐานสำหรับ Compact แล้วเพิ่มด้วย `md:` (600) และ `lg:` (1024) เท่านั้น ห้ามใช้ max-width media query ยกเว้นกรณีพิเศษที่ต้องระบุเหตุผล

**ความสูงต่ำ:** `@media (max-height: 500px)` (มือถือแนวนอน) ซ่อน ActionBar label "บันทึกย้อนหลัง" และลดขนาด MoneyHero เป็น `--text-title-lg`

## 2. Navigation Behavior

| | Compact | Medium | Expanded |
|---|---|---|---|
| Primary nav | BottomNav 5 ช่อง (64px + safe-area) | BottomNav 5 ช่อง (ป้ายข้างไอคอนเมื่อกว้าง ≥ 720) | SideNav ซ้าย แสดงตลอด |
| ปุ่มบันทึก | วงกลมกลาง BottomNav | วงกลมกลาง | Button primary บนสุดของ SideNav |
| Badge ค้างชำระ | บนไอคอน | บนไอคอน | ท้ายข้อความ "ค้างชำระ (3)" |
| เพิ่มเติม | ช่องที่ 5 → `/more` | ช่องที่ 5 → `/more` | อยู่ล่าง SideNav และ `/more` เปิดได้ |
| Dialog | Bottom sheet | Modal | Modal |
| Toast | ล่าง เหนือ nav | ล่าง เหนือ nav | มุมขวาล่าง |

## 3. Page-by-page Layout

| หน้า | Compact | Medium | Expanded |
|---|---|---|---|
| `/login` | การ์ดเต็มกว้าง (margin 16) | การ์ด 400 กึ่งกลาง | การ์ด 400 กึ่งกลาง |
| `/` | 1 คอลัมน์: Hero → หนี้ → รายการ → กราฟ → ลูกค้า | 1 คอลัมน์ และ StatItem 4 ช่องเรียงแถวเดียว | 2 คอลัมน์ (7/5): ซ้าย Hero + รายการ · ขวา หนี้ + กราฟ + ลูกค้า |
| `/debts` | การ์ดซ้อนแนวตั้ง | การ์ดซ้อน (กว้าง 720) | grid 2 คอลัมน์ |
| `/add` | 1 คอลัมน์ + ActionBar ติดล่าง | 1 คอลัมน์ (กว้าง 720) + ActionBar ติดล่าง และประเภทรถ grid 3 | ฟอร์ม 2 คอลัมน์ (6/6) + ปุ่มท้ายฟอร์ม (ไม่ติดล่าง) |
| `/history` | RecordRow + DayGroupHeader + FilterPanel พับ | เหมือน Compact + FilterPanel เปิดค้างได้ | DataTable + แถวตัวกรองถาวร |
| `/more` | การ์ดซ้อน | กว้าง 560 | กว้าง 560 |
| Dialog แก้ไข | sheet สูงสุด 90dvh | modal 560 | modal 560 |

## 4. Touch, Pointer & Input

| เรื่อง | กฎ |
|---|---|
| Touch target | ≥ 44×44 ทุกขนาดจอ (ไม่ลดบน PC) และปุ่มบันทึก/ยืนยันหลัก 56 |
| Hover | ใช้เฉพาะใน `@media (hover: hover) and (pointer: fine)` และไม่ซ่อนข้อมูลหลัง hover |
| ระยะนิ้วโป้ง | action หลักของ Compact อยู่ครึ่งล่าง (ActionBar, BottomNav) และปุ่มอันตราย (ลบ) ไม่อยู่ติดปุ่มบันทึก |
| คีย์บอร์ด PC | ทุก action ใช้คีย์บอร์ดได้ และไม่มี shortcut เฉพาะใน MVP (ไม่จำเป็นและเสี่ยงชนกับ screen reader) |
| Virtual keyboard | ใช้ `interactive-widget=resizes-content` ใน viewport meta และตรวจด้วย `visualViewport` เพื่อซ่อน ActionBar ขณะพิมพ์บน Compact (S03-05) |
| Input font | ≥ 16px (ใช้ 18px) เพื่อกัน iOS Safari ซูมอัตโนมัติเมื่อ focus |
| Orientation | ทุกหน้าใช้ได้ทั้ง 2 แนว (manifest `orientation: any` คงเดิม) |

## 5. Safe Areas & Viewport

- viewport meta: `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content` **โดยไม่มี** `maximum-scale` และ `user-scalable=no` (NFR-A11Y-02)
- ใช้ `env(safe-area-inset-*)` กับ BottomNav, ActionBar, sheet และ StatusBar
- ใช้ `100dvh` สำหรับความสูงเต็มจอ (คงเดิม) และมี fallback `100vh`
- PWA standalone: `overscroll-behavior-y: contain` ที่ `html` เพื่อกัน pull-to-refresh (IS §6)

## 6. Typography Scaling

| Token | Compact | Medium | Expanded |
|---|---|---|---|
| MoneyHero ตัวเลข | 40px | 40px | 48px |
| `h1` | 24px | 24px | 28px |
| เนื้อหา | 16px | 16px | 16px |
| ข้อความเล็กสุด | 14px | 14px | 14px |

ไม่ใช้ fluid typography (`clamp`) กับตัวเลขเงิน เพื่อให้ขนาดคาดเดาได้

## 7. Images, Icons, Charts

- ไอคอนเป็น SVG ขนาดตาม token และไม่ใช้ emoji เป็นไอคอนสื่อความหมาย
- กราฟ: `ResponsiveContainer` ความสูงตาม breakpoint (200/200/240) และแกน X ของ 30 วันแสดง label ทุก 5 วันบน Compact
- ไม่มีรูปภาพเนื้อหา (ระบบไม่มี upload)

## 8. Testing Matrix (Step 09)

| Viewport | Browser | Theme |
|---|---|---|
| 360×780 (Android) | Chrome | มืด + สว่าง |
| 390×844 (iPhone) | Safari | มืด + สว่าง |
| 768×1024 (iPad แนวตั้ง) | Safari | มืด |
| 1024×768 (tablet แนวนอน) | Chrome | สว่าง |
| 1440×900 (desktop) | Chrome + Safari | มืด + สว่าง |
| 200% zoom ที่ 1280px | Chrome | สว่าง |
