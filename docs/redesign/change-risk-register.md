# Change Risk Register — Step 00

> วันที่: 2026-10-14 · ป้ายกำกับหลักฐาน: **[V]** Verified · **[I]** Inferred · **[U]** Unknown
> Likelihood / Impact: H = สูง, M = กลาง, L = ต่ำ · Severity = Critical / High / Medium / Low

Register นี้เน้นความเสี่ยงที่ **จะเกิดระหว่างการ redesign** ต่อผู้ใช้จริงและข้อมูลจริง ส่วน defect เชิงโค้ดโดยละเอียดจะทำใน Step 01

| ID | ความเสี่ยง | หลักฐาน | L | I | Severity | Mitigation | Step |
|---|---|---|---|---|---|---|---|
| R01 | Local dev / Preview เขียนข้อมูลลง Production DB ระหว่างพัฒนา | `.env.local` มี Supabase project เดียว [V], Vercel Preview scope [U] | H | H | **Critical** | สร้าง staging project และแยก env scope (ดู `environment-matrix.md`) ก่อน Step 07 พร้อม interim rule ห้ามทดสอบการเขียน | 00→06 |
| R02 | RLS ไม่ได้เปิดหรือ policy หลวม: anon key อยู่ใน bundle ทุกคนจึงเรียก REST API ได้ตรง | Client ใช้ anon key เรียก DB ตรง [V], สถานะ RLS [U] | M | H | **Critical** จนกว่าจะยืนยัน | รัน SQL ข้อ 1, 2, 10 ใน baseline แล้วประเมินใน Step 01 และ 05 | 01 |
| R03 | ไม่มี backup ที่ restore ได้ ถ้าเกิด migration ผิดหรือลบข้อมูลพลาดจะกู้ไม่ได้ | Supabase plan และ backup [U] | M | H | **Critical** จนกว่าจะยืนยัน | ยืนยัน plan, ทำ `pg_dump` แบบ manual ก่อนทุก release ที่แตะ DB (ต้องอนุมัติ) และพิจารณา PITR | 00/06 |
| R04 | ไม่รู้ว่า Production รัน commit ไหน ทำให้ baseline หรือ rollback target ผิด | ไม่มีสิทธิ์ Vercel [U] | M | H | **High** | เจ้าของยืนยัน commit SHA ของ production deployment ใน Vercel dashboard ก่อนสร้าง baseline tag | 00 |
| R05 | Schema change ทำให้ client เก่าพัง: tablet แบบ kiosk เปิดหน้าค้างไว้นาน (มี Realtime) ทำให้ bundle เก่ายังทำงานต่อหลัง deploy | Kiosk mode + realtime [V], ระยะเวลาที่เปิดค้าง [I] | H | H | **High** | ใช้ expand/contract migration เท่านั้น โดยไม่ลบหรือเปลี่ยนชื่อ column ใน release เดียวกับโค้ดที่เลิกใช้ และพิจารณาบังคับ reload เมื่อมีเวอร์ชันใหม่ | 05/06 |
| R06 | Hard delete และไม่มี audit log ทำให้ลบผิดแล้วกู้ไม่ได้ | `useHistoryData.ts:46` [V] | M | H | **High** | พิจารณา soft delete และ audit table ใน Step 05 (เป็นการเปลี่ยน business logic จึงต้องอนุมัติ) | 05 |
| R07 | Bulk "เคลียร์ยอด" อัปเดต record ผิดกลุ่ม เมื่อเปลี่ยนวิธี match ชื่อลูกค้าระหว่าง redesign | `useDashboard.ts:142-146` match ด้วย `customer_name` ตรงตัว [V] | M | H | **High** | เขียน regression test ก่อนแตะ logic นี้ และทดสอบบน staging เท่านั้น | 07/08 |
| R08 | ไม่มี schema หรือ migration ใน repo ทำให้ redesign DB โดยไม่รู้สภาพจริง | ไม่มีโฟลเดอร์ `supabase/` [V] | H | M | **High** | Schema-only dump ของ prod (read-only) เป็น baseline migration | 05/06 |
| R09 | งานที่ยังไม่ push หาย: 3 local branches มี commit ที่อยู่แค่บนเครื่องนี้ | `git branch -vv` [V] | M | M | **Medium** | เจ้าของตัดสินใจ: push เป็น backup, merge, หรือเลิกใช้ | 00 |
| R10 | ไม่มี CI จึงอาจ merge โค้ดที่ lint, type หรือ test ไม่ผ่านเข้า main แล้ว Vercel deploy อัตโนมัติ | ไม่มี `.github/workflows` [V] | M | H | **High** | เพิ่ม GitHub Actions (lint, type-check, test, build) และ branch protection บน `main` | 06 |
| R11 | การเปลี่ยน domain หรือ storage key ทำให้เลขบิลเงินสดเริ่มใหม่ (เลขซ้ำกับบิลที่ออกไปแล้ว) | `generateBill.ts:33-35` ใช้ `localStorage` [V] | L | M | **Medium** | ห้ามเปลี่ยน key ระหว่าง redesign ถ้าจะย้ายเลขบิลไป DB ต้องมี migration plan ที่ seed เลขต่อจากเดิม | 05 |
| R12 | `seq_number` ซ้ำ เมื่อบันทึกพร้อมกันจากหลายเครื่อง | คำนวณจาก `count` ฝั่ง client [V] | M | L | **Medium** | บันทึกเป็นข้อจำกัดเดิม และพิจารณาย้ายไป DB sequence หรือ function ใน Step 05 | 05 |
| R13 | Redesign UX ทำให้ผู้ใช้สูงวัยใช้งานไม่ได้ (README ระบุกลุ่มเป้าหมาย) | README [V], ผู้ใช้จริง [U] | M | H | **High** | ทำ user journey และ usability check กับผู้ใช้จริงก่อน release และเปลี่ยนทีละส่วนแทน big-bang | 03/09 |
| R14 | Upgrade dependency (Next 16 middleware→proxy, Vitest 2→3 ฯลฯ) ระหว่าง redesign ทำให้ regression ปนกับงาน UI | Build warning [V] | M | M | **Medium** | แยก PR ของ dependency upgrade ออกจาก UI work | 06 |
| R15 | Vercel rollback ไม่ย้อน DB ทำให้ทีมเข้าใจผิดว่า rollback ปลอดภัยเสมอ | ข้อจำกัดของ platform [V] | M | H | **High** | ทุก release ที่แตะ DB ต้องมี DB rollback plan แยก (ดู `rollback-readiness.md`) | 06/10 |
| R16 | API endpoints ที่ไม่ได้ใช้ (`/api/insights`, `/api/export-excel`) ยังเปิดอยู่ ทำให้เป็น attack surface และมีค่าใช้จ่าย Gemini | ไม่มี client เรียก [V], มี auth แล้ว [V] | L | M | **Medium** | ตัดสินใน Step 02 ว่าจะเลิกใช้หรือเก็บไว้ | 02 |
| R17 | Auth users หรือ sign-up เปิดอยู่: ถ้า Supabase เปิด public sign-up ไว้ ใครก็สมัครแล้วเข้าถึงข้อมูลร้านได้ (ไม่มี role ในแอป) | ไม่มี role ในโค้ด [V], การตั้งค่า sign-up [U] | M | H | **Critical** จนกว่าจะยืนยัน | ตรวจ Auth → Providers → "Allow new users to sign up" ใน dashboard | 01 |

## Severity summary

- **Critical:** R01, R02*, R03*, R17* (* = Critical จนกว่าจะยืนยันว่าไม่เป็นปัญหา)
- **High:** R04, R05, R06, R07, R08, R10, R13, R15
- **Medium:** R09, R11, R12, R14, R16

## Production impact ของ Step 00

ไม่มี การทำงานใน Step 00 ไม่ได้ deploy, ไม่ได้แตะ DB หรือ Vercel และไม่ได้แก้ Git history การ build และ test รันบนเครื่อง local เท่านั้น และไม่มีการเรียก Supabase ระหว่าง build เพราะทุกหน้าเป็น client component แบบ static prerender
