# Step 11 — Production Smoke Test Results (v2.1.0)

> 2026-10-19 · ป้ายหลักฐาน: [V] Verified · [I] Inferred · [U] Unknown · สถานะ: Passed / Failed / Not Run
> Production URL: `https://car-care-intelligence-53wd.vercel.app` · ฐานข้อมูล production `fgzeaxntmvirrrsqpmeu`
> **กติกา:** ทดสอบอัตโนมัติแบบอ่านอย่างเดียว ไม่ login และไม่สร้าง/แก้ข้อมูลบน production · ส่วนที่ต้อง login เจ้าของทำเองด้วยบัญชีร้าน (§3)

## 1. รอบที่ 1 — `e63d175` (PR #49) · 22:08–22:12 [V]

### 1.1 HTTP (curl)

| ตรวจ | ผล | สถานะ |
|---|---|---|
| `/` ไม่ login | 307 → `/login` | Passed |
| `/history` `/debts` `/add` `/more` ไม่ login | 307 → `/login?next=<หน้าเดิม>` | Passed |
| `/login` | 200 · 22 KB · 0.89 s · `X-Vercel-Cache: PRERENDER` | Passed |
| ฟอร์ม login | `method="post"` (D-07) | Passed |
| Security headers | CSP (ไม่มี `unsafe-eval`), HSTS `max-age=63072000; includeSubDomains; preload`, `X-Frame-Options: SAMEORIGIN`, `nosniff`, Referrer-Policy, Permissions-Policy | Passed |
| CSP `connect-src` | มี `fgzeaxntmvirrrsqpmeu.supabase.co` (production) | Passed |
| แถบ "ระบบทดสอบ (Preview)" | ไม่มี | Passed |
| เลขเวอร์ชันท้ายหน้า | `v2.1.0-rc.4` (ควรเป็น `v2.1.0` · ดู S11-01 ใน `production-release-report.md`) | ⚠ แก้ในรอบที่ 2 |
| `POST /api/client-errors` ไม่ login | 401 | Passed |
| หน้าที่ไม่มีอยู่ | 404 | Passed |

### 1.2 เบราว์เซอร์ (Playwright · เปิด `/history` แล้วถูกพาไปหน้า login · ไม่กรอก ไม่ส่ง)

| อุปกรณ์ | โหลดเสร็จ | ปุ่มพร้อม | `?next=` | ล้นจอ | console | request ล้ม | สถานะ |
|---|---|---|---|---|---|---|---|
| มือถือ Pixel 7 (Chromium) | 9.5 s* | 9.5 s | ✅ | 0 px | ไม่มี | 0 | Passed |
| PC 1440 (Chromium) | 1.7 s | 1.7 s | ✅ | 0 px | ไม่มี | 0 | Passed |
| iPhone 13 (WebKit) | 3.0 s | 3.1 s | ✅ | 0 px | `interactive-widget` (known, S03-05) | 0 | Passed |
| 320 px (Chromium) | 2.7 s | 2.7 s | ✅ | 0 px | ไม่มี | 0 | Passed |

\* ครั้งแรกหลัง deploy (cache ว่าง) และไม่ได้จำกัด CPU/เน็ต จึงไม่ใช่ตัวเลขประสิทธิภาพ · รอบถัดไปของอุปกรณ์อื่น 1.7–3.0 s [I]

### 1.3 สิ่งที่อยู่ใน JavaScript ที่ส่งให้เบราว์เซอร์

| ตรวจ | ผล | สถานะ |
|---|---|---|
| ชี้ไป Supabase production | มี `fgzeaxntmvirrrsqpmeu` | Passed |
| ไม่มีของ staging | ไม่มี `mfgucpntfiokqygzrhtt` | Passed |
| ไม่มี key ฝั่ง server | ไม่มี `service_role` และ `sb_secret_` · มีเฉพาะ `sb_publishable_…` (public) | Passed |
| Supabase Auth production ทำงาน | `GET /auth/v1/health` → 200 (0.78 s) | Passed |

## 2. รอบที่ 2 — หลังแก้เลขเวอร์ชัน

ก่อน merge ทดสอบบน Preview ของ `5046d23` แล้ว (`production-release-report.md` §5) · PR #50 merge เป็น `8465548` เมื่อ 23:21

ผลบน production (23:33–23:37) [V]:

| ตรวจ | ผล | สถานะ |
|---|---|---|
| เลขเวอร์ชันท้ายหน้า | `v2.1.0` | Passed |
| `/` `/history` `/debts` `/add` `/more` ไม่ login | 307 → `/login` / `/login?next=<หน้าเดิม>` | Passed |
| Security headers | ครบเหมือนรอบ 1 · ไม่มี `unsafe-eval` | Passed |
| ฟอร์ม login | `method="post"` | Passed |
| `POST /api/client-errors` ไม่ login | 401 | Passed |
| JavaScript | ชี้ production · ไม่มีของ staging · ไม่มี `service_role` / `sb_secret_` | Passed |

| อุปกรณ์ | โหลดเสร็จ | ปุ่มพร้อม | `?next=` | ล้นจอ | console | request ล้ม | สถานะ |
|---|---|---|---|---|---|---|---|
| มือถือ Pixel 7 (Chromium) | 6.3 s* | 6.4 s | ✅ | 0 px | ไม่มี | 0 | Passed |
| PC 1440 (Chromium) | 2.0 s | 2.1 s | ✅ | 0 px | ไม่มี | 0 | Passed |
| iPhone 13 (WebKit) | 2.1 s | 2.2 s | ✅ | 0 px | `interactive-widget` (known) | 0 | Passed |
| 320 px (Chromium) | 2.3 s | 2.3 s | ✅ | 0 px | ไม่มี | 0 | Passed |

\* ครั้งแรกหลัง deploy ใหม่ (cache ว่าง) เหมือนรอบ 1

## 3. Smoke test ที่ต้อง login — เจ้าของทำบน production ด้วยบัญชีร้าน

ระบบอัตโนมัติไม่ login production (ไม่มีบัญชีทดสอบบน production และห้ามสร้างข้อมูลทดสอบ) · ข้อ 1–8 อ่านอย่างเดียว · ข้อ 9 ทำเฉพาะเมื่อมีงานจริงของร้าน

| # | ตรวจ | คาดหวัง | ผล |
|---|---|---|---|
| 1 | Login บนมือถือ | เข้าได้ · URL ไม่มีรหัสผ่าน | **Passed** (เจ้าของ ~23:45 บน `v2.1.0`: "Login production ด้วยบัญชีร้าน ใช้ได้") |
| 2 | หน้าภาพรวม | ยอดวันนี้ตรงกับที่รู้ · การ์ดค้างชำระแสดงยอด หรือ "ไม่มียอดค้าง" (ไม่มีช่องว่าง D-09) | **Passed** (เจ้าของ ~23:50 · รายงานรวม "ผ่านหมด" ไม่ได้แยกรายข้อ) |
| 3 | สภาพอากาศ | แสดงอุณหภูมิจริง ไม่ใช่ 0° (D-10) | **Passed** (เจ้าของ ~23:50 · รายงานรวม "ผ่านหมด" ไม่ได้แยกรายข้อ) |
| 4 | กราฟ 7/30 วัน | ขึ้นกราฟ หรือข้อความ "โหลดกราฟไม่สำเร็จ" โดยหน้าอื่นยังใช้ได้ (D-11) | **Passed** (เจ้าของ ~23:50 · รายงานรวม "ผ่านหมด" ไม่ได้แยกรายข้อ) |
| 5 | ค้างชำระ | รายชื่อและยอดเหมือนก่อน release | **Passed** (เจ้าของ ~23:50 · รายงานรวม "ผ่านหมด" ไม่ได้แยกรายข้อ) |
| 6 | ประวัติเดือนนี้ | รายการครบ · ค้นหาทะเบียนได้ | **Passed** (เจ้าของ ~23:50 · รายงานรวม "ผ่านหมด" ไม่ได้แยกรายข้อ) |
| 7 | ส่งออก Excel | ได้ไฟล์ เปิดได้ | **Passed** (เจ้าของ ~23:50 · รายงานรวม "ผ่านหมด" ไม่ได้แยกรายข้อ) |
| 8 | เพิ่มเติม | เวอร์ชัน `v2.1.0` | **Passed** (เจ้าของ ~23:50 · รายงานรวม "ผ่านหมด" ไม่ได้แยกรายข้อ) |
| 9 | บันทึกงานจริง 1 รายการ (เมื่อมีงาน) | บันทึกได้ ขึ้นในภาพรวม | Not Run (ไม่บังคับ · ทำเมื่อร้านเปิดและมีงานจริง) |
