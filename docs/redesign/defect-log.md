# Step 08 — Defect Log & Issue Log

> Step: 08 — Automated Testing, Regression & Security QA · 2026-10-18 · branch `qa/step-08`
> ใช้เป็น issue log ของ Step 08 ด้วย · ป้ายหลักฐาน: [V] Verified · [I] Inferred · [U] Unknown
> ระดับ: Critical / High / Medium / Low · สถานะ: FIXED (แก้และทดสอบซ้ำแล้ว) / OPEN / DECISION (รอเจ้าของตัดสิน)

## 1. สรุป

| ระดับ | พบ | FIXED | OPEN / DECISION |
|---|---|---|---|
| Critical | 0 | — | — |
| High | 0 | — | — |
| Medium | 2 | 1 (D-01) | 1 DECISION (D-03) |
| Low | 3 | 1 (D-02) | 2 OPEN, รออนุมัติ (D-04, D-05) |

ไม่มี Critical/High ค้าง ✅ (เกณฑ์ Step 08)

## 2. ข้อบกพร่องของแอปและข้อมูลทดสอบ

### D-01 — กด Enter ในช่องกรอกแล้วฟอร์มบันทึกทันที · Medium · FIXED

- **พบโดย:** `e2e/ui-quality.spec.ts` "a car can be recorded with the keyboard only" [V]
- **อาการ:** พิมพ์ราคาแล้วกด Enter (หรือปุ่ม "ไป/Go" บนคีย์บอร์ดมือถือ) ฟอร์มถูกส่งด้วยปุ่ม submit ตัวแรก คือ "บันทึกแล้วทำต่อ" ทำให้บันทึกรายการทั้งที่ยังกรอกไม่ครบหรือยังไม่ได้ตรวจ ซึ่งขัดกับ `interaction-specifications.md` §2 (Enter ไปช่องถัดไป ไม่บันทึก) [V]
- **ผลกระทบ:** อาจได้รายการที่ไม่ตั้งใจบันทึก (ข้อมูลที่ยังกรอกไม่ครบจะถูกกฎ validation กันไว้ แต่ข้อมูลที่ครบแล้วแต่ยังไม่ได้ตรวจจะถูกบันทึก) [I]
- **การแก้:** `features/records/components/RecordEditor.tsx` เพิ่ม `enterMovesToNextField` ให้ทั้งฟอร์มรายรับและรายจ่าย: Enter ใน `<input>` จะย้ายไปช่องถัดไปที่ focus ได้ และไม่ส่งฟอร์ม (ข้ามระหว่างพิมพ์ด้วย IME) · ปุ่มบันทึกยังกดด้วย Enter/Space ได้ตามปกติ
- **ทดสอบซ้ำ:** unit "Enter in a field moves to the next field and never saves" ✅ · E2E keyboard-only ✅ ทั้ง phone และ desktop [V]
- **ความเสี่ยงของการแก้:** Low · ไม่เปลี่ยนข้อมูล/ฐานข้อมูล · ไม่แตะ dialog แก้ไข (ยังใช้พฤติกรรมเดิมของเบราว์เซอร์) [V]

### D-02 — ข้อมูลทดสอบ `ci_fixtures.sql` ทำให้ Supabase Auth ค้นหา user ไม่ได้ · Low · FIXED

- **อาการ:** หลังโหลด fixture แล้ว Admin API `GET /auth/v1/admin/users` ตอบ "Database error finding users" เพราะแถวใน `auth.users` มีค่า NULL ในคอลัมน์ token ที่ GoTrue อ่านเป็น string [V]
- **ขอบเขต:** เฉพาะฐานข้อมูลทดสอบ (CI `db`, เครื่องนักพัฒนา) · ไม่เกี่ยวกับ production [V]
- **การแก้:** `supabase/tests/ci_fixtures.sql` ใส่ `''` ให้ `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change` และ `created_at`/`updated_at` = `now()`
- **ทดสอบซ้ำ:** global-setup สร้าง/ค้นหา user ได้ · SQL tests 5/5 ✅ [V]

### D-03 — ออกจากระบบแล้วทุกเครื่องที่ใช้บัญชีเดียวกันหลุดหมด · Medium · DECISION

- **พบโดย:** E2E: CUJ-8 ออกจากระบบแล้ว test อื่นที่ใช้บัญชีเดียวกันพร้อมกันถูกส่งกลับหน้า login [V]
- **สาเหตุ:** `supabase.auth.signOut()` ค่าเริ่มต้นเป็น `scope: 'global'` คือยกเลิกทุก session ของบัญชีนั้น (`features/auth/api.ts` ใช้ `'local'` เฉพาะตอนเรียก server ไม่ได้) [V]
- **เป็น regression หรือไม่:** ไม่ใช่ · v1 เรียก `signOut()` แบบเดียวกัน (`hooks/useDashboard.ts:113-122` ใน `feature-inventory.md` F-04) [I]
- **ผลกระทบ:** ถ้าร้านใช้บัญชีเดียวบนหลายเครื่อง (เช่น tablet หน้าร้าน + มือถือ) กดออกจากระบบเครื่องหนึ่ง เครื่องอื่นจะต้อง login ใหม่ · ด้านความปลอดภัย global ปลอดภัยกว่า (เครื่องหายแล้ว logout จากเครื่องอื่นได้) [I]
- **ทางเลือก:** (ก) คงเดิม + เขียนในหน้ายืนยันว่า "ทุกเครื่องจะออกจากระบบ" (ข) เปลี่ยนเป็น `scope: 'local'` (ออกเฉพาะเครื่องนี้) และเพิ่มปุ่ม "ออกจากทุกเครื่อง" แยก
- **ต้องให้เจ้าของตัดสิน:** เป็นการเปลี่ยนพฤติกรรม Auth บน production · ระหว่างนี้ E2E ใช้บัญชีแยก `e2e-logout@example.com`

### D-04 — แพ็กเกจที่มีช่องโหว่ตาม `npm audit` · Low (runtime) · OPEN รออนุมัติ

- **production deps:** High 4 / Moderate 5 / Critical 0 (ตรงกับ HF-01 เดิม) · ประเมินทีละตัวใน `security-review.md` §5: ไม่มีตัวไหนที่ข้อมูลจากภายนอกไปถึงฟังก์ชันที่มีช่องโหว่ได้ [I]
- **dev deps:** Critical 2 (`vitest` 2.x, `tinypool`), High อีกหลายตัวจาก `eslint-config-next`/`vite` · ใช้แค่ตอนพัฒนาและใน CI ไม่ถูกส่งไปผู้ใช้ [V] (`.next/static` ไม่มีโค้ดเหล่านี้)
- **แนะนำ:** PR แยก `build(deps)` (1) `npm audit fix` แบบไม่ข้าม major สำหรับ transitive ของ production (2) อัปเกรด `vitest` เป็น major ใหม่ในงานแยกพร้อมรัน test ทั้งหมด · เลือกเวอร์ชันที่ออกมาแล้วอย่างน้อย 2 สัปดาห์ (S07-42)
- **ไม่ได้ทำใน Step 08:** การเปลี่ยน dependency กระทบ supply chain และ build production จึงต้องได้อนุมัติ

### D-05 — CSP ยังอนุญาต `'unsafe-eval'` (ER-15) · Low · FIXED (branch `fix/csp-no-unsafe-eval`)

- **เจ้าของตัดสิน (2026-10-18):** ตัดใน PR แยก · แก้แล้ว: `next.config.ts` ใส่ `'unsafe-eval'` เฉพาะ `next dev` (ตาม guide CSP ของ Next 16: React ใช้ eval แค่ตอน dev) · production build ไม่มีแล้ว [V]
- **พบเพิ่มตอนแก้:** Zod 4.4.3 ลอง `new Function('')` หนึ่งครั้งเพื่อดูว่าใช้ eval ได้ไหม เบราว์เซอร์จึงรายงาน CSP violation ทุกครั้งที่เปิดแอป (ไม่มีอะไรพัง เพราะ Zod จับ error ไว้) [V] → `lib/zod.ts` ตั้ง `z.config({ jitless: true })` และ ESLint ห้าม import `zod` ตรง
- **ทดสอบซ้ำ:** E2E ใหม่ "nothing in the app is blocked by the content security policy" เก็บ `securitypolicyviolation` และ console error ทุกหน้า + ฟอร์มที่ validate + dialog แก้ไข + ส่งออก Excel + บิล PDF → ล้มเมื่อยังไม่ตั้ง jitless ✅ ผ่านหลังตั้ง [V] · test header ตรวจว่าไม่มี `unsafe-eval` [V] · E2E ทั้งชุด 47/47 สองรอบ [V]
- **ยังไม่ได้ตรวจ:** Safari และ widget สภาพอากาศกับ API จริง → ตรวจบน Preview ก่อน merge [U]

- **ปัจจุบัน:** production ส่ง `script-src 'self' 'unsafe-inline' 'unsafe-eval'` [V] (curl 2026-10-18)
- **ทดลองแล้ว:** build ในเครื่องโดยตัด `'unsafe-eval'` แล้วรัน E2E ทั้งชุด 45/45 ผ่าน รวม Excel, บิล PDF, ฟอร์มทั้งหมด [V] · ใน bundle มีแค่ `Function("return this")` ของ lodash ใน exceljs (ไม่ถูกเรียกในเบราว์เซอร์ เพราะมี `self`) และการเช็ก `Function("")` ใน try/catch ของ Zod [V] · ยังไม่ได้ทดสอบหน้าสภาพอากาศกับ API จริงและ Safari [U]
- **แนะนำ:** ตัด `'unsafe-eval'` ใน PR แยก ทดสอบบน Preview ก่อน · `'unsafe-inline'` ยังต้องใช้กับ theme script (เหตุผลตาม `security-design.md`)
- **ไม่ได้ทำใน Step 08:** เปลี่ยน header ของ production

## 3. ปัญหาของการทดสอบ (test infrastructure)

| ID | ปัญหา | การแก้ | สถานะ |
|---|---|---|---|
| T-01 | test หลายตัวใช้บัญชีเดียวกัน แล้ว CUJ-8 ออกจากระบบแบบ global ทำให้ test อื่นหลุด | บัญชี `e2e-logout` แยก (ดู D-03) | FIXED [V] |
| T-02 | รอ `networkidle` แล้วค้างเพราะ widget สภาพอากาศเรียก API ภายนอก | รอหัวข้อ `<h1>` ของหน้าแทน | FIXED [V] |
| T-03 | test เลือกรายการ "ล่าสุด" ที่ test อื่นกำลังแก้/ลบพร้อมกัน (security ได้ราคา 250 แทน 150, dialog เปิดรายการที่ถูกลบ) | ใช้รายการ seed ป้าย "ทดสอบ …" ที่ไม่มี test ไหนแตะ | FIXED [V] |
| T-04 | รอบหนึ่ง test dialog (phone) หมดเวลา 60 วินาที ไฟล์หลักฐานถูกรอบถัดไปเขียนทับก่อนดู | รันแยก output ทุกรอบ · ไม่เกิดซ้ำในการรันเต็มชุดอีก 14 รอบ | OPEN (เฝ้าดู) · สาเหตุ [U] · CI มี retry 1 ครั้ง จึงควรดูจำนวน "flaky" ในรายงาน CI |
| T-05 | Vitest config ตั้ง `TZ=Asia/Bangkok` เอง การรัน `TZ=UTC npx vitest` จึงไม่ได้เป็น UTC จริง | test เรื่องเวลาตั้ง TZ เองครบ 3 โซน (`lib/time/__tests__/bangkok.test.ts`) | ไม่ใช่ข้อบกพร่อง [V] |
| T-06 | ไดรฟ์ C: เต็ม 100% ระหว่าง build/E2E | ลบ image `node:22` และไฟล์ชั่วคราว, `npm cache verify` (ได้คืน 5.7 GB) · **ไม่ได้ลบ** Docker build cache (~22 GB) และ volume เพราะอาจเป็นของเจ้าของ | FIXED ชั่วคราว · เจ้าของพิจารณาล้าง Docker cache เอง |
| T-07 | ไม่มี test สำหรับ F-06, F-08, F-28, F-29, F-39 | เพิ่ม `e2e/regression.spec.ts` | FIXED [V] |
| T-08 | ไม่มีการตรวจอัตโนมัติว่า key ฝั่ง server หลุดไปใน bundle | เพิ่ม step "No server keys in the browser bundle" ใน CI job `e2e` | FIXED (ทดสอบ script ในเครื่องทั้งกรณีผ่านและกรณีมี key ปลอม) [V] · บน GitHub: รอ CI ของ PR |

## 4. ยกมาจาก Step 07 (ยังเปิดอยู่)

| ID | เรื่อง | สถานะ |
|---|---|---|
| S07-41 | ยังไม่ได้ทดสอบบนเครื่องจริง: บิล PDF บน iPhone, dialog เซสชันหมดอายุตอนหมดจริง, สีของ autofill | Not Run · ต้องใช้เครื่องจริง (UAT) |
| — | Realtime ปิดอยู่บน production (`release-2.0.0.md`) | ตัดสินภายหลัง |
