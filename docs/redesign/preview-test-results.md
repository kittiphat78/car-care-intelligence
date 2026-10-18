# Step 10 — Preview & RC Test Results (v2.1.0)

> 2026-10-19 · ป้ายหลักฐาน: [V] Verified · [I] Inferred · [U] Unknown · สถานะ: Passed / Failed / Blocked / Not Run
> RC: rc.1 `ad86e1e` (ไม่ผ่าน, D-07) → **rc.2 `8e7d036`** · รายงาน: `release-candidate-report.md`

## 1. สรุป

| ชั้น | rc.1 | rc.2 |
|---|---|---|
| CI บน `main` `252f081` (8 job) | Passed [V] | (โค้ดเดียวกัน + hotfix) |
| Unit (Vitest) | 400/400 Passed [V] | 402/402 Passed [V] |
| E2E Chromium มือถือ + PC (Supabase ในเครื่อง) | 49/49 Passed [V] | 53/53 Passed [V] (hotfix branch, เนื้อหาเดียวกับ rc.2) |
| E2E WebKit iPhone 13 + Desktop Safari | **Failed** 26 ผ่าน / 23 ล้ม → พบ D-07 | 40 ผ่าน / 13 ล้ม: 8 = D-08 (มีตั้งแต่ v2.0.0), 5 = ข้อจำกัดของ WebKit/การทดสอบ (§3) |
| Preview build ของ Vercel | Passed (deployment `7161479807`) [V] | Passed (deployment `7161810137`) [V] |
| Preview ใช้ staging | **Blocked** (Vercel Authentication) · [I] จาก env guard | **Blocked** |
| CUJ / responsive / console บน Preview + staging | **Blocked** | **Blocked** · สคริปต์พร้อมใน `e2e-preview/` |
| Production (อ่านอย่างเดียว) | — | headers, redirect, API 401, manifest ปกติ [V] · **มี D-07** |

## 2. ในเครื่อง: Chromium [V]

- Build แบบเดียวกับ CI (`next build` + `next start`) กับ Supabase ในเครื่อง · bundle แสดง `2.1.0-rc.1` · ไม่มี key ฝั่ง server ใน `.next/static`
- rc.1: 49/49 (CUJ-1…8, security/RLS, regression, UI quality, ออกจากระบบ 2 เครื่อง, CSP) ทั้งมือถือและ PC
- rc.2 / hotfix: 53/53 = 49 เดิม + test D-07 ใหม่ 4 ตัว (login และฟอร์มบันทึก × มือถือ/PC)
- test D-07 ใหม่ **ล้มกับ `252f081`** (form method ว่าง = GET) และ **ผ่านกับ hotfix** [V]

## 3. ในเครื่อง: WebKit (เครื่องยนต์ของ Safari) [V]

WebKit 26.6 ของ Playwright บน Windows ใช้แทน iPhone/Safari จริงไม่ได้ทั้งหมด แต่ช้ากว่า Chromium พอให้เห็นปัญหาที่เกิดตอนหน้ายังไม่พร้อม

| ล้ม (rc.2) | จำนวน | สาเหตุ | ประเภท |
|---|---|---|---|
| CUJ-3 (มือถือ, PC), CUJ-4, CUJ-5 (มือถือ, PC), CUJ-6, regression F-28/29/39 (มือถือ, PC) | 8 | **D-08** ช่องแรกที่พิมพ์ทันทีหลังเปิด `/add` ถูกล้างเมื่อหน้าพร้อม → "กรุณากรอกป้ายทะเบียน" / "กรุณากรอกจำนวนเงิน" (ภาพ snapshot ทุกตัว) | ปัญหาแอป (มีตั้งแต่ v2.0.0) · ฟอร์มไม่ยอมบันทึกข้อมูลไม่ครบ จึงไม่มีข้อมูลผิดเข้า DB |
| CUJ-1 (มือถือ, `/login`), light theme `/add` | 2 | axe `color-contrast` บนปุ่มที่ยัง disabled ระหว่างรอหน้าพร้อม (การป้องกัน D-07) · WCAG ยกเว้นปุ่มที่ใช้งานไม่ได้ [I] | ผลของการทดสอบเร็วกว่าหน้าพร้อม |
| skip link (มือถือ, PC) | 2 | WebKit (เหมือน Safari) ไม่ให้ Tab ไปที่ลิงก์โดยค่าเริ่มต้น (ต้องเปิด "Press Tab to highlight each item" หรือกด Option+Tab) [I] | พฤติกรรมเบราว์เซอร์ |
| CSP violation (มือถือ) | 1 | `page.goto` ถูกขัดด้วยการเปลี่ยนหน้าของ dialog ก่อนหน้า (จังหวะของ test บน WebKit) [I] | การทดสอบ |

rc.1 ล้มเพิ่มอีก 10 ตัวจากการ login ไม่ผ่าน: ช่องอีเมลที่ test กรอกถูกล้างก่อนกดเข้าสู่ระบบ → นำไปสู่การพบ D-07 · หลัง hotfix การ login บน WebKit ผ่านทุก test [V]

## 4. Preview + staging (Blocked)

- rc.1 `https://car-care-intelligence-53wd-iamos4fr6-kittiphat78s-projects.vercel.app` · rc.2 `https://car-care-intelligence-53wd-qh8wmkf99-kittiphat78s-projects.vercel.app`
- ทั้งสองตอบ `302` ไป `vercel.com/sso-api` ("Protected by Vercel Authentication") [V] → เปิดหน้า, ดู env label, ทดสอบ CUJ และวัดเวลากับ Supabase cloud **ไม่ได้**
- เตรียมแล้ว: `e2e-preview/` (มือถือ Chromium, PC, iPhone WebKit) ตรวจ: ป้าย "ระบบทดสอบ (Preview)", ทุก request ไปฐานข้อมูล staging (`mfgucpntfiokqygzrhtt`) ไม่มีไป production (`fgzeaxntmvirrrsqpmeu`), เวอร์ชัน 2.1.0, CSP, CUJ บันทึก/แก้/ลบ, ค้างชำระ → บิล → เคลียร์ยอด, Excel, ทุกหน้า + axe WCAG 2.2 + 320px + console, ออกจากระบบเฉพาะเครื่อง · สร้างข้อมูลเองแล้วลบเอง · ปฏิเสธการรันกับโดเมน production
- ต้องการจากเจ้าของ: secret "Protection Bypass for Automation" ในไฟล์ `.env.preview` (ไม่ commit) แล้วรัน:
  `PREVIEW_URL=<rc.2 URL> PREVIEW_BYPASS=… STAGING_EMAIL=… STAGING_PASSWORD=… npx playwright test -c e2e-preview/playwright.config.ts`

## 5. UAT สำหรับเจ้าของบน Preview rc.2 (เปิดได้ด้วยบัญชี Vercel ของเจ้าของ)

- [ ] หน้า login มีแถบ "ระบบทดสอบ (Preview)" และเลขเวอร์ชัน `v2.1.0-rc.2` ท้ายหน้า
- [ ] Login ด้วยบัญชีทดสอบ staging · ลองกดเข้าสู่ระบบเร็ว ๆ ทันทีที่หน้าโผล่ → URL ต้องไม่มี `password=`
- [ ] บันทึกรถ 2 คันด้วย "บันทึกแล้วทำต่อ" · กด Enter ในช่องราคาแล้วต้องไม่บันทึกเอง
- [ ] หน้าภาพรวม: เปิดใหม่หลายครั้ง การ์ดไม่กระโดดตอนข้อมูลมา
- [ ] ค้างชำระ: สร้างบิล PDF (iPhone ด้วยถ้ามี) · เคลียร์ยอด
- [ ] ประวัติ: ค้นหา · แก้ราคา · ลบรายการทดสอบ · ส่งออก Excel
- [ ] ออกจากระบบบนมือถือ แล้วดูว่า PC ที่ login บัญชีเดียวกันยังใช้ได้
- [ ] ปิดเน็ตมือถือแล้วกดบันทึก → ปุ่มขึ้น "รอเชื่อมต่อ"

## 6. Production (อ่านอย่างเดียว, 2026-10-19) [V]

| ตรวจ | ผล |
|---|---|
| deployment ปัจจุบัน | `252f081` (Production, 2026-10-19 05:05) ตาม GitHub deployments |
| `/login` headers | CSP **ไม่มี** `unsafe-eval` (D-05 ขึ้นแล้ว), HSTS, XFO, nosniff, Referrer, Permissions |
| `/`, `/add`, `/debts`, `/history`, `/more` ไม่ login | 307 → `/login?next=…` |
| `POST /api/client-errors` ไม่ login | 401 |
| `/manifest.json` | 200 |
| ฟอร์ม login ใน HTML | `<form noValidate …>` ไม่มี method + มี `name="password"` → **D-07 อยู่บน production** |
