# Pull Request Template — Step 06

> เนื้อหาใน §2 คือไฟล์ที่จะวางเป็น `.github/pull_request_template.md` ใน R0 (ยังไม่สร้างใน Step นี้)
> หลัก: PR ต้องบอก **อะไรเปลี่ยน, ทำไม, ทดสอบอะไรจริง, กระทบ production และ DB อย่างไร, rollback อย่างไร**

## 1. กติกาการใช้

| เรื่อง | กติกา |
|---|---|
| Title | ตาม `commit-conventions.md` เพราะใช้เป็น squash commit |
| ขนาด | ≤ ~400 บรรทัดที่เปลี่ยน (ไม่นับ lockfile, generated types, snapshot) และถ้าใหญ่กว่าให้แยก PR |
| Draft | เปิดเป็น draft จนกว่าจะพร้อม review |
| หลักฐาน | ช่องที่ติ๊ก ✅ ต้องมีหลักฐาน (log, screenshot, ลิงก์ Preview) และถ้าไม่ได้ทำ ให้เขียน `NOT RUN` + เหตุผล |
| DB | PR ที่มี `supabase/**` ต้องกรอก §Database ครบ |

## 2. Template

```markdown
## สรุป
<!-- เปลี่ยนอะไร 1–3 บรรทัด -->

## ทำไม
<!-- ปัญหา/requirement ที่แก้ และอ้าง ID: ER-xx, FR-xx, AC-xx, ADR-xx, M0xx, S0x-xx -->
Refs:

## ประเภท
- [ ] feat  - [ ] fix  - [ ] db  - [ ] refactor  - [ ] style/ui  - [ ] test  - [ ] docs  - [ ] build/ci/chore
- [ ] **Breaking change** (อธิบาย):

## การเปลี่ยนแปลงหลัก
-

## ภาพหน้าจอ / Preview (ถ้าเปลี่ยน UI)
| ก่อน | หลัง |
|---|---|
|  |  |
Preview URL:
ตรวจที่ viewport: [ ] 360  [ ] 768  [ ] 1440 · Theme: [ ] มืด  [ ] สว่าง

## การทดสอบ (ผลจริง)
| Check | ผล | หลักฐาน |
|---|---|---|
| `npm run lint` | PASS / FAIL / NOT RUN | |
| `npm run type-check` | | |
| `npm run test` | | จำนวน test |
| `npm run build` | | |
| CI | | ลิงก์ run |
| Manual (CUJ ที่กระทบ) | | CUJ-x |
| a11y (axe / keyboard) | | |

## Database (ถ้ามี `supabase/**`)
- [ ] Migration เป็น expand-only และเข้ากันได้กับ client ที่ deploy อยู่ (ระบุเวอร์ชัน): 
- [ ] มีไฟล์ down ใน `supabase/rollback/` และทดสอบ down บน staging แล้ว
- [ ] Apply บน staging แล้ว และ verification SQL ผ่าน (แนบผล)
- [ ] RLS tests (`supabase/tests`) ผ่าน
- [ ] ไม่แก้หรือลบข้อมูลผู้ใช้ (ถ้าแก้ ระบุ + การอนุมัติ)
- ลำดับ deploy: [ ] DB ก่อน app  [ ] app ก่อน DB  [ ] พร้อมกันไม่ได้/ไม่จำเป็น

## Security / Privacy
- [ ] ไม่มี secret, service role key หรือข้อมูลลูกค้าจริงใน diff, log หรือ screenshot
- [ ] Authorization บังคับที่ DB (ไม่ใช่ UI อย่างเดียว)
- [ ] ไม่มี `dangerouslySetInnerHTML` กับข้อมูลผู้ใช้
- [ ] เพิ่ม dependency? [ ] ไม่  [ ] ใช่ (ชื่อ + เหตุผล + ขนาด + license):

## ผลกระทบต่อ Production
<!-- ผู้ใช้จะเห็นอะไรเปลี่ยน / ข้อมูลกระทบไหม / ต้องสื่อสารอะไร -->

## Rollback
<!-- app: Vercel instant rollback / revert PR · DB: down script หรือ forward-fix · ข้อจำกัด -->

## Checklist ผู้เขียน
- [ ] Self-review diff ทั้งหมดแล้ว
- [ ] Test ที่ reproduce บั๊ก (ถ้าเป็น fix)
- [ ] อัปเดตเอกสารที่เกี่ยวข้อง (docs/redesign, README, runbook)
- [ ] Issue log ของ step ที่เกี่ยวข้องอัปเดตแล้ว
```

## 3. Template เฉพาะ Release PR (`release/*` → `main`)
ใช้ `release-checklist.md` เป็น body ของ PR แทน
