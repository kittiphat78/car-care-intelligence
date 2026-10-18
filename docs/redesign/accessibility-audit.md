# Step 09 — Accessibility Audit

> 2026-10-19 · branch `qa/step-09` (from `main` `ea41d14`) · เป้าหมาย WCAG 2.2 AA (`accessibility-guidelines.md`, NFR-A11Y-01…06)
> ป้ายหลักฐาน: **[V]** Verified (วัด/ทดสอบจริง) · **[I]** Inferred · **[U]** Unknown · สถานะ: Passed / Failed / Blocked / Not Run
> สภาพแวดล้อม: production build ในเครื่อง (`NEXT_PUBLIC_APP_ENV=production` ให้หน้าตาเหมือน production) + Supabase ในเครื่องที่มีข้อมูลปริมาณเท่าร้านจริง (ดู `performance-audit.md` §1) · Chromium (Playwright 1.63.0) ขนาด Pixel 7 และ 1440×900 · axe-core 4.13.0 · Lighthouse 13.5.0
> สคริปต์วัดอยู่ในเครื่องเท่านั้น (ไม่ commit) ส่วนการตรวจที่ควรรันทุก PR อยู่ใน `e2e/` แล้ว

## 1. สรุป

| หัวข้อ | ก่อนแก้ | หลังแก้ | สถานะ |
|---|---|---|---|
| axe WCAG 2.0/2.1/2.2 A/AA + best-practice (ทุกระดับ) ทุกหน้า 7 หน้า + dialog 5 ตัว × ธีมมืด/สว่าง × มือถือ/PC | 0 violation | 0 violation | **Passed** [V] |
| WCAG 2.5.3 Label in Name (กฎทดลองของ axe ที่ปกติไม่รัน, Lighthouse รายงาน) | **Failed** 75 ปุ่ม (ภาพรวม 5, ค้างชำระ 15, ประวัติ 55) | 0 | **Passed** [V] (A-01) |
| WCAG 2.5.8 Target size ≥ 24px | ผ่านทุกปุ่ม | — | **Passed** [V] |
| เป้าหมายโปรเจกต์ ≥ 44px (NFR-A11Y-04) | 3 จุดต่ำกว่า (§3.4) | — | **Failed** (Low, บันทึกไว้) |
| WCAG 2.4.11 Focus Not Obscured (sticky bar) | ไม่พบ focus ถูกบัง ใน ~75 tab stop ต่อหน้า | — | **Passed** [V] |
| WCAG 2.4.7 Focus Visible | ทุก tab stop มีกรอบ focus (ช่องกรอกใช้กรอบที่กล่องนอก) | — | **Passed** [V] (§3.3) |
| WCAG 1.4.10 Reflow ที่ 320px | ไม่มี scroll แนวนอน · ปุ่ม "บันทึกรายจ่าย" ยื่นเกินขอบ (x=336) | ไม่มีอะไรเลยขอบ | **Passed** [V] (A-02) |
| Lighthouse Accessibility | 100 ทุกหน้า (แต่ Label in Name ไม่ผ่าน 3 หน้า) | 100 ไม่มีรายการไม่ผ่าน · v1.2.0 = 90–92 | **Passed** [V] |
| Contrast ของ token | 38 คู่ × 2 ธีม ผ่าน AA (unit test `tokens.test.ts`) | — | **Passed** [V] |
| แจ้งผลเมื่อบันทึกไม่สำเร็จ (IS-1) | ข้อความอยู่นอกจอบนมือถือ | focus ไปที่ข้อความ | แก้แล้ว (U-01, `ux-regression-report.md`) |

ไม่พบปัญหาระดับ Critical · ปัญหาที่พบแก้แล้วในงานนี้ ยกเว้นขนาดปุ่มเทียบเป้าหมาย 44px ของโปรเจกต์ (เกิน AA อยู่แล้ว) · CI ตรวจ WCAG 2.2 + Label in Name และความกว้าง 320px ทุก PR แล้ว (§6)

## 2. วิธีตรวจ

| ตรวจ | วิธี | ขอบเขต |
|---|---|---|
| axe | `AxeBuilder.withTags(wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22a, wcag22aa, best-practice)` เก็บทุก impact (ไม่ใช่เฉพาะ serious/critical แบบ CI) | `/login`, `/`, `/add`, `/add?type=expense`, `/debts`, `/history`, `/history?tab=expense`, `/more` + dialog ส่งออก Excel, ออกจากระบบ, แก้ไขรายการ, เคลียร์ยอด, สภาพอากาศ · ธีมมืดและสว่าง · มือถือและ PC |
| ตรวจว่า axe ทำงานจริง | นับกฎที่ผ่าน (36–45 กฎต่อหน้า) และ `incomplete` | `/`, `/debts`, `/history`, `/add` |
| Label in Name | `withRules(['label-content-name-mismatch'])` + Lighthouse audit เดียวกัน | เหมือนข้างบน |
| Target size | วัด `getBoundingClientRect()` ของทุก element ที่กดได้บน Pixel 7 | 7 หน้า |
| Focus | กด Tab 80 ครั้งต่อหน้า ตรวจกรอบ focus (outline/box-shadow) และใช้ `elementFromPoint` 3 จุดดูว่ามีอะไรบัง | 6 หน้า × มือถือ/PC |
| Reflow | viewport 320×640 วัด `scrollWidth` และ element ที่เลยขอบ | 7 หน้า |
| คีย์บอร์ดทั้ง flow, skip link, dialog | E2E เดิม (`e2e/ui-quality.spec.ts`) + unit ของ Dialog/ChoiceGroup | ทุก PR |

## 3. ผลและการแก้

### 3.1 A-01 — ชื่อปุ่มไม่ตรงกับข้อความบนจอ (WCAG 2.5.3, Level A) · Medium · แก้แล้ว

- **พบ:** Lighthouse `label-content-name-mismatch` ใน `/`, `/debts`, `/history` และ axe (กฎทดลอง) 75 จุด [V]
- **ตัวอย่าง:** แถวรายการแสดง "กข 1234 · ล้างรถ · ฿150 · 10:30" แต่ `aria-label` = "ล้างรถ กข 1234 ฿150 10:30 น. แตะเพื่อแก้ไข" · ปุ่มอากาศแสดง "24° 0%" แต่ชื่อคือ "สภาพอากาศ ฟ้าโปร่ง 24 องศา…" · ปุ่มอัปเดตแสดง "อัปเดต 22:24" แต่ชื่อ "อัปเดตข้อมูล (ล่าสุด 22:24 น.)"
- **ผลกระทบ:** ผู้ใช้ที่สั่งด้วยเสียง (Voice Access, Voice Control) พูดตามที่เห็นแล้วระบบหาไม่เจอ [I]
- **แก้:** แถวรายรับ/รายจ่าย (`RecordRow.tsx`) และแถวหนี้ (`DebtCustomerCard.tsx`) เลิกใช้ `aria-label` ให้ชื่อมาจากข้อความบนจอ + ข้อความซ่อน "แตะเพื่อแก้ไข" ต่อท้าย · ปุ่มอากาศ: ชื่อขึ้นต้นด้วยข้อความบนจอ "24° 0%" แล้วต่อคำอธิบาย · ปุ่มอัปเดต: ข้อความบนจอ + ข้อความซ่อน " น. (โหลดข้อมูลใหม่)"
- **ทดสอบ:** unit `dashboard-screen.test.tsx` (ลำดับชื่อ), E2E CUJ-2 (หาแถวจากทะเบียน→ราคา) · ผลหลังแก้ใน §5

### 3.2 axe — 0 violation ทุกหน้า/ทุก dialog/ทั้งสองธีม [V]

- `incomplete` (axe ตัดสินไม่ได้): `color-contrast` 12 จุดบนหน้าภาพรวม ธีมมืด → ตรวจเอง: เป็นข้อความบนการ์ดที่มีพื้นหลังหลายชั้น สีทั้งหมดมาจาก token ที่ผ่าน contrast ใน `tokens.test.ts` [I] · ยังไม่ได้วัดด้วยเครื่องมือ pixel [U]

### 3.3 Focus (2.4.7, 2.4.11) [V]

- ไม่มี element ใดถูก bottom nav / status bar / action bar บังเมื่อได้ focus (scroll-padding ของ C9 ทำงาน)
- ช่องกรอก (`<input>` ใน `TextInput`) ไม่มี outline ที่ตัว input เอง เพราะกรอบ focus (`border-2 border-primary ring-3`) อยู่ที่กล่องที่ครอบ (`focus-within`) → ภาพหน้าจอยืนยันว่าเห็นกรอบน้ำเงินชัด (state-offline_add.png ช่องราคา) จึงไม่ใช่ปัญหา

### 3.4 Touch target (2.5.8 AA ผ่าน · เป้าหมาย 44px ของโปรเจกต์ไม่ผ่าน 3 จุด) · Low · บันทึกไว้

| จุด | ขนาด (Pixel 7) | หมายเหตุ |
|---|---|---|
| ลิงก์ "ข้ามไปเนื้อหา" | 32×24 | เห็นเฉพาะตอนกด Tab (ผู้ใช้คีย์บอร์ด) |
| ปุ่ม "ปี" ใน date picker | 41×44 | กว้างขาด 3px |
| ช่องค้นหาในหน้าประวัติ | 187×39 | ขาด 5px |
| Switch "ธีมมืด" | 52×32 | ทั้งแถวมีป้ายกำกับ แต่พื้นที่กดคือตัว switch |

แนะนำ (R-A1): ขยายเป็น 44px ในงาน UI ถัดไป · ไม่ได้แก้ในงานนี้เพราะกระทบ layout และเกิน AA แล้ว

### 3.5 Reflow 320px (1.4.10)

- ไม่มี scroll แนวนอนทุกหน้า [V]
- `/add?type=expense`: ปุ่ม "บันทึกรายจ่าย" อยู่ที่ x=190–336 บนจอ 320px ตัวหนังสือโดนตัด (ภาพหน้าจอ) [V] → **A-02** `ActionBar` ขึ้นบรรทัดใหม่ได้: ที่ 320px ปุ่มหลักลงบรรทัดใหม่เต็มความกว้าง (x=16–304) · ที่ 360/412/1440px ตำแหน่งเท่าเดิมทุกพิกเซล [V]

## 4. ไม่ได้ตรวจ (Not Run)

| เรื่อง | เหตุผล |
|---|---|
| Screen reader จริง (TalkBack, VoiceOver, NVDA) | ต้องใช้เครื่องจริงและคนทดสอบ · axe + accessibility tree ของ Chromium เป็นตัวแทนบางส่วน |
| Voice control จริง | เช่นเดียวกัน (A-01 แก้ตามกฎ) |
| Safari / Firefox | Playwright ในงานนี้ใช้ Chromium |
| ซูม 200% บนเครื่องจริง | ตรวจ reflow 320px แทน (เทียบเท่า 1280px ซูม 400%) |
| ผู้ใช้จริงทดสอบ | ไม่อยู่ในขอบเขต (UAT) |

## 5. ผลหลังแก้ [V]

| ตรวจ | ผล |
|---|---|
| axe WCAG 2.2 A/AA + best-practice ทุกหน้า/dialog/ธีม/ขนาดจอ | 0 violation (กฎที่ผ่าน 36–45 ต่อหน้า) |
| Label in Name (axe) `/`, `/debts`, `/history`, `/add` | 0 (ก่อน 5 / 15 / 55 / 0) |
| Lighthouse `label-content-name-mismatch` | ไม่มีหน้าไหนไม่ผ่าน (ก่อน 3 หน้า) |
| Focus: กรอบ focus + ไม่ถูกบัง (6 หน้า × มือถือ/PC) | ไม่มีปัญหา (ไม่นับ input ที่กรอบอยู่ที่กล่องนอก) |
| Reflow 320px | ไม่มี scroll และไม่มี element เลยขอบทุกหน้า |
| Touch target ≥ 24px | ทุกปุ่ม · 3 จุดยังต่ำกว่า 44px (§3.4) |
| ชื่อปุ่มอากาศ (screen reader) | "สภาพอากาศ ‹สภาพ› ‹อุณหภูมิ›° โอกาสฝน ‹n›% แตะเพื่อดูรายละเอียด" · markup นี้ผ่านกฎ axe ในหน้าทดสอบ และหน้าจริงไม่มี Label in Name ไม่ผ่าน (Lighthouse/axe) |

## 6. ตรวจซ้ำทุก PR (เพิ่มใน `e2e/`)

- `expectAccessible` (`e2e/helpers.ts`) ตรวจ WCAG 2.2 A/AA (เดิม 2.1) และเปิดกฎ `label-content-name-mismatch` · ใช้ใน CUJ-1…8 ทั้งมือถือและ PC
- `e2e/ui-quality.spec.ts` ตรวจความกว้างที่ 320px (เดิม 360px) ทุกหน้า
- **พิสูจน์ว่าจับได้จริง:** รันชุดนี้กับ build ก่อนแก้ → ล้ม 5 test (CUJ-1 และ CUJ-6 ทั้งมือถือ/PC จาก Label in Name, และ 320px) · กับ build หลังแก้ผ่านทั้งชุด 49/49 สองรอบ [V]
