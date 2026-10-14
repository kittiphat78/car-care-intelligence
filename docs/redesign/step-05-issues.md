# Step 05 — Issue Log

> Step: 05 — Software Architecture & Database Design · วันที่: 2026-10-14
> Branch: `docs/redesign-step-05-architecture` (แตกจาก `docs/redesign-step-04-design-system` @ `c499ba4`)
> สถานะ: `RESOLVED` · `UNRESOLVED` · `BLOCKED` · `NEEDS_APPROVAL`

## สรุป

| ID | เรื่อง | Severity | สถานะ |
|---|---|---|---|
| S05-01 | Schema/RLS จริงของ production ยังไม่รู้ ทำให้ M000 baseline สร้างไม่ได้ | Critical | BLOCKED |
| S05-02 | ADR-01..14 รออนุมัติ โดยเฉพาะ ADR-02 (ไม่ใช้ Server Actions) และ ADR-04 (allowlist) | High | NEEDS_APPROVAL |
| S05-03 | รายชื่อบัญชีที่ถูกต้องสำหรับ `app_members` | High | NEEDS_APPROVAL |
| S05-04 | คำถามที่ gate schema: Q-01, Q-02, Q-05, Q-06, Q-13 | Medium | NEEDS_APPROVAL |
| S05-05 | Node version และ function region บน Vercel | Medium | BLOCKED |
| S05-06 | `records.note` ประกาศใน type แต่ไม่มีโค้ดเขียน | Low | UNRESOLVED |
| S05-07 | `markAllAsPaidByCustomer` เดิมไม่ match ชื่อที่มีช่องว่างหัวท้าย (ขยาย ER-03) | Medium | RESOLVED (ในแบบ) |
| S05-08 | ร่าง trigger แรกใช้ `security definer` โดยไม่จำเป็น | Low | RESOLVED |

Carry-over: S01-01 (Supabase), S01-02 (Vercel), S01-03/S01-04 (hotfix), S01-08/09 (push), S03-01/S03-05 (UX baseline/อุปกรณ์), S04-01 (library: ADR-14 ใช้ค่าเริ่มต้นไม่เพิ่ม)

---

## S05-01 — ไม่รู้ schema/RLS จริง · Critical · `BLOCKED`
- **ผล:** `database-schema.md` §1 เป็น [I] ทั้งหมด และ M000 (baseline) ซึ่งทุก migration พึ่งพา สร้างไม่ได้
- **สิ่งที่ทำแล้ว:** ออกแบบ target ให้ idempotent (`if not exists`, `create or replace`) และกำหนดว่า M002 ต้อง drop หรือแทนที่ policy เดิมอย่างชัดเจนหลังเห็น M000
- **ต้องการ:** ผล SQL ข้อ 1–12 (`production-baseline.md` §8) หรืออนุมัติ B3 (schema-only dump) เพื่อสร้าง M000
- **Prompt:** > "แก้ S05-01: นี่คือ schema-only dump / ผล SQL ของ production ให้สร้าง `supabase/migrations/00000000000000_baseline.sql`, อัปเดต `database-schema.md` §1 เป็น [V] และปรับ M002/M008 ให้สอดคล้องกับ policy/constraint ที่มีอยู่จริง ห้ามรันกับ production"

## S05-02 — ADR รออนุมัติ · High · `NEEDS_APPROVAL`
- **จุดตัดสินใจหลัก:**
  - **ADR-02:** ให้ DB บังคับกฎ และไม่ทำ BFF ด้วย Server Actions (ทางเลือกอื่นทำให้ client v1.0.0 และ realtime ใช้ไม่ได้ระหว่าง rollout)
  - **ADR-04:** `app_members` allowlist
  - **ADR-11:** ไม่ใช้ Sentry
  - **ADR-14:** ไม่เพิ่ม runtime dependency
- **ความเสี่ยงถ้าไม่ตัดสิน:** Step 07 เริ่มงาน data layer ไม่ได้
- **Prompt:** > "S05-02: อนุมัติ ADR-01..14 ยกเว้น <ระบุ> …"

## S05-03 — รายชื่อสมาชิก · High · `NEEDS_APPROVAL`
- **เหตุผล:** M001 backfill `app_members` จาก `auth.users` ถ้ามีบัญชีที่ไม่ควรมีสิทธิ์ (เช่น สมัครเองตอน sign-up เปิด) ต้องไม่ถูกใส่ และถ้าลืมบัญชีจริง ผู้ใช้คนนั้นจะเห็นข้อมูลว่าง
- **ต้องการ:** เจ้าของยืนยันรายชื่ออีเมลที่ควรเข้าระบบได้ (ส่งแบบไม่เปิดเผยต่อสาธารณะ) และ SQL ตรวจ: `select email, created_at, last_sign_in_at from auth.users order by created_at;`

## S05-04 — คำถามที่ gate schema · Medium · `NEEDS_APPROVAL`
| Q | ค่าเริ่มต้นที่ใช้ในแบบ | ผลถ้าเปลี่ยน |
|---|---|---|
| Q-01 roles | ทุกคนเท่ากัน | เพิ่ม policy ตาม `authorization-matrix.md` §3 |
| Q-02 กู้คืนการลบ | ลบถาวร | soft delete + contract revoke delete |
| Q-05 เลขบิล | ต่อเครื่องเหมือนเดิม | `bills` + RPC + ต้องรู้เลขล่าสุด |
| Q-06 seq_number | ทำ M009 (ไม่ซ้ำ) | ข้าม M009 |
| Q-13 audit log | ล่าสุดเท่านั้น | `audit_log` + trigger |

## S05-05 — Node version / region · Medium · `BLOCKED`
- ต้องรู้จาก Vercel project settings (S01-02) และ Supabase region เพื่อเลือก function region (ADR-13)

## S05-06 — `records.note` · Low · `UNRESOLVED`
- **หลักฐาน:** `types/index.ts:28` มี `note?: string` แต่ `app/add/page.tsx:109-114` ไม่เขียน `note` (หมายเหตุอยู่ใน `services[2]`) และไม่มีโค้ดอ่าน `record.note` [V grep]
- **ผล:** ไม่รู้ว่ามี column จริงหรือมีข้อมูลเก่า (U) และแบบใหม่ไม่ใช้ `records.note` (ADR-09)
- **การปิด:** ตรวจใน M000 แล้วถ้ามีข้อมูลให้บันทึกไว้ (ไม่ลบ column)

## S05-07 — `markAllAsPaidByCustomer` match ชื่อแบบตรงตัว · Medium · `RESOLVED` (ในแบบ)
- **หลักฐาน:** `hooks/useDashboard.ts:146` `.eq('customer_name', targetName)` ขณะที่การจัดกลุ่ม trim ชื่อ (`:272`) ทำให้ชื่อ "เต็นท์ A " (มีช่องว่าง) แสดงในกลุ่ม "เต็นท์ A" แต่ไม่ถูกเคลียร์ (ขยายจาก ER-03 ที่เดิมระบุแค่ NULL)
- **การแก้ในแบบ:** `settle_records(ids[])` ใช้ id ที่แสดงจริงแทนการ match ชื่อ (`database-schema.md` §2.2) และยังไม่แก้โค้ด (Step 07)

## S05-08 — Trigger `security definer` · Low · `RESOLVED`
- **พบระหว่าง review ตัวเอง:** ร่างแรกของ `tg_set_audit`/`tg_set_seq_number` เป็น `security definer` ซึ่งไม่จำเป็นและเพิ่มพื้นที่เสี่ยง
- **การแก้:** เปลี่ยนเป็น `security invoker` เหลือ definer เฉพาะ `is_app_member()` (ต้องอ่าน `app_members` ข้าม RLS) พร้อม `set search_path = ''`
