# Environment Matrix — Step 00

> **ประวัติ (ก่อนมี staging)** · แผนในไฟล์นี้ทำครบแล้ว · สถานะและวิธีตั้งค่าปัจจุบันอยู่ที่ `environment-setup.md`

> วันที่ตรวจ: 2026-10-14 · ป้ายกำกับ: **[V]** Verified · **[I]** Inferred · **[U]** Unknown

## 1. สถานะปัจจุบัน (As-Is)

| มิติ | Local Development | Vercel Preview | Vercel Production |
|---|---|---|---|
| Source | Working tree บนเครื่องนี้ | ทุก branch ที่ push (ถ้าเปิด Git integration) [I] | `main` [I] |
| Commit ที่รันอยู่ | ตาม branch ปัจจุบัน | ต่อ branch | **[U]** คาดว่าเป็น `7f58eec` แต่ยังยืนยันไม่ได้ |
| Supabase project | 1 project จาก `.env.local` [V] | [U] | [U] |
| แยกจาก Production DB หรือไม่ | **[I] ไม่แยก** ไม่มีหลักฐานว่ามี project ที่สอง (มีไฟล์ env เดียว และไม่มีเอกสาร staging) | **[U] ความเสี่ยงสูง** ถ้า env scope "Preview" ใช้ค่าเดียวกับ Production จะเขียนข้อมูลจริง | — |
| Auth users | ใช้ร่วมกับ project ใน `.env.local` | ตาม project ที่ผูก | ผู้ใช้จริง [U จำนวน] |
| `GEMINI_API_KEY` | ไม่ตั้ง [V] | [U] | [U] |
| Domain | `localhost:3000` | `*.vercel.app` ต่อ deployment | [U] |
| Deployment protection | — | [U] (Vercel Authentication เปิดหรือไม่) | — |
| CI checks ก่อน deploy | ไม่มี [V] | ไม่มี [V] | ไม่มี [V] |

### ข้อสรุป As-Is

1. **[I] Local dev น่าจะชี้ไปที่ Production Supabase** ถ้าจริง การรัน `npm run dev` แล้วกดบันทึก แก้ไข หรือลบ จะกระทบข้อมูลร้านจริงทันที
2. **[U] Preview อาจชี้ไป Production** ถ้าทีมทดสอบ login ใน Preview ด้วยบัญชีจริง ทุก action จะเขียนลง DB จริง
3. Preview **ไม่สามารถทำงานแบบ read-only ได้ด้วยโค้ดปัจจุบัน** [V] เพราะแอปเรียก `insert`/`update`/`delete` จาก client โดยตรง และไม่มี flag ปิดการเขียน

> **คำตอบ Task 7:** ณ ตอนนี้ยังรับประกันไม่ได้ว่า Preview จะไม่เขียนข้อมูลไป Production จนกว่าจะทำตามแผนข้อ 2

---

## 2. สถานะเป้าหมาย (To-Be) — แผนแยก Environment ที่ปลอดภัย

| มิติ | Local | Preview | Production |
|---|---|---|---|
| Supabase project | **`car-care-staging`** (สร้างใหม่) | **`car-care-staging`** | Production project เดิม (ไม่แตะ) |
| ข้อมูล | Synthetic seed data เท่านั้น | Synthetic seed data | ข้อมูลจริง |
| Schema source | Migration files ใน `supabase/migrations/` | เหมือนกัน | Baseline migration ที่สร้างจาก schema dump ของ prod (read-only) |
| Auth users | บัญชีทดสอบ | บัญชีทดสอบ | ผู้ใช้จริง |
| `GEMINI_API_KEY` | key แยก หรือไม่ตั้ง | key แยก หรือไม่ตั้ง | key production |
| Vercel env scope | `.env.local` | Preview scope = staging | Production scope = prod |
| Guard | Env banner บอกชื่อ environment | Build/runtime guard ห้ามใช้ prod project ref | — |
| Deployment protection | — | เปิด Vercel Authentication | — |

### ลำดับการทำ (ทุกข้อต้องได้รับอนุมัติก่อน ดู `approval-checklist.md`)

1. **ยืนยันสถานะ Vercel** (เจ้าของระบบทำ): ดูว่า env vars ของ scope Preview และ Development ชี้ไป Supabase project ไหน (ดูแค่ project ref ในโดเมน URL ไม่ต้องส่ง key)
2. **สร้าง Supabase project `car-care-staging`** (Free plan เพียงพอ) แยก organization หรืออยู่ org เดียวกันก็ได้
3. **Dump schema ของ Production แบบ schema-only** (ไม่มีข้อมูล) ด้วย `supabase db dump --schema-only` หรือ `pg_dump --schema-only` เพื่อใช้เป็น baseline migration เป็นการอ่านอย่างเดียว แต่ต้องใช้ DB password จึงต้องได้รับอนุมัติ
4. **Apply baseline migration ลง staging** แล้วเปิด RLS และ policy ให้ตรงกับ prod (ตรวจจาก SQL ข้อ 1–2 ใน `production-baseline.md`) และเปิด Realtime publication สำหรับ `records`, `expenses`
5. **Seed ข้อมูลสังเคราะห์** (ไม่ copy ข้อมูลจริง เพราะมีชื่อลูกค้าและทะเบียนรถ)
6. **เปลี่ยน Vercel env vars** เฉพาะ scope Preview และ Development ให้ชี้ staging และ **ไม่แตะ scope Production**
7. **เปลี่ยน `.env.local`** บนเครื่อง dev ให้ชี้ staging
8. **เพิ่ม guard ในโค้ด** (ทำใน Step 07 ผ่าน PR): ตรวจ `VERCEL_ENV` ร่วมกับ Supabase project ref ถ้าเป็น preview/development แต่ใช้ prod ref ให้ fail ทันที และแสดง banner บอก environment ที่ไม่ใช่ production
9. **เปิด Deployment Protection** สำหรับ Preview

### Interim rule (ระหว่างที่ยังไม่มี staging)

- ห้ามใช้ Preview deployment หรือ `npm run dev` ทดสอบการบันทึก แก้ไข หรือลบข้อมูล
- ทดสอบ UI ได้เฉพาะ flow ที่อ่านอย่างเดียว หรือใช้ unit test ที่ mock Supabase
- งาน Step 01–06 เป็นงานวิเคราะห์และเอกสาร จึงทำได้โดยไม่ต้องมี staging แต่ **Step 07 ต้องมี staging ก่อน**

---

## 3. Secrets Handling

- ห้าม commit `.env*` (ถูก ignore อยู่แล้ว [V])
- ห้ามใช้ `SUPABASE_SERVICE_ROLE_KEY` ใน client หรือในตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_`
- เอกสารนี้บันทึกเฉพาะ **ชื่อ** ตัวแปรและ project ref เมื่อจำเป็น ไม่บันทึกค่า key
