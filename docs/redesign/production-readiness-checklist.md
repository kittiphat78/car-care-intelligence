# v2.1.0 — Production Readiness Checklist

> Step 10 · 2026-10-19 · ใช้ตัดสินก่อนเข้า Step 11 (controlled production release) · ห้ามติ๊กโดยไม่ได้ตรวจจริง
> ป้ายหลักฐาน: [V] Verified · [I] Inferred · [U] Unknown · สถานะ: ✅ ผ่าน · ❌ ไม่ผ่าน · ⏳ รอ · ⛔ Blocked · N/A
> รายละเอียดผลทดสอบ: `preview-test-results.md` · ภาพรวม RC: `release-candidate-report.md` · Release notes: `release-notes-draft.md`

## 1. ตัวตน release

| รายการ | ค่า | สถานะ |
|---|---|---|
| เวอร์ชัน | `2.1.0` (MINOR: พฤติกรรมออกจากระบบเปลี่ยน + แก้บั๊ก/ประสิทธิภาพ/ความปลอดภัย) | ✅ |
| Branch | `release/2.1.0` จาก `main` `252f081` (CI เขียว 8/8) | ✅ [V] |
| RC | rc.1 `ad86e1e` → **ไม่ผ่าน** (D-07) · **rc.2 `8e7d036`** (hotfix D-07) · Preview build สำเร็จ | ✅ build / ⛔ ทดสอบ |
| สถานะ production ปัจจุบัน | **`252f081` (มี D-07)** เพราะ `main` deploy อัตโนมัติ (S10-01) | ⚠ ต้อง merge hotfix |
| PR ที่รวม | #41–#46 (ไม่มี PR ค้าง review) | ✅ [V] |
| Migration | **ไม่มี** (diff `v2.0.0..release/2.1.0 -- supabase/migrations` ว่าง) | ✅ [V] |

## 2. Quality gates

| Gate | หลักฐาน | สถานะ |
|---|---|---|
| CI บน `main` (lint, typecheck, test, build, audit, secrets, db, e2e) | run ของ `252f081` ผ่าน 8/8 | ✅ [V] |
| CI บน release PR (รวม pr-title) | รอเปิด PR `release/2.1.0` → `main` ใน Step 11 | ⏳ |
| Unit (Vitest) | ดู `preview-test-results.md` §2 | ดู §2 |
| E2E Chromium (มือถือ + PC) บน Supabase ในเครื่อง | ดู `preview-test-results.md` §2 | ดู §2 |
| E2E WebKit (Safari engine) | ดู `preview-test-results.md` §3 | ดู §3 |
| ไม่มี key ฝั่ง server ใน bundle | CI e2e step + ตรวจในเครื่อง | ✅ [V] |
| npm audit (production) | High 0 / Critical 0 (D-04) | ✅ [V] |
| Preview ใช้ staging ไม่ใช่ production | ⛔ เปิด Preview ไม่ได้ (Vercel Authentication) · env guard: build Preview ที่ชี้ฐานข้อมูล production จะ build ไม่ผ่าน (A3, ตั้ง `PRODUCTION_SUPABASE_PROJECT_REF` แล้วใน Step 07) และ Preview build ของ rc.1 สำเร็จ → ไม่ได้ชี้ production [I] | ⛔ / [I] |
| CUJ-1…8 บน Preview + staging | ⛔ รอสิทธิ์เข้าถึง Preview | ⛔ |
| Responsive + console/network บน Preview | ⛔ รอสิทธิ์เข้าถึง Preview | ⛔ |
| UAT โดยเจ้าของบน Preview | ⏳ รายการใน `preview-test-results.md` §5 | ⏳ |

## 3. Database

| รายการ | ผล | สถานะ |
|---|---|---|
| Migration ใหม่ใน release | ไม่มี | ✅ [V] |
| Schema ที่แอปต้องการ | เท่ากับ v2.0.0 (M001–M009 ขึ้น production แล้วใน v1.2.0, Step 07) · แอปไม่เรียกตาราง/ฟังก์ชัน/คอลัมน์ใหม่ (ตรวจ diff ของ `features/*/api.ts`, `lib/` ระหว่าง v2.0.0..rc) | ✅ [V] diff · production schema [V Step 07] |
| Production migration ใน Step 10 | ไม่รัน (ข้อห้ามของ Step 10 และไม่มีให้รัน) | ✅ |
| Backup ก่อน release | ไม่จำเป็นต่อ schema (ไม่มี migration) · แนะนำให้เจ้าของ export CSV ตามรอบปกติก่อน Step 11 | ⏳ เจ้าของ |

## 4. Rollback plan (กรอกก่อน release)

| รายการ | ค่า |
|---|---|
| App | Vercel → Deployments → เลือก deployment production → **Instant Rollback** · ถอยเฉพาะ Step 09: `ea41d14` (2026-10-18 22:06) · ถอยทั้งหมด: `v2.0.0` `99b7311` (2026-10-18 19:04) |
| DB | ไม่ต้องย้อน (ไม่มี migration) · ข้อมูลที่บันทึกระหว่างใช้ v2.1.0 อยู่ครบและ v2.0.0 อ่านได้ (รูปแบบข้อมูลเดียวกัน) [I] |
| สิ่งที่ rollback **ทำไม่ได้** | ไม่ย้อนข้อมูลที่บันทึก/แก้/ลบระหว่างนั้น (Vercel rollback ย้อนแค่โค้ด) · ไม่ย้อนการตั้งค่า env ใน Vercel |
| ผลที่ผู้ใช้เห็นหลัง rollback | ออกจากระบบกลับเป็นแบบทุกเครื่อง · ปัญหาที่ v2.1.0 แก้กลับมา (Enter บันทึกทันที, หน้าภาพรวมกระโดด, ข้อความบันทึกล้มอยู่นอกจอ) · session ที่ login ไว้ยังใช้ได้ (cookie รูปแบบเดิม) [I] |
| เงื่อนไขที่ควร rollback | login ไม่ได้ · บันทึก/แก้/ลบรายการไม่ได้ · ยอดเงินหน้าภาพรวมหรือค้างชำระผิดจาก v2.0.0 · หน้าใดหน้าหนึ่งขึ้น error ทุกครั้ง |
| เวลาที่ใช้ | ~1 นาที (Vercel instant rollback ไม่ต้อง build) [I จากเอกสาร Vercel] · ยังไม่ได้ทดลองกับโปรเจกต์นี้ [U] |
| ผู้ทำ | เจ้าของ (มีสิทธิ์ Vercel) |
| ยืนยันว่า deployment v2.0.0 ยังอยู่ให้ rollback | ⏳ เจ้าของเปิดดูในหน้า Deployments (Hobby เก็บ deployment ไว้) [U] |

## 5. Go / No-Go สำหรับ Step 11

| ข้อ | สถานะ |
|---|---|
| ไม่มี defect Critical/High ค้าง | ❌ D-07 (High) แก้แล้วบน branch แต่ production ยังมี จนกว่าจะ merge hotfix |
| วิธีทำงาน (S10-01) ตัดสินแล้ว | ⏳ |
| Unit + E2E ผ่านบน RC ล่าสุด | ดู `preview-test-results.md` |
| Preview ใช้ staging และผ่าน CUJ | ⛔ รอสิทธิ์เข้าถึง Preview |
| UAT เจ้าของผ่าน | ⏳ |
| Release notes + rollback plan พร้อม | ✅ (`release-notes-draft.md`, §4) |
| อนุมัติ Step 11 | ⏳ |
