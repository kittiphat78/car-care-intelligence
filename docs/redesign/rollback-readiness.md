# Rollback Readiness — Step 00

> วันที่: 2026-10-14 · ป้ายกำกับ: **[V]** Verified · **[I]** Inferred · **[U]** Unknown

## 1. Stable Baseline ที่เสนอ

| รายการ | ค่า |
|---|---|
| Baseline candidate | `main` @ `7f58eec` (= tag `v1.0.0`, มีอยู่แล้วทั้ง local และ origin) [V] |
| เงื่อนไขก่อนยอมรับเป็น baseline | เจ้าของยืนยันใน Vercel ว่า **Current Production Deployment** สร้างจาก commit `7f58eec` |
| ถ้าตรงกัน | ใช้ `v1.0.0` เป็น baseline ได้เลย **ไม่ต้องสร้าง tag ใหม่** (อาจเพิ่ม tag `prod-baseline-2026-10` เป็น alias ถ้าต้องการ แต่ต้องได้รับอนุมัติ) |
| ถ้าไม่ตรงกัน | บันทึก SHA จริง แล้วตรวจ diff ระหว่าง SHA นั้นกับ `main` ก่อนกำหนด baseline ใหม่ **ห้ามสร้าง tag ก่อนยืนยัน** |

**ยังไม่ได้สร้าง tag ใด ๆ ใน Step 00**

---

## 2. Application Rollback

| วิธี | ใช้เมื่อ | ข้อจำกัด |
|---|---|---|
| **Vercel Instant Rollback** (promote deployment ก่อนหน้า) | Release ใหม่พังและ **ไม่มี** schema change | ไม่ย้อน DB, Auth, Storage หรือ env vars [V] Hobby plan อาจ rollback ได้แค่ deployment ก่อนหน้าเท่านั้น [I] ต้องตรวจ plan [U] หลัง rollback Vercel อาจหยุด auto-assign production domain จนกว่าจะ promote ใหม่ [I] |
| **`git revert` บน main แล้วให้ Vercel deploy ใหม่** | ต้องการให้ Git history สะท้อนสิ่งที่รันจริง | ใช้เวลา build (~1–2 นาที) และต้องไม่มี CI ที่ block |
| **Redeploy tag เดิม** | Deployment เก่าถูกลบไปแล้ว | ต้องแน่ใจว่า env vars ปัจจุบันยังเข้ากับโค้ดเก่า |

### ข้อควรระวังเฉพาะระบบนี้

- **Client ค้าง bundle เก่า:** อุปกรณ์แบบ kiosk หรือ tablet ที่เปิดแอปค้างไว้ จะยังรัน JS เก่าจนกว่าจะ reload แม้ rollback แล้ว (และในทางกลับกันหลัง deploy ใหม่) [I] ดังนั้นโค้ดทั้งเก่าและใหม่ต้องทำงานกับ schema เดียวกันได้ในช่วงเปลี่ยนผ่าน
- **ไม่มี service worker** [V] จึงไม่มี cache ของ SW ที่ต้องล้าง
- **`localStorage`** (theme, recent customers, เลขบิล) ไม่ถูก rollback และต้องคง key และรูปแบบข้อมูลให้ backward compatible

---

## 3. Database Rollback

> **Vercel Rollback ไม่ย้อน Database หรือ Storage ให้** การย้อน DB ต้องทำแยกเสมอ

### 3.1 ความพร้อมปัจจุบัน

| รายการ | สถานะ |
|---|---|
| Migration files | ไม่มี [V] จึงย้อนแบบ migration down ไม่ได้ |
| Supabase plan / daily backups | [U] Free plan น่าจะไม่มี backup ที่ restore ผ่าน dashboard ได้ [I] ส่วน Pro มี daily backup |
| Point-in-Time Recovery | [U] เป็น add-on แบบเสียเงิน |
| Manual dump ล่าสุด | ไม่มีหลักฐาน [U] |
| Soft delete / audit log | ไม่มี [V] ข้อมูลที่ถูกลบผ่านแอปจึงกู้ได้จาก backup เท่านั้น |

**สรุป: ความพร้อม rollback ฝั่ง DB ณ ตอนนี้ = ต่ำ หรือไม่ทราบ** ดังนั้นห้ามทำ schema change ใด ๆ บน Production จนกว่าจะมีอย่างน้อยข้อ 3.2 (1)–(3)

### 3.2 Strategy ที่เสนอ (ใช้ตั้งแต่ Step 06 เป็นต้นไป)

1. **Backup ก่อนทุก release ที่แตะ DB:** `pg_dump` แบบ data + schema ของ `public` และเก็บนอก Supabase (ต้องอนุมัติทุกครั้งเพราะเข้าถึงข้อมูลจริง) และทดลอง restore ลง staging อย่างน้อย 1 ครั้งเพื่อพิสูจน์ว่าใช้ได้จริง
2. **Expand → Migrate → Contract:**
   - Release N: เพิ่ม column หรือ table ใหม่ (nullable หรือมี default) โดยโค้ดเก่ายังทำงานได้
   - Release N+1: โค้ดใหม่ใช้โครงสร้างใหม่ และ backfill
   - Release N+2 (หลังยืนยันว่า client เก่าหมดแล้ว): ลบโครงสร้างเก่า ซึ่งเป็นขั้นที่ทำลายข้อมูล จึงต้องอนุมัติแยกพร้อม backup
3. **ทุก migration ต้องมี down script หรือ forward-fix plan** ที่เขียนไว้ก่อน apply และทดสอบบน staging แล้ว
4. **ห้าม migration แบบทำลายข้อมูล** (`DROP`, `ALTER TYPE` ที่ cast ข้อมูล, `DELETE`/`UPDATE` แบบ bulk) ใน release เดียวกับโค้ดที่เปลี่ยนพฤติกรรม
5. **RLS changes** ต้องทดสอบบน staging ด้วยบัญชี `anon` และ `authenticated` ก่อนใช้กับ prod เพราะ policy ผิดอาจทำให้ผู้ใช้จริงล็อกเอาท์หรือเห็นข้อมูลว่าง

### 3.3 ลำดับการตัดสินใจเมื่อ Release มีปัญหา

```
พบปัญหาหลัง release
 ├─ Release นั้นมี DB change หรือไม่?
 │   ├─ ไม่มี → Vercel Instant Rollback → ตรวจ → git revert ตามหลัง
 │   └─ มี (expand-only) → Vercel Rollback ได้ (schema ใหม่ยังเข้ากับโค้ดเก่า)
 │                         → เก็บ column ใหม่ไว้ แล้วค่อยแก้แบบ forward
 │   └─ มี (contract/destructive) → หยุด → ประเมินข้อมูลที่เสีย → restore จาก backup ลง staging
 │                                  → เทียบข้อมูล → ขออนุมัติ restore prod
 └─ ข้อมูลผู้ใช้เสียหายหรือไม่? → แจ้งเจ้าของทันที, freeze การเขียน (ถ้าจำเป็น), บันทึก incident
```

---

## 4. Rollback Readiness Checklist (ต้องผ่านก่อน Step 07)

- [ ] ยืนยัน production commit SHA แล้ว
- [ ] รู้ Vercel plan และขอบเขต Instant Rollback
- [ ] รู้ Supabase plan และนโยบาย backup
- [ ] มี manual dump ของ prod อย่างน้อย 1 ชุด และทดลอง restore ลง staging สำเร็จ
- [ ] มี staging project และ env scopes แยกแล้ว
- [ ] มี baseline migration (schema-only) ใน repo
- [ ] มี CI ที่ block merge เมื่อ lint, type, test หรือ build ไม่ผ่าน
