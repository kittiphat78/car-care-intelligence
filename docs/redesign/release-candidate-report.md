# Step 10 — Release Candidate Report (v2.1.0)

> 2026-10-19 · ป้ายหลักฐาน: [V] Verified · [I] Inferred · [U] Unknown · สถานะ: Passed / Failed / Blocked / Not Run
> ใช้เป็น issue log ของ Step 10 ด้วย (§5) · ผลทดสอบ: `preview-test-results.md` · ความพร้อม: `production-readiness-checklist.md` · notes: `release-notes-draft.md`

## 1. สรุป

| | |
|---|---|
| RC ล่าสุด | **`v2.1.0-rc.2`** · `release/2.1.0` @ `8e7d036` |
| RC ก่อนหน้า | `v2.1.0-rc.1` @ `ad86e1e` → **ไม่ผ่าน** (D-07 รหัสผ่านอาจไปอยู่ใน URL) |
| Preview | build สำเร็จทั้ง rc.1 และ rc.2 แต่ **เปิดไม่ได้** เพราะ Vercel Authentication → ทดสอบบน Preview = **Blocked** จนเจ้าของให้สิทธิ์ (§6) |
| ฐานข้อมูล | ไม่มี migration ใหม่ตั้งแต่ v2.0.0 · แอปเรียกตาราง/RPC/คอลัมน์เดิมทุกตัว [V] |
| **ข้อค้นพบสำคัญ** | **`main` deploy ขึ้น production อัตโนมัติ** ทุกครั้งที่ merge: Step 08, D-05, D-03, Step 09 ขึ้น production แล้วโดยไม่ผ่าน RC/UAT · production ตอนนี้ = `252f081` ซึ่งมี D-07 อยู่ (§3) |
| ต้องทำด่วน | merge PR hotfix `fix/login-before-hydration` → `main` (ซึ่งจะ deploy production) · หรือ rollback ชั่วคราว (§3.2) |

## 2. สิ่งที่อยู่ใน release (v2.0.0 → rc.2)

| PR / commit | เรื่อง | ประเภท |
|---|---|---|
| #41 `71e8f89` | docs ปิด Step 07 | docs (ไม่ deploy: docs-only) |
| #42 `89e1796` | Step 08: test ความปลอดภัย/regression/UI, D-01 Enter ไม่บันทึกเอง, D-02 fixture | fix + test |
| #45 `7d44118` | D-04 อัปเกรด dependency (High 4 → 0 ใน production deps) | build |
| #44 `434742e` | D-05 ตัด `'unsafe-eval'` + zod jitless | security |
| #43 `ea41d14` | D-03 ออกจากระบบเฉพาะเครื่อง + D-06 ออกได้ตอนเน็ตหลุด | auth |
| #46 `252f081` | Step 09: CLS, a11y, ประสิทธิภาพ | perf + a11y |
| `7903755` | **D-07** ฟอร์มไม่ส่งเองก่อนหน้าพร้อม (hotfix, ยังไม่เข้า main) | security |
| `f02841b` | `e2e-preview/` สำหรับตรวจ RC บน Preview | test |
| `ad86e1e`, `8e7d036` | bump `2.1.0-rc.1`, `2.1.0-rc.2` | release |

Versioning: MINOR (`2.1.0`) ตาม `release-checklist.md` §1 เพราะพฤติกรรมออกจากระบบเปลี่ยนแบบเข้ากันได้ ที่เหลือเป็นแก้บั๊ก/ประสิทธิภาพ/ความปลอดภัย

## 3. ข้อค้นพบสำคัญ

### 3.1 S10-01 — `main` คือ production: งาน 4 ชิ้นขึ้น production โดยไม่ผ่าน RC · High (process) [V]

- GitHub deployments ของ Vercel: `89e1796` Production 2026-10-18 20:45 (เวลาไทย) · `434742e` 21:35 · `ea41d14` 22:06 · `252f081` 2026-10-19 05:05 · production login แสดง "v2.0.0" เพราะ version ใน `package.json` เปลี่ยนเฉพาะบน release branch [V]
- ช่วง Phase B ใช้ `develop` เป็นที่รวมงาน แล้ว release ผ่าน `release/*` → `main` · หลัง v2.0.0 PR ทุกตัว (#41–#46) ตั้ง base เป็น `main` ตรง ๆ จึง deploy ทันทีที่ merge
- ผล: ไม่มี RC, Preview UAT หรือ smoke test ก่อนแต่ละ deploy (CI ผ่านทุกตัว) · รายงาน Step 08/09 ที่บอกว่า "ยังไม่ขึ้น production" **ผิด** [V]
- ผลกระทบที่ทราบ: D-07 อยู่บน production ตั้งแต่ 05:05 (§3.2) · ส่วนอื่นตรวจ production แบบอ่านอย่างเดียวแล้วปกติ (headers, redirect, API 401, manifest) [V] · ผู้ใช้ได้รับ D-03 (ออกเฉพาะเครื่อง) และการแก้ Step 09 แล้ว
- **แนะนำ (ต้องเจ้าของตัดสิน, S10-01):** กลับไปใช้ `develop` เป็น base ของ PR งานปกติ และ merge เข้า `main` ผ่าน `release/*` เท่านั้น (ตาม `git-workflow.md` เดิม) · หรือเปลี่ยน production branch ใน Vercel เป็น branch แยก (`production`) · และใส่ใน ruleset ว่า PR เข้า `main` ต้องมาจาก `release/*` หรือ `hotfix/*`

### 3.2 D-07 — ฟอร์ม login ส่งเองก่อนหน้าพร้อม รหัสผ่านไปอยู่ใน URL · **High** · แก้แล้วบน branch (รอ merge) [V]

- **พบโดย:** E2E บน WebKit (rc.1): ช่องอีเมลว่างทั้งที่ test กรอกแล้ว → ตรวจต่อพบว่าฟอร์ม login มากับ HTML ตั้งแต่ O-01 (Step 09) แต่ไม่มี `method` จึงเป็น GET
- **ยืนยัน:** ให้ script ค้างไว้ (เหมือนเน็ต/เครื่องช้า) กรอกแล้วกด "เข้าสู่ระบบ" → เบราว์เซอร์ไปที่ `/login?email=someone%40example.com&password=secret-password-123` [V] · production HTML ตอนนี้: `<form noValidate="" …>` ไม่มี method และมี `name="password"` [V]
- **ความเสี่ยง:** ถ้าผู้ใช้กดเข้าสู่ระบบก่อน JavaScript โหลดเสร็จ (เป็นไปได้มากเมื่อเบราว์เซอร์เติมรหัสผ่านให้อัตโนมัติ + เน็ตช้า) รหัสผ่านจะอยู่ใน URL → ประวัติเบราว์เซอร์ และ request log ของ Vercel [I] · ข้อความที่พิมพ์ก่อนหน้าพร้อมหายด้วย
- **v2.0.0 ไม่โดน** (ฟอร์มไม่อยู่ใน HTML) · เกิดตั้งแต่ `252f081` (#46)
- **แก้ (`7903755`):** ฟอร์ม `method="post"` · ปุ่มส่ง disabled จนหน้าพร้อม (`useHydrated`, กัน Enter ด้วย) · ช่องอีเมล/รหัสผ่านไม่ถูกล้างเมื่อหน้าพร้อม · ฟอร์มบันทึกรายการได้การป้องกันเดียวกัน (ฟอร์มนี้อยู่ใน HTML ตั้งแต่ v2.0.0 ไม่มีรหัสผ่าน แต่ทะเบียน/ชื่อลูกค้าอาจไปอยู่ใน URL)
- **ทดสอบซ้ำ:** E2E ใหม่ล้มกับ `252f081` ผ่านกับ fix · unit ตรวจ HTML จาก server · Chromium 53/53 · WebKit ดู `preview-test-results.md` [V]
- **ทางเลือกตอนเช้า:** (ก) merge PR hotfix (แนะนำ) · (ข) ถ้ายัง merge ไม่ได้: Vercel Instant Rollback ไป deployment ของ `ea41d14` (ก่อน Step 09, ไม่มี D-07, ไม่มี DB change) แล้วค่อย merge hotfix
- **ควรทำหลังแก้:** ดู Vercel logs ตั้งแต่ 2026-10-19 05:05 ว่ามี request `GET /login?…password=` หรือไม่ ถ้ามี ให้เปลี่ยนรหัสผ่านบัญชีนั้น และลบ log ถ้าทำได้ [U]

## 4. Defect / issue ที่พบใน Step 10

| ID | เรื่อง | ระดับ | สถานะ |
|---|---|---|---|
| D-07 | ฟอร์ม login ส่ง GET ก่อนหน้าพร้อม (§3.2) | High | แก้แล้วบน `fix/login-before-hydration` + rc.2 · **รอ merge เข้า main (= production)** |
| D-08 | ช่องแรกที่พิมพ์ทันทีหลังเปิด `/add` ถูกล้างเมื่อหน้าพร้อม (ฟอร์มควบคุมด้วย React) · มีตั้งแต่ v2.0.0 · เกิดเมื่อเปิด `/add` ใหม่ทั้งหน้า เช่น **ทางลัด "บันทึกรายรับ" จากไอคอนแอป** · ฟอร์มไม่ยอมบันทึกช่องบังคับที่ว่าง จึงไม่มีข้อมูลผิดเข้า DB แต่ต้องพิมพ์ใหม่ · WebKit ล้ม 8 test จากเรื่องนี้ | Medium (UX) | บันทึกไว้ · แนะนำ: ปิดช่องกรอกไว้ (fieldset disabled) จนหน้าพร้อม หรือทำเป็น uncontrolled แบบฟอร์ม login · ปุ่มบันทึกถูกกันแล้วใน D-07 |
| S10-01 | `main` deploy production อัตโนมัติ งานขึ้นโดยไม่ผ่าน RC (§3.1) | High (process) | รอเจ้าของตัดสินวิธีทำงาน |
| S10-02 | Preview ถูกป้องกันด้วย Vercel Authentication → ทดสอบบน Preview ไม่ได้ (§6) | — | Blocked (รอเจ้าของ) |

## 5. Issue log

| ID | เรื่อง | สถานะ |
|---|---|---|
| S10-03 | สร้าง `release/2.1.0` จาก `main` `252f081` หลัง CI เขียว 8/8 · rc.1 `ad86e1e` · Preview rc.1 build สำเร็จ (deployment `7161479807`) | ทำแล้ว |
| S10-04 | rc.1 ไม่ได้ tag เพราะถูกแทนด้วย rc.2 ภายในชั่วโมงเดียวก่อนทดสอบ Preview ใด ๆ · tag RC จะใส่บน commit ที่ผ่าน Preview แล้ว (ไม่สร้าง tag ย้อนหลังให้ rc.1) | บันทึกไว้ |
| S10-05 | ติดตั้ง Playwright WebKit (v2359, ~60 MB) เพื่อทดสอบเครื่องยนต์ของ Safari แทน iPhone จริง | ทำแล้ว |
| S10-06 | hotfix อยู่บน branch แยกจาก `main` เพื่อ merge ได้ทันทีโดยไม่ต้องรอ release · merge เข้า `release/2.1.0` แล้ว (merge commit `9976008`) · เมื่อ main ได้ squash ของ hotfix การ merge main กลับเข้า release จะไม่ชนกัน (เนื้อหาเหมือนกัน) | ทำแล้ว |

## 6. สิ่งที่ต้องการจากเจ้าของ (เรียงตามความด่วน)

1. **Merge hotfix** — base `main` · compare `fix/login-before-hydration` · ชื่อ `fix(auth): never submit the login form before the page is ready (D-07)` · **Squash and merge** (จะ deploy production ทันที)
2. **ให้สิทธิ์ทดสอบ Preview** (เลือกหนึ่ง): Vercel → Project → Settings → Deployment Protection → **Protection Bypass for Automation** → สร้าง secret แล้วเก็บในไฟล์ `.env.preview` ในเครื่อง (ไฟล์ `.env*` ถูก git ignore) เป็นบรรทัด `PREVIEW_BYPASS=…` · ไม่ต้องปิดการป้องกัน
3. **ตัดสิน S10-01** วิธีทำงานต่อจากนี้ (`develop` + `release/*` หรือ production branch แยก)
4. ตรวจ Vercel logs หาคำว่า `password=` ตั้งแต่ 05:05 (§3.2)
