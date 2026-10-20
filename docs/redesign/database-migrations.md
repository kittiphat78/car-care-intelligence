# Database Schema & Migration Guide

> Step 12 · 2026-10-20 · ป้าย: **[V]** Verified · **[I]** Inferred · **[U]** Unknown
> ที่มา: `supabase/migrations/*.sql` (ตรวจที่ `v2.1.0`) · การออกแบบเดิมและเหตุผล: `database-schema.md`, `database-migration-plan.md`, `migration-and-rollback.md` · ย้อนกลับ: `rollback-plan.md`
> **ห้ามทดลอง SQL บน production · ห้ามปิด RLS · ห้ามแก้ข้อมูลผู้ใช้โดยไม่ได้อนุมัติรายแถว**

## 1. Schema ปัจจุบัน (production = M000–M009) [V]

### 1.1 ตาราง

| ตาราง | คอลัมน์หลัก | หมายเหตุ |
|---|---|---|
| `records` (รายรับ) | `id uuid` · `created_at timestamptz` · `type` (`wash`/`polish`) · `plate` · `services text[]` = `[ประเภทรถ, ยี่ห้อ, หมายเหตุ]` · `price integer` (บาท) · `seq_number` · `customer_name` · `payment_status` (`paid`/`unpaid`) · `job_status` (`done` เสมอ) · `payment_method` (`cash` เสมอ) · `created_by`, `created_by_email`, `updated_by_email`, `updated_at` · `client_request_id uuid` | `job_status`/`payment_method` ไม่มี UI ใช้ (TD-19) |
| `expenses` (รายจ่าย) | `id` · `created_at` · `title` · `amount integer` · `note` · audit 4 คอลัมน์ · `client_request_id` | |
| `app_members` | `user_id` (FK `auth.users`, ลบผู้ใช้แล้วลบตาม) · `role` (`staff`/`owner`, ยังไม่ใช้) · `created_at` | ไม่มี policy ให้แอปเขียน · ผู้ดูแลจัดการใน SQL Editor |

### 1.2 Function, trigger, กฎ

| Object | ทำอะไร | Migration |
|---|---|---|
| `is_app_member()` | `true` ถ้าผู้ใช้ปัจจุบันอยู่ใน `app_members` · ใช้ใน RLS ทุก policy · `security definer` เพื่อให้ policy อ่าน `app_members` ได้โดยผู้เรียกไม่ต้องมีสิทธิ์ตารางนั้น | M001 |
| RLS ของ `records`, `expenses` | `to authenticated using/with check (is_app_member())` ทุกคำสั่ง · revoke จาก `anon` | M002 |
| Index 4 ตัว | `records(created_at)` · `records(created_at) where unpaid` · `records(plate)` · `expenses(created_at)` | M003 |
| Unique `client_request_id` (partial, ไม่นับ NULL) | กันบันทึกซ้ำเมื่อกดซ้ำหรือ retry | M004 |
| `tg_set_audit` | ตั้ง `created_by*` ตอน insert และ `updated_*` ตอน update จาก JWT (ไม่เชื่อค่าจาก client) | M005 |
| `dashboard_today(p_day)` · `daily_series(p_from, p_to)` · `customer_breakdown(p_day)` | ยอดหน้าภาพรวมคำนวณใน DB ตามวัน Asia/Bangkok · `SECURITY INVOKER` (ผ่าน RLS) | M006 |
| `settle_records(p_ids uuid[])` | เปลี่ยนเป็น `paid` เฉพาะ id ที่ส่งมาและยังค้าง · คืนจำนวนแถวและยอด | M007 |
| Check constraints 7 ตัว | ทะเบียน 1–20 ตัว · ราคา ≥ 0 · ชื่อลูกค้า ≤ 50 · หมายเหตุ ≤ 200 · รายจ่าย ≥ 1 บาท · ชื่อรายจ่าย 1–100 · หมายเหตุรายจ่าย ≤ 200 (validate กับข้อมูลเดิมแล้ว ไม่ใช่ `NOT VALID`) | M008 |
| `tg_set_seq_number` | เลขลำดับต่อวัน = max+1 ของวันนั้น (advisory lock ต่อวัน กันเลขซ้ำ) | M009 |

ไม่มี: soft delete, audit log ของการลบ, Storage, Edge Functions, cron [V] · Realtime publication ของ 2 ตารางปิดอยู่บน production (known-issues K-07)

### 1.2.1 สมุดรายชื่อลูกค้า (M010–M012) · อยู่ใน `develop` · **ยังไม่ขึ้น production** (ไปกับ v2.2.0)

| Object | ทำอะไร | Migration |
|---|---|---|
| `customers` | ชื่อ (1–50, ตัดหัวท้าย) · หมายเหตุ (≤ 200) · audit 4 คอลัมน์ (`tg_set_audit`) · `client_request_id` (unique, ไม่นับ NULL) | M010 |
| `customer_phones` | เบอร์ตัวเลขล้วนแบบไทย (`^0([689][0-9]{8}|[2-57][0-9]{7})$`) · ป้าย ≤ 30 · เบอร์หลักได้ 1 เบอร์ต่อลูกค้า · เบอร์ไม่ซ้ำในลูกค้าคนเดียว · ลบลูกค้าแล้วลบตาม | M010 |
| `customer_vehicles` | ทะเบียน (ตัดหัวท้าย + ตัวพิมพ์ใหญ่, ≤ 20) · `plate_key` generated (ตัดช่องว่าง `.` `-`, ใช้ค้นหา) · `plate_core` generated (M012: ตัดจังหวัดท้าย เช่น `กข1234ชร.` → `กข1234`) **unique เฉพาะทะเบียนเต็ม** (อักษรไทย + เลข) · ทะเบียนเลขล้วนซ้ำข้ามลูกค้าได้ · ประเภทรถ/ยี่ห้อเป็น id ของ `CAR_TYPES`/`CAR_BRANDS` · สี ≤ 30 · หมายเหตุ ≤ 200 · ลบลูกค้าแล้วลบตาม | M010, M012 |
| RLS ทั้ง 3 ตาราง | สมาชิกเท่านั้น (`is_app_member()`) · revoke จาก `anon` | M010 |
| `save_customer(...)` | บันทึกลูกค้า + เบอร์ + รถใน transaction เดียว · กันบันทึกซ้ำ · ตรวจ `updated_at` · เทียบทะเบียนด้วย `plate_core` (M012) · ย้ายทะเบียนเต็มจากลูกค้าอื่นเมื่อผู้ใช้ยืนยัน (เฉพาะทะเบียนที่อยู่ในการบันทึกนั้น) · error `CC409`/`CC404`/`CCPLT`/`CC422` · `security invoker` | M011, M012 |

ทดสอบ: `supabase/tests/customers.test.sql` · ข้อมูลทดสอบในเครื่อง: `supabase/seed_customers.sql` (โหลดเอง ไม่อยู่ใน `config.toml`) · down ของ M010 **ไม่ยอม drop ถ้ายังมีลูกค้า** · down ของ M012 ไม่ยอมย้อนถ้ามีรถ 2 คันใช้ `plate_key` เดียวกัน · รูปแบบทะเบียนจริงที่ใช้ตัดสินกฎ: `docs/features/customer-directory.md` §2.1 · ออกแบบ: `docs/features/customer-directory.md`

### 1.3 ไฟล์ใน `supabase/`

| โฟลเดอร์ | เนื้อหา |
|---|---|
| `migrations/` | `00000000000000_baseline.sql` (M000 = schema ของ production ณ 2026-10-14 ก่อน redesign) + M001–M009 |
| `rollback/` | down script ต่อ migration (Supabase CLI ไม่มี down ในตัว) · M000 ไม่มี down |
| `tests/` | SQL tests ต่อ migration + `ci_fixtures.sql` (เพิ่มสมาชิกทดสอบใน CI) |
| `checks/` | SQL ที่เจ้าของรันเอง: `b6_data_check.sql` (หาแถวผิดกติกา), `backup_fingerprint.sql`, `restore_drill.sql` (ทดลองกู้ backup บน staging) |
| `seed.sql` | ข้อมูลสมมติ ~1,260 รายรับใน 420 วัน + ค้างชำระ + รายจ่าย · **ปฏิเสธถ้าตารางมีข้อมูลอยู่แล้ว** · ห้ามรันบน production |
| `config.toml` | ใช้กับ CLI ในเครื่องและ CI เท่านั้น (Postgres 17, port 54322) |

## 2. ประวัติ migration บน production

| Migration | ขึ้น production | Release | หลักฐาน |
|---|---|---|---|
| M000 baseline | (เป็นสภาพเดิมของ production) | — | `production-baseline.md` |
| M001–M002 สมาชิก + RLS | 2026-10-15 | v1.2.0 | 4/4 บัญชีเป็นสมาชิก · anon ถูกปฏิเสธทุกตาราง (`release-1.2.0.md`) |
| M003–M005 | 2026-10-15 | v1.2.0 | index 4 · column 2 · trigger 2 |
| M006–M007 | 2026-10-15 | v1.2.0 | function 4 ตัว · anon ถูกปฏิเสธ |
| M008–M009 | 2026-10-15 | v1.2.0 | ข้อมูลเดิมผ่านกฎ 9/9 · เลขลำดับเรียงถูก |
| — | v2.0.0, v2.1.0 | ไม่มี migration | `release-notes-draft.md` |

**วิธีที่ใช้จริง:** เจ้าของรันไฟล์ migration บน production เองตามลำดับ **ก่อน** merge PR ของแอปที่ต้องใช้ (บรรทัดแรกของ PR template บอกชื่อไฟล์) [V จาก PR template และ S07-28] ผ่าน Supabase SQL Editor [I] · workflow GitHub สำหรับรัน migration ที่วางแผนไว้ใน `ci-quality-gates.md` §5 **ไม่ได้สร้าง** [V]

> **ระวัง:** ถ้ารันผ่าน SQL Editor ตาราง `supabase_migrations.schema_migrations` ของ production จะไม่มีประวัติ M000–M009 [U] · ก่อนใช้ `supabase db push` กับ production ครั้งแรก ต้อง `supabase migration list` ดูก่อน และถ้าว่างให้ทำ `supabase migration repair --status applied <version>` ทีละไฟล์ (ต้องอนุมัติ) ไม่งั้น CLI จะพยายามรัน baseline ซ้ำ

## 3. เขียน migration ใหม่

### 3.1 กฎ

1. **Expand ก่อนเสมอ:** เพิ่มของใหม่โดยแอปเวอร์ชันที่ production รันอยู่ยังทำงานได้ (column nullable/มี default, function ใหม่, constraint ที่ข้อมูลเดิมผ่าน) · การลบ/เปลี่ยนชนิด (contract) แยก release และต้องอนุมัติพร้อม backup
2. **Idempotent:** `if not exists`, `create or replace` · ห่อด้วย `begin; … commit;`
3. **ห้ามในไฟล์ migration:** แก้/ลบข้อมูลผู้ใช้แบบ bulk, `drop table`/`drop column` ที่มีข้อมูล, ปิด RLS, ให้สิทธิ์ `anon`
4. **Function ที่แตะข้อมูล:** `security invoker` (ให้ RLS ทำงาน) และ `set search_path = ''` แล้วเขียนชื่อเต็ม (`public.records`) เหมือน function เดิมทุกตัว · ถ้าจำเป็นต้อง `security definer` (มีแค่ `is_app_member()`) ต้องอ่านเฉพาะสิ่งที่จำเป็นและอธิบายเหตุผลใน PR
5. **ทุก migration ต้องมี:** header (Purpose / Data / Down / Compatible with client) · down script ใน `supabase/rollback/` · SQL test ใน `supabase/tests/` · ถ้ามี constraint ใหม่ ให้รัน query หาแถวผิดกติกาบน production ก่อน (แบบอ่านอย่างเดียว เช่น `checks/b6_data_check.sql`)
6. **Down script** ต้องไม่ลบข้อมูลผู้ใช้ (drop ได้แค่ function, trigger, index, policy, constraint และ column ใหม่ที่ยังไม่มีข้อมูลสำคัญ)

### 3.2 ขั้นตอน

```bash
git switch -c db/<desc> origin/develop
supabase migration new <desc>                       # สร้าง supabase/migrations/<timestamp>_<desc>.sql
# เขียน migration + supabase/rollback/<timestamp>_<desc>.down.sql + supabase/tests/<desc>.test.sql
supabase db reset                                   # migrations ทั้งหมด + seed ในเครื่อง
# SQL tests และ down scripts: testing-guide.md §3
npm run validate                                    # ถ้ามีโค้ดแอปด้วย
```

1. PR เข้า `develop` · CI job `db` รัน migrations + tests + down ทั้งหมด
2. **Staging:** ใส่ migration ลง staging ก่อนทดสอบ RC บน Preview [U: วิธีที่ใช้กับ staging ไม่มีบันทึก · แนะนำ SQL Editor ของ staging หรือ `supabase link --project-ref <staging-ref>` + `supabase db push` หลังตรวจ `migration list`]
3. **Backup production** (§4)
4. **Production:** ระหว่าง release (`git-workflow.md` §4) เจ้าของรัน migration บน production **ก่อน** merge release PR · ช่วงนอกเวลาทำการ (Q-19) · แล้วรัน query ตรวจผลที่เขียนไว้ในไฟล์
5. บันทึกใน release record: ไฟล์ที่รัน · เวลา · ผลตรวจ

ลำดับเมื่อ release มีทั้ง DB และแอป: **DB (expand) → แอป** · ถ้ามี constraint ที่แอปเก่ายังส่งค่าผิดได้ ให้ปล่อยแอปที่ตรวจค่าก่อน แล้วค่อย constraint (`migration-and-rollback.md` §2)

## 4. Backup ก่อนเปลี่ยนฐานข้อมูล

| ทำอะไร | วิธี | หลักฐานที่เคยทำ |
|---|---|---|
| Export ข้อมูล | Supabase → Table Editor → `records`, `expenses` → Export CSV · เก็บนอก Supabase | `backup-2026-10-15` (เจ้าของเก็บ) [V] |
| จดลายนิ้วมือข้อมูล | รัน `supabase/checks/backup_fingerprint.sql` บน production (อ่านอย่างเดียว) | 2026-10-15 [V] |
| ทดลองกู้ (อย่างน้อยครั้งแรก/เมื่อเปลี่ยนวิธี) | `supabase/checks/restore_drill.sql` บน **staging** · ลบตาราง `restore_*` หลังเสร็จ (เป็นข้อมูลจริง) | fingerprint ตรงทุกค่า 962 รายรับ / 91 รายจ่าย (S07-31) [V] |
| Backup อัตโนมัติของ Supabase | ขึ้นกับ plan | [U] ยังไม่ได้ตรวจ plan/นโยบาย backup ของ production |

## 5. จัดการสมาชิก (`app_members`)

ทำใน Supabase SQL Editor ของ project นั้นโดยผู้ดูแล (ไม่มีหน้าในแอป):

```sql
-- เพิ่ม: สร้างผู้ใช้ใน Authentication → Users ก่อน แล้ว
insert into public.app_members (user_id) select id from auth.users where email = '<email>';
-- ตรวจว่าทุกบัญชีเป็นสมาชิก (ต้องได้ 0 แถว ถ้าทุกบัญชีควรเป็นสมาชิก)
select u.email from auth.users u left join public.app_members m on m.user_id = u.id where m.user_id is null;
-- เอาออก (บัญชียังอยู่ แต่จะเห็นข้อมูลว่างทันที)
delete from public.app_members where user_id = (select id from auth.users where email = '<email>');
```

## 6. งานฐานข้อมูลที่ยังค้าง

| เรื่อง | สถานะ |
|---|---|
| ย้าย `services[]` เป็นคอลัมน์ `car_type`, `car_brand`, `note` (ADR-09) | ยังไม่ทำ · ต้อง expand → backfill → แอปใช้คอลัมน์ใหม่ → contract |
| Realtime publication ของ `records`, `expenses` | ปิดอยู่ (known-issues K-07) |
| Soft delete / ถังขยะ / audit log การลบ | ไม่มี · ลบแล้วกู้ได้จาก backup เท่านั้น |
| ประวัติ migration ของ production ใน CLI | [U] ดู §2 |
| GitHub workflow รัน migration staging/production | ไม่มี (ทำมือ) |
