# Database Migration Plan — Step 05

> วันที่: 2026-10-14 · **ไม่มี migration ใดถูกรันใน Step นี้** และห้ามรันกับ Production จนกว่าจะผ่าน gate ใน §5
> เครื่องมือ: Supabase CLI migrations (`supabase/migrations/<timestamp>_<name>.sql`) ใช้เป็นเครื่องมือของ dev/CI และไม่เพิ่ม runtime dependency (ADR-08)
> Rollback ระดับ release และขั้นตอนเหตุฉุกเฉินอยู่ใน `migration-and-rollback.md` (Step 06)

## 1. หลักการ

1. **Version-controlled:** ทุกการเปลี่ยน DB เป็นไฟล์ SQL ใน repo ผ่าน PR และ review ห้ามแก้ผ่าน Dashboard ยกเว้นการตั้งค่า Auth (sign-up) ที่ไม่มี SQL
2. **Staging ก่อนเสมอ:** apply staging → ทดสอบ (RLS, constraints, client v1.0.0 + client ใหม่) → อนุมัติ → apply production
3. **Expand → Migrate → Contract:** MVP มีแค่ expand + migrate และ contract ต้องรอ release หลัง client ใหม่ใช้งานครบ ≥ 1 release (C-04)
4. **ทุก migration มี:** forward SQL · verification SQL · down SQL · ผลต่อ client v1.0.0 · ผู้อนุมัติ
5. **Backup ก่อน apply production:** มี backup ล่าสุดที่ **เคยลอง restore บน staging สำเร็จ** (`rollback-readiness.md` §4) และ Vercel rollback ไม่ย้อน DB
6. **ห้ามแก้ข้อมูลผู้ใช้อัตโนมัติ** (เช่น ข้อมูลที่โดน ER-01 หรือแถวที่ผิด constraint) ให้เจ้าของตัดสินรายแถว (Q-14)

## 2. ลำดับ Migrations

| # | ชื่อไฟล์ (เสนอ) | ประเภท | สาระ | ขึ้นกับ | Release |
|---|---|---|---|---|---|
| **M000** | `00000000000000_baseline.sql` | baseline | schema-only dump ของ production ปัจจุบัน (tables, constraints, indexes, policies, functions, publication) ไม่มีข้อมูล | B3 อนุมัติ + สิทธิ์อ่าน | R0 |
| **M001** | `..._app_members.sql` | expand | สร้าง `app_members`, `is_app_member()` + **backfill สมาชิกจาก `auth.users` ที่เจ้าของยืนยันรายชื่อ** | M000, รายชื่อบัญชีที่ถูกต้อง | R0 |
| **M002** | `..._rls_policies.sql` | expand (security) | enable RLS, revoke `anon`, policy `to authenticated using (is_app_member())` ทั้ง CRUD | M001 | R0 |
| **M003** | `..._indexes.sql` | expand | 4 indexes | M000 | R0 |
| **M004** | `..._client_request_id.sql` | expand | column nullable + partial unique index | M000 | R0 |
| **M005** | `..._audit_triggers.sql` | expand | `tg_set_audit` บน records/expenses | M000 | R0 |
| **M006** | `..._read_rpcs.sql` | expand | `dashboard_today`, `daily_series`, `debt_summary`, `customer_breakdown`, `period_summary` | M002 | R1 |
| **M007** | `..._settle_records.sql` | expand | RPC `settle_records` | M002 | R1 |
| **M008** | `..._constraints_not_valid.sql` | expand | check constraints แบบ `NOT VALID` (บังคับเฉพาะแถวใหม่หรือที่ถูกแก้) | M000 + client R1 validation (§3 หมายเหตุ) | R1 |
| **M009** | `..._seq_trigger.sql` | expand | `tg_set_seq_number` | Q-06 (ค่าเริ่มต้น: ทำ) | R1 |
| **M010** | `..._validate_constraints.sql` | migrate | `VALIDATE CONSTRAINT` หลังเจ้าของจัดการแถวผิดกติกา (ถ้ามี) | M008 + รายงาน §4.2 | R2+ |
| M011+ | decision-gated | expand | soft delete / bills / audit_log / roles (`database-schema.md` §2.3) | Q-02, Q-05, Q-13, Q-01 | ตามคำตอบ |
| C001 | (contract, ภายหลัง) | contract | เช่น revoke `delete` ถ้า soft delete, เลิกใช้ `services` (ADR-09) | client เก่าหายครบ | หลัง v2.0.0 |

**นอก SQL (ทำผ่าน Dashboard + บันทึกใน PR):** ปิด "Allow new users to sign up" (ER-13), ตรวจค่า Max rows (U-4) และ Realtime publication

## 3. ความเข้ากันได้กับ client v1.0.0 (ที่ยังรันบน Production ระหว่าง rollout)

| Migration | client v1.0.0 ยังทำงานไหม | ผลที่ผู้ใช้เห็นก่อนได้ UI ใหม่ |
|---|---|---|
| M001–M002 RLS | ✅ ถ้าบัญชีของผู้ใช้ทุกคนอยู่ใน `app_members` · ❌ **ถ้าลืม backfill บัญชีใด บัญชีนั้นจะเห็นข้อมูลว่างทันที** | ไม่มี (ถ้า backfill ครบ) และต้องทดสอบด้วยทุกบัญชีจริงบน staging (สร้างบัญชีชื่อเดียวกันใน staging) ไม่ได้ จึงตรวจด้วย `select count(*) from auth.users u left join app_members m … where m is null` = 0 ก่อนและหลัง |
| M003 indexes | ✅ | เร็วขึ้นเล็กน้อย |
| M004 `client_request_id` | ✅ (client เก่าไม่ส่ง และค่าเป็น null) | ไม่มี |
| M005 audit trigger | ✅ client เก่าส่ง `created_by_email` และ `updated_*` แต่ trigger แทนที่ด้วยค่าจริง | ค่าเหมือนเดิม (เพราะ client เก่าส่งอีเมลจริงอยู่แล้ว) |
| M006–M007 RPC | ✅ (client เก่าไม่เรียก) | ไม่มี |
| M008 constraints NOT VALID | ⚠ client เก่า **หน้าแก้ไข** ที่ลบทะเบียนจนว่างหรือราคาว่าง (ER-05) จะได้ error ภาษาอังกฤษจาก Supabase แทนการบันทึกค่าผิด | ข้อความ error ดิบ (ER-17) จึงต้อง **deploy M008 หลังหรือพร้อม R1** (client ที่มี validation และ map error) |
| M009 seq trigger | ✅ client เก่าส่ง `seq_number` = count+1 แต่ trigger แทนที่ด้วย max+1 | เลขลำดับอาจต่างจากที่ client เก่าคาดในกรณีที่เคยลบรายการ (ซึ่งเป็นการแก้ ER-04) |
| M010 validate | ✅ | ไม่มี |

## 4. Verification ต่อ Migration (ตัวอย่าง)

### 4.1 Template ของไฟล์ migration
```sql
-- M00X_<name>.sql
-- Purpose: …   | Requirement: FR/NFR/ER …   | Down: supabase/rollback/M00X_<name>.down.sql
-- Compatible with client v1.0.0: yes/no (เหตุผล)
begin;
  -- forward statements (idempotent: if not exists / create or replace)
commit;
-- Verification (รันแยกหลัง apply):
-- select … ;  expected: …
```
ไฟล์ down เก็บแยกใน `supabase/rollback/` (Supabase CLI ไม่มี down migration ในตัว) และทดสอบ down บน staging ทุกไฟล์

### 4.2 SQL ตรวจข้อมูลก่อน M008/M010 (read-only)
```sql
select 'plate' c, count(*) from records where plate is null or char_length(btrim(plate)) not between 1 and 20
union all select 'price<0', count(*) from records where price < 0
union all select 'type', count(*) from records where type not in ('wash','polish')
union all select 'status', count(*) from records where payment_status not in ('paid','unpaid')
union all select 'customer>50', count(*) from records where char_length(customer_name) > 50
union all select 'note>200', count(*) from records where char_length(services[3]) > 200
union all select 'amount<1', count(*) from expenses where amount < 1
union all select 'title', count(*) from expenses where title is null or char_length(btrim(title)) not between 1 and 100;
```
ทุกค่าต้องเป็น 0 ก่อน M010 และถ้าไม่เป็น 0 ให้ส่ง **รายการ id** ให้เจ้าของตัดสิน (ไม่แก้เอง)

> **ผลจริงบน production (2026-10-14, เจ้าของรันชุดย่อย 4 ข้อ):** `plate` 0 · `price<0` 0 · `amount<1` 0 · `title` 0 [V] → constraint หลัก 4 ตัวจะ VALIDATE ผ่านกับข้อมูลปัจจุบัน ส่วนที่ยังไม่ได้รัน: `type`, `status`, `customer>50`, `note>200`

### 4.3 ตรวจ RLS หลัง M002 (บน staging)
| Test | คาดหวัง |
|---|---|
| anon key + ไม่มี session: `select` / `insert` / `update` / `delete` ทั้ง 2 ตาราง | 0 แถว หรือ 401/403 ทุกคำสั่ง (AC-02-2) |
| user ที่ **ไม่อยู่** ใน `app_members`: select | 0 แถว |
| member: CRUD | สำเร็จ |
| member ส่ง `created_by_email` ปลอม | ค่าที่บันทึก = อีเมลจาก JWT (AC-29-2) |
| member เรียก `settle_records` กับ id ที่ paid แล้ว | `updated_count` = 0 |
| Realtime: non-member subscribe | ไม่ได้รับ event |

ทดสอบอัตโนมัติด้วย SQL script ที่ `set local role authenticated; set local request.jwt.claims = '{…}'` ใน `supabase/tests/*.sql` (ไม่ต้องติดตั้ง pgTAP ถ้าไม่มี extension และใช้ `do $$ … assert … $$`)

## 5. Gate ก่อน apply Production

| # | เงื่อนไข | หลักฐาน |
|---|---|---|
| G1 | Staging project แยกจาก production (E-02) | project ref ต่างกัน |
| G2 | M000 baseline ตรงกับ production | diff `supabase db diff` = ว่าง |
| G3 | ทุก migration ผ่านบน staging + down ผ่าน | log CI / บันทึก |
| G4 | Regression CUJ-1..8 ผ่านทั้ง client v1.0.0 และ client ใหม่บน staging | checklist |
| G5 | Backup ล่าสุด + restore test สำเร็จ | `rollback-readiness.md` §4 |
| G6 | รายชื่อ `app_members` ยืนยันโดยเจ้าของ | ข้อความอนุมัติ |
| G7 | ช่วงเวลา deploy นอกเวลาทำการ (Q-19) | — |
| G8 | ผู้อนุมัติ release ยืนยัน (Q-20) | — |

## 6. ผลกระทบต่อระบบเดิม (สรุป)

| ด้าน | ผลกระทบ | ระดับ |
|---|---|---|
| ข้อมูลเดิม | ไม่ถูกแก้, ไม่ถูกลบ และไม่เปลี่ยนชนิด column | ไม่มี |
| การเข้าถึง | บัญชีที่ไม่อยู่ใน `app_members` และคนนอก (anon) **จะเข้าถึงข้อมูลไม่ได้** (ตั้งใจ) | สูงถ้า backfill ไม่ครบ → G6 |
| Client v1.0.0 | ทำงานต่อได้ ยกเว้นการบันทึกค่าผิดกติกาใน EditModal (M008) | ต่ำ |
| ประสิทธิภาพ | trigger seq ใช้ advisory lock ต่อวัน + scan ข้อมูลวันนั้น (มี index `created_at`) | ต่ำ |
| Realtime | RLS มีผลกับ postgres_changes จึงต้องทดสอบว่า member ยังได้ event | กลาง → ทดสอบ §4.3 |
