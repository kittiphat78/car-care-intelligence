# v2.2.0 — สมุดรายชื่อลูกค้า

> สถานะ: **Released** · production 2026-10-20 19:51 · PR #64 merge commit `18b52bc` · tag `v2.2.0` · RC `v2.2.0-rc.1` (`1933fc6`) · ฐาน: `v2.1.1` (`02f7038`)
> SemVer: MINOR (ฟีเจอร์ใหม่ + ตารางและฟังก์ชันใหม่แบบ expand-only ไม่แก้ข้อมูลเดิม)
> ออกแบบ: `docs/features/customer-directory.md` · ป้าย: **[V]** Verified · **[I]** Inferred · **[U]** Unknown

## สำหรับคนในร้าน

- **สมุดลูกค้า** (มือถือ: เมนู "เพิ่มเติม" → การ์ด "ลูกค้า" · PC: เมนูซ้าย "ลูกค้า") เก็บชื่อ เบอร์ (หลายเบอร์) และรถ (หลายคัน พร้อมยี่ห้อ/รุ่น/สี)
- ค้นช่องเดียวด้วยชื่อ เบอร์ หรือทะเบียน **พิมพ์แค่บางส่วนก็เจอ** เช่น "0001" หรือ "1กข" · แตะ "โทร 08x-xxx-xxxx" เพื่อโทรทันที หรือกดคัดลอกเบอร์
- **หน้าค้างชำระ** มีปุ่มโทรลูกค้าที่ตรงกับทะเบียนหรือชื่อในการ์ด · ถ้ายังไม่มีในสมุด กด "เพิ่มเบอร์" ได้จากการ์ดเลย
- **หน้าบันทึก** พิมพ์ทะเบียนแล้วบอก "ลูกค้า: …" กด "ใช้ชื่อนี้" เพื่อเติมชื่อ (ไม่เติมเอง) · บันทึกแล้วทำต่อด้วยชื่อใหม่ มีปุ่ม "บันทึกเป็นลูกค้า"
- **หน้าลูกค้า** บอกว่ามาใช้บริการกี่ครั้ง ครั้งล่าสุด ยอดรวม ยอดค้าง และ 10 รายการล่าสุด

## การเปลี่ยนแปลง

| PR | เนื้อหา | กระทบแอป |
|---|---|---|
| #55 `ab87d6c` | เอกสารออกแบบ (Phase 0) | ❌ docs |
| #56 `97da644` | M010–M011: ตารางลูกค้า + `save_customer` | ❌ DB |
| #57 `8fe973b` | M012: ทะเบียนเทียบด้วย `plate_core` (ไม่สนจังหวัดท้าย · ห้ามซ้ำเฉพาะทะเบียนเต็ม) | ❌ DB |
| #59 `3f0002b` | หน้า `/customers` (ค้น โทร คัดลอก) · หน้า `/customers/<id>` · ฟอร์มเพิ่ม/แก้ (หลายเบอร์ หลายคัน ย้ายรถจากลูกค้าอื่น draft) · ลบพร้อมยืนยัน · เมนู · `PROTECTED_ROUTES` · ลิงก์ออกจากระบบไม่พาคำค้นลูกค้าไป server | ✅ |
| #60 `5bd8ad4` | M013 รุ่นรถ · แสดงยี่ห้อ/รุ่นในรายชื่อและหน้าลูกค้า | ✅ + DB |
| #61 `f93c5a3` | ปุ่มโทรในการ์ดค้างชำระ · "ลูกค้า: …" ในหน้าบันทึก · ชื่อจากสมุดในรายชื่อแนะนำ · toast "บันทึกเป็นลูกค้า" | ✅ หน้าค้างชำระ หน้าบันทึก |
| #62 `957c645` | M014 `customer_history` · การ์ด "ประวัติการมาใช้บริการ" | ✅ + DB |
| #63 `c9ffc6f` | **Fixed D-12:** หลังเคลียร์ยอด โหลดตัวเลขบนเมนูใหม่หลัง dialog ปิด (เดิมบน iPhone อาจพากลับ `/debts?settle=…`) · หน้าค้างชำระ `aria-busy` ระหว่างอัปเดต | ✅ หน้าค้างชำระ |
| `1933fc6` | `chore(release): 2.2.0-rc.1` | เลขเวอร์ชัน |
| `11f7520` | release notes + `supabase/checks/customers_ready.sql` | ❌ docs / check |
| `cc7d7d7` | `chore(release): 2.2.0` (ตั้งเลขจริงก่อนเปิด PR ตาม S11-01) | เลขเวอร์ชัน |
| `dbbc60a` | `e2e-preview`: tag ทดสอบ 5 หลักเสมอ · ขั้นเก็บกวาดรอรายชื่อโหลดก่อน (พบระหว่างตรวจ commit `2.2.0`) | ❌ test |

## Database — เจ้าของรันบน production **ก่อน** merge release PR

ทั้งหมดเป็นของใหม่ (expand-only): ไม่แก้ `records`, `expenses`, `app_members` · แอป v2.1.1 ที่รันอยู่ไม่รู้จักตารางใหม่ จึงใช้ต่อได้ตามปกติแม้รัน migration ก่อน merge [V: staging รันก่อนแอปใหม่มาตลอด Phase 1–3]

| # | ไฟล์ (Supabase → SQL Editor ของ **production**) | ผลที่ถูก |
|---|---|---|
| 0 | Backup: Table Editor → `records`, `expenses` → Export CSV เก็บนอก Supabase (`database-migrations.md` §4) | ได้ไฟล์ 2 ไฟล์ |
| 1 | `supabase/migrations/20261020120000_customers.sql` (M010) | Success. No rows returned |
| 2 | `supabase/migrations/20261020120100_save_customer.sql` (M011) | Success. No rows returned |
| 3 | `supabase/migrations/20261020130000_customer_plate_core.sql` (M012) | Success. No rows returned |
| 4 | `supabase/migrations/20261020140000_customer_vehicle_model.sql` (M013) | Success. No rows returned |
| 5 | `supabase/migrations/20261020150000_customer_history.sql` (M014) | Success. No rows returned |
| 6 | `supabase/checks/customers_ready.sql` (**อ่านอย่างเดียว** ใช้แทน test บน production) | ทุกแถว `true` · แถวสุดท้าย `ALL READY = true` |

- รันตามลำดับ ห้ามข้าม (M012 แก้ตารางของ M010, M013 แทนฟังก์ชันของ M012)
- ไม่ต้องรัน `supabase/tests/customers.test.sql` บน production (เขียนข้อมูลแล้วย้อนคืน ใช้กับ staging) · `customers_ready.sql` ตรวจ 21 ข้อ: ตาราง, RLS, policy, anon ไม่มีสิทธิ์, คอลัมน์ทะเบียน/รุ่น, index ทะเบียนเต็ม, ฟังก์ชันและสิทธิ์ · ทดสอบแล้วในเครื่อง (ครบ = `ALL READY true`, ฐานข้อมูลเปล่า = `false` ไม่ error) [V]
- ถ้าไฟล์ไหนขึ้น error ให้หยุด ไม่ต้อง merge และส่งข้อความ error มา (ไฟล์ทำงานใน transaction: error = ไม่มีอะไรเปลี่ยน)

## การทดสอบ (RC `v2.2.0-rc.1` = `1933fc6`, 2026-10-20)

| ตรวจ | ผล |
|---|---|
| CI (lint, typecheck, test, build, audit, secrets, db, e2e) | 9/9 ผ่าน [V] |
| Unit / component | 529/529 [V] |
| SQL `customers.test.sql` (CI job `db` + staging) | `ALL CUSTOMER TESTS PASSED` ทั้งในเครื่อง, CI และ staging (เจ้าของรันทุก migration) [V] |
| E2E Chromium ในเครื่อง มือถือ + PC | 67 ผ่าน · ข้าม 9 (ข้อที่รันเฉพาะขนาดจอเดียว) [V] |
| E2E WebKit ในเครื่อง (iPhone 13 + Safari PC) | 63 ผ่าน / 4 ล้ม เฉพาะหมวดเดิม: skip link ×2 (Safari ไม่ Tab ไปลิงก์) · ข้อลูกค้า ×2 ล้มที่การตรวจ console เพราะข้อความ `interactive-widget` ที่ Safari พิมพ์ทุกหน้า (K-02) ขั้นตอนอื่นผ่านหมด [V] |
| Preview + staging (`e2e-preview`) | มือถือ 4/4 · PC 7/7 · iPhone 4/4 (รวม CUJ ลูกค้า: เพิ่ม ค้น โทร แก้ hint หน้าบันทึก โทรจากค้างชำระ ประวัติ ลบ) · Preview แสดง `2.2.0-rc.1` · ทุก request ไป staging · เก็บกวาดข้อมูลทดสอบแล้ว [V] |
| D-12 บน iPhone (Preview) | CUJ ค้างชำระบน iPhone ผ่าน 5/5 รอบ (ก่อนแก้ล้มราว 1 ใน 3) [V] |

## Deploy และตรวจหลังขึ้น production [V]

| เวลา (2026-10-20) | เหตุการณ์ |
|---|---|
| ก่อน 19:51 | เจ้าของ backup CSV แล้วรัน M010–M014 บน production ตามลำดับ (ทุกไฟล์ "Success. No rows returned") · `customers_ready.sql` ครบ 21 ข้อ + `ALL READY = true` |
| — | ระหว่างนั้น production ยังเป็น v2.1.1 · `/login` 200 ปกติ |
| 19:51:33 | เจ้าของ merge PR #64 แบบ merge commit → `18b52bc` (tree เท่ากับ `release/2.2.0` @ `dbbc60a`) |
| 19:52:24 | Vercel production deployment `7200172620` success |
| หลัง deploy | Smoke test อ่านอย่างเดียว (มือถือ, PC, iPhone WebKit, 320 px): ขึ้น `v2.2.0` · ไม่มีแถบ Preview · ไม่มี request ล้ม · console มีแค่ `interactive-widget` บน iPhone · ฟอร์ม login `method="post"` · ไม่ล้นจอ 320 px · `/customers`, `/customers/<id>`, `/debts` ไม่ login → 307 ไป `/login?next=` · header ความปลอดภัยครบ · JavaScript ชี้ production เท่านั้น ไม่มี staging ไม่มี key ฝั่ง server |
| หลัง smoke | tag `v2.2.0` (annotated) บน `18b52bc` · back-merge fast-forward `develop` = `main` = `18b52bc` |

ยังไม่ได้ทำ (เจ้าของ): ลองใช้หน้าลูกค้าบน production ด้วยบัญชีร้าน (เพิ่ม/ค้น/โทร ข้อมูลจริง) · ดู Vercel logs ช่วงแรก

## Rollback

| ระดับ | ทำอะไร |
|---|---|
| แอป (หลัก) | Vercel → Deployments → deployment ของ `02f7038` (`v2.1.1`, deployment `7192728398`) → **Instant Rollback** · ข้อมูลรายรับ/รายจ่ายไม่กระทบ · ตารางลูกค้าอยู่ต่อแต่แอป v2.1.1 ไม่ใช้ |
| ฐานข้อมูล | **ไม่ต้องย้อน** · ถ้าจำเป็นจริง: down ย้อนลำดับ M014 → M010 (`supabase/rollback/`) · down ของ M013 ไม่ยอมลบคอลัมน์ถ้ามีรถที่ใส่รุ่น · down ของ M012 ไม่ยอมย้อนถ้ามีทะเบียนซ้ำ · **down ของ M010 ไม่ยอมลบถ้ามีลูกค้าในสมุด** (กันข้อมูลหาย) |

## Known issues

- ตาม `known-issues.md` · ใหม่ใน release นี้: K-20 (D-12 ส่วนที่เหลือ: ถ้าโหลดเต็มหน้าระหว่างอัปเดตหลังเคลียร์ยอด Safari อาจพากลับหน้าค้างชำระ)
- คำค้นลูกค้า (`?q=`) ไม่ถูกส่งไป server ยกเว้นตอนรีเฟรชหน้าที่มี `?q=` (เบราว์เซอร์ส่ง URL ทั้งหมด) · `customer-directory.md` §9
- dialog เคลียร์ยอดเดิมยังใส่ชื่อลูกค้าใน URL (`?settle=<ชื่อ>`) ผ่าน `router.push` ตั้งแต่ v2.0 · ไม่ได้เปลี่ยนใน release นี้
- ยังไม่ค้นด้วยยี่ห้อ/รุ่น · ยังไม่มีหน้านำเข้ารายชื่อจากประวัติ (Phase 4 ถ้าต้องการ)
