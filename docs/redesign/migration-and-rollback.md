# Migration & Rollback — Step 06

> วันที่: 2026-10-14 · ต่อยอดจาก `database-migration-plan.md` (Step 05) และ `rollback-readiness.md` (Step 00)
> หลักสำคัญ: **Vercel Rollback ย้อนแค่โค้ดแอป ไม่ย้อน Database, Storage หรือ external services**

## 1. Expand → Migrate → Contract ในระบบนี้

| ขั้น | ทำอะไร | ตัวอย่างจริงในแผน | Client ที่ต้องทำงานได้ |
|---|---|---|---|
| 1. **Expand** | เพิ่มโครงใหม่โดยไม่ทำให้โค้ดเดิมพัง (column nullable, ตาราง, function, trigger ที่ทนค่าจาก client เก่า, constraint `NOT VALID`) | M001–M009 | v1.0.0 **และ** v1.1/1.2 |
| 2. **Migrate** | ย้ายหรือตรวจข้อมูล และให้โค้ดใหม่ใช้โครงใหม่ (backfill, `VALIDATE`) | M010, backfill `app_members` | v1.x ใหม่ |
| 3. **Switch** | release โค้ดที่พึ่งโครงใหม่อย่างเดียว | v1.2.0 ใช้ RPC/`settle_records` | v1.2+ |
| 4. **Contract** | ลบหรือ revoke ของเก่า **หลังยืนยันว่าไม่มีใครใช้แล้ว** (≥ 1 release + ไม่มี client เก่าเปิดค้าง) | revoke `delete` (ถ้า soft delete), เลิก `services` (ADR-09) | v2.x เท่านั้น |

**ยืนยันว่า "ไม่มีใครใช้แล้ว":** (1) Vercel ไม่มี deployment เก่าที่ alias อยู่ (2) แจ้งผู้ใช้ให้ reload หรือปิดเปิดแอปบน tablet (3) ถ้าทำได้ ดู log ของ PostgREST หลัง ≥ 7 วันว่าไม่มี request แบบเก่า (เช่น update `customer_name` ด้วย filter แบบเดิม) [U] ขึ้นกับ plan ของ Supabase

## 2. ลำดับ Deploy ต่อ Release

| Release | ลำดับ | เหตุผล |
|---|---|---|
| v1.0.1 (hotfix) | app อย่างเดียว | ไม่มี DB change |
| v1.1.0 (R0) | **DB (M000–M005) → app** | expand-only และ client v1.0.0 ทำงานได้กับ DB ใหม่ |
| v1.2.0 (R1) | **M006–M007 → app → (ตรวจ 24 ชม.) → M008–M009** | M008 constraint ต้องตามหลัง client ที่มี validation เพื่อไม่ให้ผู้ใช้เห็น error ดิบ (`database-migration-plan.md` §3) |
| v2.0.0 | app อย่างเดียว | Phase B ไม่มี DB change |
| contract | DB อย่างเดียว | หลัง v2.0.0 คงที่ |

## 3. Rollback — Application (Vercel)

| สถานการณ์ | วิธี | เวลาโดยประมาณ † | ข้อจำกัด |
|---|---|---|---|
| Release ใหม่มีปัญหา UI หรือ logic | Vercel → Deployments → deployment ก่อนหน้า → **Instant Rollback** | < 5 นาที | DB ไม่ย้อน จึงต้องเป็น release ที่ DB ยังเข้ากันได้กับ app เก่า (ซึ่งทุก release ในแผนเป็นแบบนั้นเพราะ expand-only) |
| ต้องการให้ `main` ตรงกับสิ่งที่รันอยู่หลัง rollback | PR `revert: <release>` เข้า `main` | 15–30 นาที | ห้าม force-push `main` |
| Rollback แล้วต้องแก้ต่อ | `hotfix/*` จาก tag ที่ rollback กลับไป | — | tag ใหม่เป็น PATCH ถัดไป ไม่ใช้เลขเดิมซ้ำ |
| Tablet ยังรันโค้ดใหม่ค้างอยู่ | แจ้งให้ reload (ไม่มี service worker จึง reload แล้วได้เวอร์ชันที่ deploy อยู่) | — | — |

**ห้าม:** ลบ tag ของ release ที่ rollback ให้คง tag ไว้ และบันทึกใน release notes ว่า "rolled back"

## 4. Rollback — Database

ลำดับความชอบ (เลือกข้อแรกที่ใช้ได้):

| # | วิธี | ใช้เมื่อ | ความเสี่ยงต่อข้อมูล |
|---|---|---|---|
| D1 | **ไม่ต้องย้อน DB** แค่ rollback app (expand-only) | เกือบทุกกรณีในแผน | ไม่มี |
| D2 | **Forward-fix** ด้วย migration ใหม่ (เช่น แก้ function หรือ policy) | logic ใน DB ผิด | ไม่มี |
| D3 | **Down script** (`supabase/rollback/M0xx.down.sql`) ผ่าน workflow production (อนุมัติ) | object ใหม่ก่อปัญหา และ down ไม่ลบข้อมูลผู้ใช้ | ต่ำ (down ของแผนนี้ลบแค่ function, trigger, index, policy และ column ใหม่ที่ไม่มีข้อมูลสำคัญ) |
| D4 | **Restore backup / PITR** ไป project ใหม่ แล้วคัดลอกข้อมูลที่ต้องการกลับ | ข้อมูลเสียหาย | **สูง:** ข้อมูลหลังเวลา backup หาย จึงต้องได้อนุมัติจากเจ้าของ + export ข้อมูลช่วงที่จะหายก่อน |

### 4.1 Down script ต่อ migration (สรุป)
| Migration | Down | ข้อมูลหาย? |
|---|---|---|
| M001 app_members | `drop function is_app_member; drop table app_members` (ต้อง down M002 ก่อน) | ไม่ (รายชื่อสมาชิกสร้างใหม่ได้) |
| M002 RLS | คืน policy เดิมจาก M000 **ห้าม disable RLS ทั้งตาราง** ถ้าเดิมเปิดอยู่ | ไม่ |
| M003 indexes | `drop index` | ไม่ |
| M004 client_request_id | `drop index`; คง column ไว้ (nullable ไม่มีผล) และ drop ใน contract | ไม่ |
| M005 audit trigger | `drop trigger` | ไม่ (ค่าที่ trigger เขียนไปแล้วอยู่ต่อ) |
| M006/M007 RPC | `drop function` | ไม่ |
| M008 constraints | `alter table … drop constraint` | ไม่ |
| M009 seq trigger | `drop trigger` (client v1.2+ ต้องส่ง seq เองหรือแสดงโดยไม่มี seq ซึ่งต้องเตรียม fallback ใน B6) | ไม่ |
| M010 validate | ไม่ต้อง down (drop constraint ถ้าจำเป็น) | ไม่ |

### 4.2 กฎ
- Down script ทุกไฟล์ต้องทดสอบบน staging ก่อน release ที่มี migration นั้น
- ห้าม `drop table`, `drop column` ที่มีข้อมูลผู้ใช้ หรือ `truncate` ใน down ใด ๆ
- RLS: ห้ามใช้การปิด RLS เป็นการ rollback (master prompt §G)

## 5. Emergency (นอกเวลาทำการ / แอปใช้ไม่ได้)

1. **ประเมิน 5 นาที:** ผู้ใช้ทำอะไรไม่ได้? ข้อมูลผิดหรือหาย? (ดู Vercel logs + `/api/client-errors`)
2. **หยุดความเสียหาย:** Vercel Instant Rollback ไป tag ก่อนหน้า (D1)
3. **ถ้ายังไม่หาย** และเกี่ยวกับ DB: ตรวจว่าเป็น migration ล่าสุดไหม → D2/D3 ผ่าน workflow production (ต้องมีผู้อนุมัติ 1 คน และถ้าเป็นคนเดียวกับผู้ทำ ให้บันทึกเหตุผลใน incident log)
4. **ห้าม** แก้ข้อมูลผู้ใช้ตรงใน SQL Editor ระหว่างเหตุฉุกเฉิน ยกเว้นเจ้าของอนุมัติรายแถว
5. **สื่อสาร:** แจ้งผู้ใช้ในร้าน (บันทึกในกระดาษชั่วคราว ถ้าระบบล่มนาน) แล้วบันทึกเพื่อนำมาลงระบบภายหลัง
6. **หลังเหตุการณ์:** incident note ใน `docs/incidents/YYYY-MM-DD.md` + issue + test ที่กันซ้ำ

## 6. Rollback — Storage
ระบบ **ไม่ใช้ Supabase Storage** [V] จึงไม่มีขั้นตอน และถ้าอนาคตเก็บบิล PDF (Q-05) ให้ใช้ bucket private + เก็บไฟล์แบบไม่เขียนทับ (path มีเลขบิล) จึงไม่ต้องย้อน ส่วนการลบไฟล์ต้องมีอนุมัติแยก

## 7. Client-side state
| State | ผลจาก rollback | การจัดการ |
|---|---|---|
| `localStorage` (`car-care-theme`, `remembered_email`, `recentCustomers`, `last_bill_number`) | ทุกเวอร์ชันใช้ key เดิม | **ห้ามเปลี่ยนชื่อ key** ในแผนนี้ |
| `sessionStorage` draft (ใหม่ใน v2) | v1 ไม่อ่าน (ไม่มีผล) | prefix `cc:v2:draft:` |
| PWA manifest | rollback แล้ว manifest เก่ากลับมา | ไม่มีผลต่อข้อมูล |
