# Step 10 — Preview & RC Test Results (v2.1.0)

> 2026-10-19 · ป้ายหลักฐาน: [V] Verified · [I] Inferred · [U] Unknown · สถานะ: Passed / Failed / Blocked / Not Run
> RC ที่ผ่าน: **rc.4 `20a66eb`** (tag `v2.1.0-rc.4`) · รายงาน: `release-candidate-report.md`

## 1. สรุป (rc.4)

| ชั้น | ผล | สถานะ |
|---|---|---|
| CI บน `main` / `develop` (8 job) | `252f081` ผ่าน 8/8 · PR #47, #48 ผ่าน CI ก่อน merge (ruleset) | Passed [V] |
| Unit (Vitest) | 404/404 | Passed [V] |
| E2E Chromium มือถือ + PC (Supabase ในเครื่อง) | 55/55 (เพิ่ม test D-07 ×4, D-11 ×2) | Passed [V] |
| E2E WebKit iPhone 13 + Desktop Safari (ในเครื่อง) | ดู §3 | ดู §3 |
| ไม่มี key ฝั่ง server ใน bundle | ตรวจ `.next/static` | Passed [V] |
| Preview build | rc.1–rc.4 build สำเร็จ (deployment rc.4 `7176839695`) | Passed [V] |
| **Preview ใช้ staging** | ป้าย "ระบบทดสอบ (Preview)" · ทุก request ไป `mfgucpntfiokqygzrhtt.supabase.co` (staging) · ไม่มีไป `fgzeaxntmvirrrsqpmeu` (production) · เวอร์ชัน `2.1.0-rc.4` · CSP ไม่มี `unsafe-eval` | Passed [V] |
| **CUJ บน Preview + staging** | มือถือ 3/3 · PC 6/6 · iPhone 3/3 (§4) | Passed [V] |
| UAT เจ้าของบน Preview | รายการใน §5 | Not Run (ไม่บังคับก่อน Step 11 เพราะเจ้าของใช้งานจริงบน production อยู่แล้ว ดู §6) |

## 2. ในเครื่อง: Chromium [V]

- Build แบบเดียวกับ CI กับ Supabase ในเครื่อง · bundle แสดงเวอร์ชัน RC · ไม่มี key ฝั่ง server
- rc.4: 55/55 ทั้งมือถือและ PC = ชุดเดิม 49 + D-07 (login และฟอร์มบันทึกก่อนหน้าพร้อม × มือถือ/PC) + D-11 (ไฟล์กราฟโหลดไม่ได้ × มือถือ/PC)
- test ใหม่ทุกตัวพิสูจน์ว่าจับได้จริง: D-07 ล้มกับ `252f081`, D-10 (unit) ล้มกับโค้ดเดิม, D-11 ล้มกับ rc.3 และผ่านกับโค้ดที่แก้ [V]

## 3. ในเครื่อง: WebKit (เครื่องยนต์ของ Safari) [V]

WebKit 26.6 ของ Playwright บน Windows แทน iPhone/Safari จริงไม่ได้ทั้งหมด แต่ช้ากว่า Chromium พอให้เห็นปัญหาที่เกิดก่อนหน้าพร้อม

| RC | ผ่าน / ล้ม | ล้มเพราะ |
|---|---|---|
| rc.1 | 26 / 23 | login ไม่ผ่าน (ช่องอีเมลถูกล้าง) → พบ **D-07** · ที่เหลือ = D-08 |
| rc.2 | 40 / 13 | 8 = **D-08** (ช่องแรกใน `/add` ถูกล้าง) · 2 = axe contrast บนปุ่มที่ยัง disabled ระหว่างรอ (WCAG ยกเว้นปุ่มที่ใช้ไม่ได้) · 2 = skip link (WebKit ไม่ Tab ไปที่ลิงก์โดยค่าเริ่มต้น เหมือน Safari) · 1 = จังหวะของ test |
| rc.4 | 44 / 11 (ข้าม 9) | ไม่มี defect ใหม่ · รายละเอียด §3.1 |

### 3.1 rc.4 (3.8 นาที)

| จำนวน | Test | สาเหตุ | ประเภท |
|---|---|---|---|
| 7 | CUJ-3 (PC), CUJ-4 (มือถือ), CUJ-5 (มือถือ + PC), CUJ-6 (มือถือ + PC), regression F-28/29/39 (PC) | ข้อความ "กรุณากรอก…" = ช่องแรกที่พิมพ์ก่อน `/add` พร้อมถูกล้าง | **D-08** (known issue, มีตั้งแต่ v2.0.0) |
| 1 | dialog แก้ไข/ส่งออกเข้าถึงได้ (มือถือ) | `getByRole('dialog', { name: /แก้ไขราย/ })` ไม่ขึ้น = แตะก่อนหน้าพร้อม | ตระกูล D-08 |
| 1 | axe ธีมสว่าง (มือถือ) | `color-contrast` บน `button[value="continue"]` และ `button[value="save"]` ใน `/add` ตอนที่ยัง disabled รอหน้าพร้อม (D-07 fix) · WCAG 1.4.3 ยกเว้นปุ่มที่ใช้ไม่ได้ | ไม่ใช่ defect |
| 2 | skip link (มือถือ + PC) | WebKit ไม่ Tab ไปที่ลิงก์โดยค่าเริ่มต้น (เหมือน Safari) · Chromium ผ่าน | ข้อจำกัดของ WebKit |

เทียบ rc.2 (40 / 13): ผ่านเพิ่ม 4 · ไม่มีหมวดใหม่ · D-11 ไม่พบใน WebKit ในเครื่องเพราะไฟล์โหลดจากเครื่องเดียวกัน (พบบน Preview แทน §4)

## 4. Preview + staging [V]

`https://car-care-intelligence-53wd-ad9hyxgdj-kittiphat78s-projects.vercel.app` (rc.4) · เข้าด้วย "Protection Bypass for Automation" (secret อยู่ใน `.env.preview` ในเครื่อง ไม่ commit) · บัญชีทดสอบของ staging · สคริปต์ `e2e-preview/`

| Test | มือถือ (Pixel 7, Chromium) | PC (1440, Chromium) | iPhone 13 (WebKit) |
|---|---|---|---|
| สภาพแวดล้อม: ป้าย Preview, ฐานข้อมูล staging, เวอร์ชัน, CSP | — | Passed | — |
| บันทึก → เห็น → แก้ราคา → ลบ รายรับ + บันทึก/ลบรายจ่าย | Passed | Passed | Passed |
| ค้างชำระ → บิล PDF → เคลียร์ยอด → ลบ | Passed | Passed | Passed |
| ส่งออก Excel + ทุกหน้าโหลด + axe WCAG 2.2/Label in Name + ไม่มี console error + 320px | Passed | Passed | Passed (รอบที่ 2 หลังให้ test รอหน้าพร้อมก่อนแตะ ปุ่มที่แตะก่อนพร้อมไม่ทำงาน = D-08) |
| ออกจากระบบเครื่องหนึ่ง อีกเครื่องยังใช้ได้ | — | Passed | — |
| เก็บกวาดข้อมูลทดสอบ | — | Passed (ไม่เหลือรายการค้าง) | — |

ข้อความใน console ที่รู้ว่าไม่ใช่ปัญหาแอป (บันทึกไว้ ไม่นับเป็นข้อผิดพลาด):

| ข้อความ | ที่มา |
|---|---|
| `vercel.live/_next-live/feedback/feedback.js` ถูก CSP กัน | Vercel Toolbar ที่ Vercel ใส่ให้เฉพาะ Preview · production ไม่มี |
| `Viewport argument key "interactive-widget" not recognized` (iPhone) | Safari ไม่รองรับ ค่านี้ใช้กับ Chrome Android (S03-05) · บน iPhone คีย์บอร์ดอาจบังปุ่มบันทึก → ต้องดูบนเครื่องจริง [U] |
| `… due to access control checks` (iPhone) | WebKit รายงาน request ที่ถูกยกเลิกเมื่อเปลี่ยนหน้า · Chromium ไม่มีข้อความนี้ในขั้นตอนเดียวกัน |
| WebSocket realtime | realtime ปิดอยู่ |

ปัญหาที่พบจากการทดสอบบน Preview: **D-11** (ChunkLoadError บน iPhone → ไฟล์กราฟโหลดไม่ได้ทำให้ทั้งหน้าพัง) แก้แล้วใน rc.4

## 5. UAT สำหรับเจ้าของบน Preview rc.4 (ไม่บังคับ)

- [ ] หน้า login มีแถบ "ระบบทดสอบ (Preview)" และ `v2.1.0-rc.4` ท้ายหน้า
- [ ] หน้าภาพรวมวันที่ไม่มีหนี้: การ์ด "ไม่มียอดค้าง" ไม่มีช่องว่าง (D-09)
- [ ] สภาพอากาศไม่ขึ้น 0° (D-10)
- [ ] บิล PDF บน iPhone จริง (ยังไม่เคยทดสอบ, S07-41)
- [ ] iPhone: แตะช่องราคาตอนกรอก คีย์บอร์ดบังปุ่มบันทึกหรือไม่

## 6. Production (อ่านอย่างเดียว) [V]

| ตรวจ | ผล |
|---|---|
| deployment ปัจจุบัน | `4162c44` (PR #47) 2026-10-19 20:12 |
| ฟอร์ม login | `method="post"` (D-07 แก้แล้ว) |
| headers | CSP ไม่มี `unsafe-eval`, HSTS, XFO, nosniff, Referrer, Permissions |
| หน้าที่ต้อง login | 307 → `/login?next=…` |
| `POST /api/client-errors` ไม่ login | 401 |
| เจ้าของใช้งานจริง | หน้าภาพรวมแสดงผลถูกต้อง (ภาพหน้าจอเจ้าของ) และพบ D-09 |
