# Release v1.2.0 — Foundation & Data Correctness

> วันที่: 2026-10-16 · อนุมัติโดยเจ้าของ: "อนุมัติ v1.2.0" (2026-10-15)
> ฐาน: `v1.0.1` (`d748ac6`) → production ปัจจุบัน `9145eec` (Merge PR #21) [V GitHub deployments]
> **ขึ้น production แล้ว:** PR #22 → `b5213db` · Vercel deploy success 2026-10-16 18:34 (เวลาไทย) · CI 8/8 · tag `v1.2.0`
> หน้าจอเหมือน v1.0.1 ทุกหน้า: การเปลี่ยนแปลงอยู่ที่ความถูกต้องของข้อมูล ความปลอดภัย และความเร็ว
> Phase B (หน้าตาใหม่) จะออกเป็น v2.0.0 แยกต่างหาก

## 1. สิ่งที่เปลี่ยน (ตามลำดับที่ขึ้น production)

| งาน | PR | สิ่งที่เปลี่ยน | อ้างอิง |
|---|---|---|---|
| A1 | #4 | CI ตรวจ lint, type, test, build, audit, secret, หัวข้อ PR ทุก PR | — |
| A2 | — | Vercel Ignored Build Step: แก้แค่เอกสาร/CI ไม่ deploy | S07-08 |
| A4 | #6 | `middleware.ts` → `proxy.ts` (Next 16) · login แล้วกลับหน้าที่ตั้งใจเข้า (`?next=`) | S07-09 |
| A9 | #7 | ส่ง error ฝั่ง browser ไปที่ log ของ Vercel (`/api/client-errors`) | ADR-11 |
| B1 | #8 | วัน/สัปดาห์/เดือน/ปี และเวลาทุกจุดเป็นเวลาไทย · ตัวกรองวันที่รวม 00:00–06:59 | ER-10, ER-11 |
| B2 | #9 | Data-access layer · โหลดเกิน 1,000 แถวได้ครบ · ข้อความ error ภาษาไทยพร้อมรหัสอ้างอิง · Export ไม่สร้างไฟล์ถ้าโหลดไม่ครบ | ER-02, ER-07, ER-17 |
| A5 | #11, #16 | Supabase migrations ใน repo (M000) + CI `db` job ทดสอบ migration, SQL tests และ rollback | ADR-08 |
| A8 | #10 | ลบ `/api/insights` (Gemini) และ `/api/export-excel` | Q-12 |
| A3 | #13 | Build ไม่ผ่านถ้า Preview/Development ชี้ฐานข้อมูล production · แถบ "ระบบทดสอบ" บน Preview | ADR-12 |
| A6 | #15 | M001–M002: ข้อมูลเห็นได้เฉพาะบัญชีสมาชิกร้าน (แก้ incident 2026-10-14 แบบถาวร) | ADR-04, S07-01 |
| A7 | #16 | M003–M005: index · `client_request_id` · ชื่อ/เวลาผู้บันทึกและผู้แก้ไขมาจากฐานข้อมูล | ADR-07, ER-14 |
| B3 | #18 | M006: ยอดหน้าแรกคำนวณในฐานข้อมูล | ADR-05, ER-31 |
| B4 | #18 | M007: เคลียร์ยอดเฉพาะรายการที่เห็นบนจอ และยืนยันจำนวน/ยอดก่อนกด | ER-03 |
| B5 | #18 | กฎบันทึกชุดเดียวทั้งหน้าบันทึก/แก้ไข · กันบันทึกซ้ำ · กันแก้ทับกัน · เลิกแปลง `<` เป็น `&lt;` | ER-05, ER-08, ADR-10 |
| B7 | #20 | Excel export: ข้อความที่ขึ้นต้นด้วย `= + - @` เป็นข้อความเสมอ | T6 |
| B6 | #21 | M008: กฎข้อมูล 7 ข้อในฐานข้อมูล · M009: เลขลำดับรายการต่อวันไม่ซ้ำ (รายการใหม่) | ER-04 |

## 2. ฐานข้อมูล production (ใช้แล้วทั้งหมด)

| Migration | ใช้กับ production | ตรวจหลังใช้ |
|---|---|---|
| M001–M002 สมาชิก + RLS | 2026-10-15 | 4/4 บัญชีเป็นสมาชิก · anon ถูกปฏิเสธทุกตาราง |
| M003–M005 | 2026-10-15 | index 4 · column 2 · trigger 2 |
| M006–M007 | 2026-10-15 | ฟังก์ชัน 4 ตัว · anon ถูกปฏิเสธ |
| M008–M009 | 2026-10-15 | กฎ 7 · trigger 1 · เลข #1 #2 #3 เรียงถูก |

Backup ก่อนเปลี่ยนฐานข้อมูล: CSV `backup-2026-10-15` (เก็บโดยเจ้าของ) · ทดลองกู้ลง staging แล้ว fingerprint ตรงกันทุกค่า (S07-31)

## 3. การทดสอบ

| Check | ผล |
|---|---|
| Unit/integration tests | 365 (TZ Asia/Bangkok และ UTC) |
| SQL tests (`supabase/tests/*.test.sql`, 5 ไฟล์) | ผ่านทั้งใน CI, ฐานข้อมูลจำลองในเครื่อง และ staging |
| Rollback ทุกไฟล์ (9 ไฟล์) | ผ่านใน CI |
| Preview + staging | B2, B6 ทดสอบด้วยข้อมูล seed · B3–B5 ทดสอบบน production เฉพาะสิ่งที่ไม่เขียนข้อมูล (S07-29) |

## 4. ย้อนกลับ

| ระดับ | วิธี |
|---|---|
| แอป | Vercel → Deployments → deployment ก่อนหน้า → Instant Rollback (`v1.0.1` = `d748ac6`) · ฐานข้อมูลใหม่เข้ากันได้กับแอป v1.0.1 ทุก migration |
| ฐานข้อมูล | `supabase/rollback/*.down.sql` ย้อนจากใหม่ไปเก่า (ทดสอบใน CI ทุก PR) |
| ข้อมูล | CSV `backup-2026-10-15` + `supabase/checks/restore_drill.sql` |

## 5. ปัญหาที่รู้แล้วและยังไม่แก้ใน v1.2.0

| ID | เรื่อง | แผน |
|---|---|---|
| S07-11 | log ของ Vercel Hobby เก็บสั้น ไม่มี alert | ทบทวนหลัง 1 เดือน (ADR-11) |
| S07-15 | `fetchAllPages` แบบ offset อาจได้แถวซ้ำ 1 แถวถ้ามีการบันทึกระหว่างโหลด | ย้ายไป RPC ใน Phase B |
| S07-33 | แอปยังนับ `seq_number` เองก่อนส่ง (trigger แทนที่ให้) | ลบใน Phase B |
| HF-01 | dependency ระดับ high 4 / moderate 5 ใน production deps | ตาม audit gate (production deps: high 4, moderate 5, critical 0) |
| — | Realtime ปิดอยู่บน production (publication ว่าง) | ตัดสินใน Phase B |
| S07-27 | required checks ใน ruleset ของ `main` ยังไม่มีผล (กรอกฟอร์มแล้ว รอกด Create) | เจ้าของ |
