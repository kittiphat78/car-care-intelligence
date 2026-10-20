# Rollback Plan

> Step 12 · 2026-10-20 · ป้าย: **[V]** Verified · **[I]** Inferred · **[U]** Unknown
> รายละเอียดเดิม: `migration-and-rollback.md` (Step 06), `rollback-readiness.md` (Step 00) · deploy: `deployment-guide.md`
> **Vercel Rollback ย้อนได้แค่โค้ดแอป ไม่ย้อนฐานข้อมูล ข้อมูลที่บันทึก/แก้/ลบ ตัวแปร environment หรือสิ่งที่เก็บในเครื่องผู้ใช้**
> ยังไม่เคยทดลอง Instant Rollback กับ project นี้จริง [U] · เวลาที่ประมาณไว้มาจากเอกสารของ Vercel ไม่ใช่การวัด

## 1. ตัดสินใจ

```
พบปัญหาหลัง deploy
 ├─ ข้อมูลเสียหาย หรือมีคนเห็นข้อมูลที่ไม่ควรเห็น?
 │    └─ ใช่ → rollback แอปทันที (§3) + แจ้งเจ้าของ + บันทึก incident + ประเมินข้อมูล (§5)
 ├─ ใช้งานหลักไม่ได้ (login, บันทึก, แก้, ลบ, เคลียร์ยอด) หรือยอดเงินผิด หรือหน้าใดขึ้น error ทุกครั้ง?
 │    └─ ใช่ → rollback แอป (§3)
 ├─ release นั้นมี migration?
 │    ├─ expand-only (ทุก migration ที่ผ่านมา) → rollback แอปได้เลย schema ใหม่ยังใช้กับแอปเก่าได้ · DB ไม่ต้องย้อน
 │    └─ contract/ทำลายข้อมูล → หยุด · อย่า rollback DB เอง · ประเมินกับเจ้าของ (§5)
 └─ ปัญหาเล็ก (error ครั้งเดียว, ข้อความ known) → จดไว้ แก้ใน release ถัดไป
```

เกณฑ์ละเอียด: `monitoring-report.md` §3

## 2. เป้าหมาย rollback ปัจจุบัน

| ย้อนไป (deployment ของ commit) | ได้อะไร | DB ใช้ได้ไหม |
|---|---|---|
| `e63d175` (2026-10-19 22:07) | โค้ดเดียวกับ v2.1.0 แต่ป้ายเป็น `v2.1.0-rc.4` | ✅ |
| `4162c44` (2026-10-19 20:12) | ก่อน v2.1.0: ไม่มี D-09, D-10, D-11 · มี D-07 fix | ✅ |
| `ea41d14` (2026-10-18 22:06) | ก่อน Step 09: ไม่มี D-07 (ปลอดภัย เพราะ D-07 มาจาก Step 09) และไม่มี D-09/D-11 | ✅ |
| `99b7311` = `v2.0.0` (2026-10-18 19:04) | หน้าตาใหม่รุ่นแรก · ออกจากระบบแบบทุกเครื่อง · มีช่องโหว่ dependency ที่ D-04 แก้ | ✅ (ไม่มี migration หลัง v1.2.0) |
| `b5213db` = `v1.2.0` | UI เดิม (v1) บน schema ใหม่ | ✅ ตามที่ออกแบบ (expand-only) [I] |

**production ปัจจุบัน:** `8465548` = `v2.1.0` (deployment `7178871333`) [V]

## 3. Rollback แอป (Vercel Instant Rollback)

ผู้ทำ: เจ้าของ (มีสิทธิ์ Vercel)

1. Vercel → Project `car-care-intelligence-53wd` → **Deployments**
2. หา deployment ของ commit เป้าหมาย (§2) ที่มีป้าย Production เดิม · ดู commit SHA ให้ตรง
3. เมนู `⋯` → **Instant Rollback** → ยืนยัน · production URL ชี้ deployment นั้นภายในไม่กี่วินาที (ไม่ต้อง build) [I]
4. ตรวจ: `curl -s https://car-care-intelligence-53wd.vercel.app/login | grep -o 'v[0-9.]*[-a-z0-9.]*'` ได้เลขเวอร์ชันเก่า · ตรวจ smoke อ่านอย่างเดียว (`deployment-guide.md` §4)
5. บอกคนในร้านให้ปิดเปิดแอปหรือ reload (ไม่มี service worker reload แล้วได้เวอร์ชันที่ deploy อยู่) [V]

**หลัง rollback:**
- Vercel จะไม่ย้ายโดเมน production ไปยัง deployment ใหม่จาก `main` อัตโนมัติจนกว่าจะ "Undo Rollback" หรือ promote [I ตามเอกสาร Vercel · ตรวจหน้าจอจริงตอนทำ] · การ merge เข้า `main` ระหว่างนี้จึงอาจไม่ขึ้น production
- ทำให้ `main` ตรงกับสิ่งที่รันอยู่: PR `revert: …` (จาก `hotfix/*` → `main`) แทนการ force push · หรือแก้ไปข้างหน้าด้วย hotfix แล้ว promote
- **อย่าลบ tag** ของ release ที่ถูก rollback · บันทึก "rolled back" ใน release record
- บันทึก incident ใน `docs/incidents/YYYY-MM-DD-<เรื่อง>.md` (ดูแม่แบบ `docs/incidents/2026-10-14-summary.md` และ `incident-report.md`)

## 4. สิ่งที่ rollback ไม่ย้อน

| สิ่ง | ผล | ทำอะไร |
|---|---|---|
| ข้อมูลที่บันทึก/แก้/ลบระหว่างที่เวอร์ชันใหม่รันอยู่ | อยู่ต่อตามเดิม | ถ้าเวอร์ชันใหม่เขียนข้อมูลผิด ต้องหาแถวที่ผิด (`updated_at`, `created_at` ช่วงนั้น) แล้วให้เจ้าของตัดสินรายแถว |
| Schema / function / policy | อยู่ต่อ | §5 |
| ตัวแปร environment ใน Vercel | ไม่ย้อน | ตั้งกลับเองด้วยมือ |
| localStorage / sessionStorage ในเครื่องผู้ใช้ | อยู่ต่อ | key เดิมใช้ได้ทุกเวอร์ชัน (ห้ามเปลี่ยนชื่อ key) |
| Session ที่ login อยู่ | ยังใช้ได้ | — |
| พฤติกรรมออกจากระบบ | ย้อนไปก่อน `ea41d14` = ออกทุกเครื่องอีกครั้ง | แจ้งผู้ใช้ |

## 5. Rollback ฐานข้อมูล

เลือกข้อแรกที่ใช้ได้ (`migration-and-rollback.md` §4):

| # | วิธี | ใช้เมื่อ | ความเสี่ยงต่อข้อมูล | อนุมัติ |
|---|---|---|---|---|
| D1 | ไม่ย้อน DB · rollback แอปอย่างเดียว | migration แบบ expand (ทุกตัวที่มี) | ไม่มี | — |
| D2 | Forward-fix: migration ใหม่แก้ function/policy | logic ใน DB ผิด | ไม่มี | เจ้าของ |
| D3 | Down script `supabase/rollback/<ไฟล์>.down.sql` ใน SQL Editor ของ production | object ใหม่ก่อปัญหา และ down ไม่ลบข้อมูลผู้ใช้ | ต่ำ | เจ้าของ + ทดสอบบน staging ก่อน |
| D4 | กู้จาก backup (CSV ตาม `restore_drill.sql`) ไปตารางแยก แล้วคัดแถวที่ต้องการกลับ | ข้อมูลเสียหาย | **สูง:** ข้อมูลหลังเวลา backup หาย | เจ้าของ · export ข้อมูลปัจจุบันก่อน |

กฎ: ห้ามปิด RLS เป็นการแก้ปัญหา · ห้าม `drop table`/`truncate` · ห้ามแก้ข้อมูลผู้ใช้ใน SQL Editor ระหว่างเหตุฉุกเฉินโดยไม่ได้อนุมัติรายแถว · down ของ M002 คืน policy เดิม ไม่ใช่ปิด RLS

## 6. ฉุกเฉิน (ร้านใช้งานไม่ได้)

1. ประเมิน 5 นาที: ทำอะไรไม่ได้? ข้อมูลผิดหรือหาย? (Vercel Logs 30 นาทีล่าสุด, Supabase logs)
2. หยุดความเสียหาย: rollback แอป (§3)
3. ถ้ายังไม่หายและเกี่ยวกับ DB: D2/D3 ด้วยการอนุมัติของเจ้าของ
4. ระหว่างระบบล่มนาน: คนในร้านจดลงกระดาษ แล้วบันทึกเข้าระบบภายหลัง
5. หลังเหตุการณ์: incident note + test ที่กันซ้ำ + แก้ใน release ถัดไป

## 7. ความพร้อม

| เรื่อง | สถานะ |
|---|---|
| Deployment เป้าหมายยังอยู่ใน Vercel | [U] เจ้าของตรวจหน้า Deployments ก่อน release (Vercel เก็บ deployment เก่าตามนโยบายของ plan) |
| เคยทดลอง Instant Rollback | ไม่เคย [U] · แนะนำซ้อม 1 ครั้งนอกเวลาทำการ (rollback ไป `e63d175` ซึ่งเป็นโค้ดเดียวกัน แล้ว undo) |
| Down script ทุกไฟล์ | ทดสอบใน CI ทุก PR (job `db`) [V] |
| Backup ข้อมูล + ทดลองกู้ | CSV 2026-10-15 + restore drill บน staging ผ่าน [V] · ไม่มี backup ใหม่ตั้งแต่นั้น (ไม่มี migration) |
| Backup อัตโนมัติของ Supabase | [U] |
