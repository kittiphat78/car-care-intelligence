# Authorization Matrix — Step 05

> วันที่: 2026-10-14 · หลัก: **DB บังคับเสมอ** และ UI/proxy เป็นแค่ UX (ADR-02, ADR-04)
> Role ใน MVP: ทุกสมาชิกเท่ากัน (D-08, Q-01 ค่าเริ่มต้น a) โดยโครงสร้างรองรับ 2 roles ถ้าภายหลัง Q-01 = b

## 1. Principals

| Principal | คือใคร | ได้มาอย่างไร |
|---|---|---|
| `anon` | ผู้ที่ไม่ได้ login (anon key อยู่ใน JS bundle สาธารณะ) | — |
| `authenticated` (non-member) | บัญชี Supabase Auth ที่ **ไม่อยู่ใน `app_members`** เช่น สมัครเองโดยหลุดการปิด sign-up | ไม่ควรมีอยู่ |
| `member:staff` | พนักงาน/ครอบครัวที่ผู้ดูแลเพิ่ม | ผู้ดูแลสร้างบัญชี + insert `app_members` |
| `member:owner` | เจ้าของ (ใช้งานจริงเมื่อ Q-01 = b) | เหมือนกัน |
| `service_role` | ผู้ดูแลระบบผ่าน Supabase Dashboard/CLI | **ไม่ใช้ในแอป** และไม่อยู่ใน env ของ Vercel |

## 2. Matrix — MVP (Q-01 = a)

| Resource / Action | anon | authenticated (non-member) | member (staff = owner) | บังคับที่ |
|---|---|---|---|---|
| หน้า `/login` | ✅ | ✅ (redirect `/`) | ✅ (redirect `/`) | proxy |
| หน้าอื่นทั้งหมด | ❌ → `/login` | ⚠ แสดงได้แต่ข้อมูลว่าง + ข้อความ "บัญชีนี้ยังไม่ได้รับสิทธิ์" | ✅ | proxy + `(app)/layout` (UX) |
| `records` select | ❌ | ❌ (0 แถว) | ✅ ทุกแถว | RLS `is_app_member()` |
| `records` insert | ❌ | ❌ | ✅ (audit/seq ตั้งโดย trigger) | RLS + trigger + constraint |
| `records` update | ❌ | ❌ | ✅ (แก้ `created_by*` ไม่ได้) | RLS + trigger |
| `records` delete | ❌ | ❌ | ✅ (hard delete จนกว่า Q-02) | RLS |
| `expenses` CRUD | ❌ | ❌ | ✅ | เหมือน records |
| RPC อ่าน (`dashboard_today` …) | ❌ (revoke) | ✅ เรียกได้แต่ได้ผล 0 เพราะ RLS | ✅ | grant + RLS (invoker) |
| RPC `settle_records` | ❌ | ✅ เรียกได้แต่ update 0 แถว | ✅ | grant + RLS |
| `app_members` select | ❌ | ✅ เฉพาะแถวตัวเอง (ไม่มีแถว) | ✅ เฉพาะแถวตัวเอง | RLS |
| `app_members` insert/update/delete | ❌ | ❌ | ❌ (ผู้ดูแลทำผ่าน SQL Editor) | ไม่มี policy |
| Realtime `records`/`expenses` | ❌ | ❌ (ไม่ได้ event) | ✅ | RLS ของ Realtime |
| `POST /api/client-errors` | ❌ 401 | ✅ (log ได้) | ✅ | Route Handler ตรวจ session |
| Storage | — ไม่มี bucket | — | — | — |
| Export Excel / บิล PDF | ❌ | ไฟล์ว่าง | ✅ | ทำบน client จากข้อมูลที่ RLS อนุญาต |

## 3. Matrix — ถ้า Q-01 = b (owner / staff) [ยังไม่ทำ]

| Action | staff | owner | Policy (ร่าง) |
|---|---|---|---|
| ดูทุกหน้า, บันทึก, แก้ไขรายการ **ของวันนี้** | ✅ | ✅ | `using (is_app_member())` |
| แก้ไขรายการย้อนหลัง > N วัน | ❌ | ✅ | `using (is_owner() or created_at >= now() - interval 'N days')` |
| ลบรายการ | ❌ | ✅ | delete `using (is_owner())` |
| เคลียร์ยอด | ? | ✅ | ใน `settle_records` ตรวจ `is_owner()` |
| Export | ? | ✅ | ทำบน client แต่การอ่านข้อมูลทั้งปีไม่ถูกจำกัด จึงต้องกำหนดเป็น policy ถ้าต้องการจำกัดจริง |

UI ซ่อนปุ่มที่ทำไม่ได้ **เพิ่มเติม** จาก policy (ห้ามใช้ UI หรือ feature flag แทน authorization ตาม master prompt §G)

## 4. Policy ร่าง (MVP)

```sql
alter table public.records  enable row level security;
alter table public.expenses enable row level security;
revoke all on public.records, public.expenses from anon;

create policy records_member_all on public.records
  for all to authenticated
  using (public.is_app_member()) with check (public.is_app_member());
create policy expenses_member_all on public.expenses
  for all to authenticated
  using (public.is_app_member()) with check (public.is_app_member());
```
> policy เดิมที่มีอยู่ใน production [U] ต้องถูกระบุใน M000 แล้ว drop หรือแทนที่ใน M002 อย่างชัดเจน (ไม่ใช้ `create policy if not exists` ซ้อนกับของเดิม เพราะ policy แบบ permissive รวมกันด้วย OR และอาจเปิดกว้างกว่าที่ตั้งใจ)

## 5. การจัดการบัญชี (ผู้ดูแลระบบ)

| งาน | วิธี |
|---|---|
| เพิ่มผู้ใช้ | Supabase Auth → Invite/Create user แล้ว `insert into app_members(user_id) values (…)` |
| ปิดผู้ใช้ | `delete from app_members where user_id = …` (เข้าระบบได้แต่เห็นข้อมูลว่าง) + ban ใน Auth |
| Reset รหัสผ่าน | Supabase Auth (Q-15 ค่าเริ่มต้น) |
| ตรวจสมาชิก | `select u.email, m.role from auth.users u left join app_members m on m.user_id = u.id;` |

ขั้นตอนอยู่ใน runbook (Step 12)
