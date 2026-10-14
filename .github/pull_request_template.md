## สรุป
<!-- เปลี่ยนอะไร 1–3 บรรทัด -->

## ทำไม
<!-- ปัญหา/requirement ที่แก้ อ้าง ID: ER-xx, FR-xx, AC-xx, ADR-xx, M0xx -->
Refs:

## ประเภท
- [ ] feat  - [ ] fix  - [ ] db  - [ ] refactor  - [ ] style/ui  - [ ] test  - [ ] docs  - [ ] build/ci/chore
- [ ] **Breaking change** (อธิบาย):

## การเปลี่ยนแปลงหลัก
-

## ภาพหน้าจอ / Preview (ถ้าเปลี่ยน UI)
Preview URL:
ตรวจที่ viewport: [ ] 360  [ ] 768  [ ] 1440 · Theme: [ ] มืด  [ ] สว่าง

> ⚠ Preview ใช้ Supabase **production** จนกว่าจะแยก staging: ห้ามบันทึก แก้ไข หรือลบข้อมูลบน Preview

## การทดสอบ (ผลจริง — ที่ไม่ได้รันให้เขียน NOT RUN + เหตุผล)
| Check | ผล | หลักฐาน |
|---|---|---|
| `npm run lint` | | |
| `npm run type-check` | | |
| `npm run test` | | จำนวน test |
| `npm run build` | | |
| CI | | ลิงก์ run |
| Manual (CUJ ที่กระทบ) | | |

## Database (ถ้ามี `supabase/**`)
- [ ] Expand-only และเข้ากันได้กับ client ที่ deploy อยู่
- [ ] มี down script และทดสอบบน staging แล้ว
- [ ] ไม่แก้หรือลบข้อมูลผู้ใช้
- ลำดับ deploy: [ ] DB ก่อน app  [ ] app ก่อน DB  [ ] ไม่เกี่ยว

## Security / Privacy
- [ ] ไม่มี secret, service role key หรือข้อมูลลูกค้าจริงใน diff, log หรือ screenshot
- [ ] Authorization บังคับที่ DB (ไม่ใช่ UI อย่างเดียว)
- [ ] เพิ่ม dependency? [ ] ไม่  [ ] ใช่ (ชื่อ + เหตุผล):

## ผลกระทบต่อ Production
<!-- ผู้ใช้จะเห็นอะไรเปลี่ยน / ข้อมูลกระทบไหม -->

## Rollback
<!-- app: Vercel Instant Rollback / revert PR · DB: down script หรือ forward-fix -->

## Checklist
- [ ] Self-review diff ทั้งหมดแล้ว
- [ ] Test ที่ reproduce บั๊ก (ถ้าเป็น fix)
- [ ] อัปเดตเอกสารที่เกี่ยวข้อง
