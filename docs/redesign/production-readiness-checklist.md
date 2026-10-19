# v2.1.0 — Production Readiness Checklist

> Step 10 · 2026-10-19 · ใช้ตัดสินก่อนเข้า Step 11 (controlled production release) · ห้ามติ๊กโดยไม่ได้ตรวจจริง
> ป้ายหลักฐาน: [V] Verified · [I] Inferred · [U] Unknown · สถานะ: ✅ ผ่าน · ❌ ไม่ผ่าน · ⏳ รอ · ⛔ Blocked · N/A
> รายละเอียดผลทดสอบ: `preview-test-results.md` · ภาพรวม RC: `release-candidate-report.md` · Release notes: `release-notes-draft.md`

## 1. ตัวตน release

| รายการ | ค่า | สถานะ |
|---|---|---|
| เวอร์ชัน | `2.1.0` (MINOR) | ✅ |
| Branch | `release/2.1.0` (ตัดจาก `main` `252f081`, รวม `develop` `a40ba8f` แล้ว) | ✅ [V] |
| RC ที่ผ่าน | **rc.4 `20a66eb`** · tag `v2.1.0-rc.4` · rc.1/rc.3 ไม่ผ่าน (D-07, D-11) · rc.2 ถูกแทน (D-09) | ✅ [V] |
| Production ปัจจุบัน | `4162c44` (มี D-07 fix แล้ว · ยังไม่มี D-09/D-10/D-11) | ✅ [V] |
| PR ที่รวม | #41–#48 + `951c3c5` (D-11) · ไม่มี PR ค้าง | ✅ [V] |
| Migration | **ไม่มี** | ✅ [V] |
| วิธีทำงาน | `develop` → `release/*` → `main` (เจ้าของตัดสิน 2026-10-19) | ✅ |

## 2. Quality gates

| Gate | หลักฐาน | สถานะ |
|---|---|---|
| CI ของงานที่รวม | `252f081` 8/8 · PR #47, #48 ผ่าน required checks ก่อน merge | ✅ [V] |
| CI บน release PR (รวม pr-title) | จะรันเมื่อเปิด PR `release/2.1.0` → `main` ใน Step 11 | ⏳ Step 11 |
| Unit (Vitest) | 404/404 บน rc.4 | ✅ [V] |
| E2E Chromium (มือถือ + PC) | 55/55 บน rc.4 | ✅ [V] |
| E2E WebKit (ในเครื่อง) | ปัญหาที่เหลือเป็น D-08 (known issue) และข้อจำกัดของ WebKit (`preview-test-results.md` §3) | ✅ ยอมรับ [V] |
| ไม่มี key ฝั่ง server ใน bundle | ตรวจ `.next/static` + CI step | ✅ [V] |
| npm audit (production) | High 0 / Critical 0 (D-04) | ✅ [V] |
| Preview ใช้ staging ไม่ใช่ production | ทุก request ไป staging ไม่มีไป production (ตรวจทุก test) · ป้าย "ระบบทดสอบ (Preview)" | ✅ [V] |
| CUJ บน Preview + staging | มือถือ 3/3 · PC 6/6 · iPhone 3/3 | ✅ [V] |
| Responsive + console/network + a11y บน Preview | ทุกหน้า 320px, axe WCAG 2.2 + Label in Name, ไม่มี console error ของแอป | ✅ [V] |
| ข้อมูลทดสอบบน staging ถูกลบ | ขั้นเก็บกวาดไม่พบรายการค้าง | ✅ [V] |
| UAT เจ้าของบน Preview | ไม่บังคับ (`preview-test-results.md` §5) · เจ้าของใช้งาน production อยู่และรายงานปัญหา D-09 แล้ว | N/A |

## 3. Database

| รายการ | ผล | สถานะ |
|---|---|---|
| Migration ใหม่ | ไม่มี | ✅ [V] |
| Schema ที่แอปต้องการ | เท่ากับ v2.0.0 · ตาราง/RPC/คอลัมน์ที่แอปเรียกเหมือนเดิมทุกตัว (เทียบ `v2.0.0` กับ rc) | ✅ [V] |
| Production migration ใน Step 10 | ไม่รัน (ไม่มีให้รัน และเป็นข้อห้าม) | ✅ |
| Backup ก่อน release | ไม่จำเป็นต่อ schema · แนะนำ export CSV ตามรอบปกติ | ⏳ เจ้าของ (ไม่บังคับ) |

## 4. Rollback plan

| รายการ | ค่า |
|---|---|
| App | Vercel → Deployments → เลือก deployment → **Instant Rollback** · ย้อนเฉพาะ release นี้: **`4162c44`** (2026-10-19 20:12) · ย้อน Step 09: `ea41d14` (2026-10-18 22:06) · ย้อนทั้งหมด: `99b7311` v2.0.0 (2026-10-18 19:04) |
| DB | ไม่ต้องย้อน (ไม่มี migration) · ข้อมูลรูปแบบเดิม ทุกเวอร์ชันข้างบนอ่านได้ [I] |
| สิ่งที่ rollback **ทำไม่ได้** | ไม่ย้อนข้อมูลที่บันทึก/แก้/ลบระหว่างนั้น (Vercel ย้อนแค่โค้ด) · ไม่ย้อนการตั้งค่า env ใน Vercel |
| ผลที่ผู้ใช้เห็นหลังย้อนไป `4162c44` | กลับมามีช่องว่างวันที่ไม่มีหนี้ (D-09), อากาศ 0° (D-10), กราฟโหลดไม่ได้แล้วหน้าพัง (D-11) · อย่างอื่นเท่าเดิม · session ยังใช้ได้ [I] |
| เงื่อนไขที่ควร rollback | login ไม่ได้ · บันทึก/แก้/ลบไม่ได้ · ยอดเงินหน้าภาพรวมหรือค้างชำระผิด · หน้าใดหน้าหนึ่งขึ้น error ทุกครั้ง |
| เวลาที่ใช้ | ~1 นาที (ไม่ต้อง build) [I] · ยังไม่เคยทดลองกับโปรเจกต์นี้ [U] |
| ผู้ทำ | เจ้าของ (มีสิทธิ์ Vercel) |
| deployment ที่จะย้อนไปยังอยู่ | ⏳ เจ้าของเปิดดูหน้า Deployments ก่อน release [U] |

## 5. Go / No-Go สำหรับ Step 11

| ข้อ | สถานะ |
|---|---|
| ไม่มี defect Critical/High ค้าง | ✅ (D-07 แก้บน production แล้ว) |
| วิธีทำงานตัดสินแล้ว | ✅ |
| Unit + E2E ผ่านบน RC ล่าสุด | ✅ |
| Preview ใช้ staging และผ่าน CUJ | ✅ |
| Release notes + rollback plan พร้อม | ✅ |
| Known issues ยอมรับได้ (D-08, iPhone keyboard, LCP ประวัติ/ค้างชำระ) | ⏳ เจ้าของยืนยัน |
| ค้น Vercel logs หา `password=` (D-07) | ⏳ เจ้าของ |
| **อนุมัติ Step 11** | ⏳ |

**ผล: Go** เมื่อเจ้าของอนุมัติ Step 11
