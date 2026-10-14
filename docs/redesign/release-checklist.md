# Release Checklist — Step 06

> วันที่: 2026-10-14 · ใช้เป็น body ของ PR `release/x.y.z` → `main` ทุกครั้ง
> ทุกข้อต้องมีหลักฐาน หรือเขียน `NOT RUN` / `N/A` พร้อมเหตุผล และห้ามติ๊กโดยไม่ได้ตรวจจริง

## 1. Versioning (SemVer)

| ประเภท | เมื่อ | ตัวอย่างในแผน |
|---|---|---|
| PATCH | แก้บั๊กที่ไม่เปลี่ยน contract หรือ security patch | `v1.0.1` (Next 16.4 + ER-01) |
| MINOR | ฟีเจอร์หรือพฤติกรรมใหม่ที่เข้ากันได้ หรือ DB expand | `v1.1.0` (R0), `v1.2.0` (R1) |
| MAJOR | redesign ทั้งระบบ / contract ที่ทำให้ client เก่าใช้ไม่ได้ | `v2.0.0` |
| Pre-release | release candidate บน Preview | `v2.0.0-rc.1`, `-rc.2` |

**กฎของ tag:**
- annotated tag (`git tag -a vX.Y.Z <sha> -m "<release notes summary>"`) **บน commit ที่ Vercel production deploy อยู่จริง** (ตรวจ SHA จากหน้า deployment ก่อน tag)
- ห้ามย้าย, ลบ หรือสร้าง tag ย้อนหลังให้ประวัติดูดี (เช่น ไม่สร้าง `v0.5.0`)
- ถ้า tag ผิด commit: ไม่แก้ tag แต่ออก PATCH ใหม่และบันทึกความผิดพลาดใน release notes
- `v1.0.0` คือ baseline **หลังยืนยัน A1** และถ้า production ไม่ใช่ `7f58eec` ให้บันทึก baseline จริงเป็นเอกสารแทน (ไม่ย้าย `v1.0.0`)

## 2. Checklist

### A. ก่อนเปิด Release PR
- [ ] Branch `release/x.y.z` จาก `main` (Phase A) หรือ `develop` (Phase B) ที่ CI เขียว
- [ ] `package.json` version = `x.y.z` (หรือ `x.y.z-rc.n`)
- [ ] Release notes (§3) ร่างแล้ว
- [ ] รายการ PR ที่อยู่ใน release ครบ และไม่มี PR ที่ยังไม่ผ่าน review
- [ ] Migration ใน release: ______ (หรือไม่มี)

### B. Quality gates (หลักฐานจาก CI run ล่าสุด)
- [ ] lint · type-check · test · build · audit · secrets · pr-title
- [ ] db job (ถ้ามี migration): migrations + tests + down/up
- [ ] Vercel Preview ของ release branch: URL ______ และป้าย env = staging
- [ ] Regression CUJ-1..CUJ-8 บน Preview + staging (ผลรายข้อ)
- [ ] ตัวเลขเทียบ v ก่อนหน้าด้วยข้อมูลชุดเดียวกัน: ยอดวันนี้ / เดือน / หนี้ / Excel ตรงกัน ยกเว้นที่ตั้งใจแก้ (ระบุ ER)
- [ ] a11y (axe) และ responsive matrix (Phase B)
- [ ] UAT โดยเจ้าของ (Phase B / RC)

### C. Database (ถ้ามี)
- [ ] G1–G8 (`database-migration-plan.md` §5) ครบ
- [ ] Backup ล่าสุดเวลา ______ และ restore test ล่าสุด ______
- [ ] Dry-run production (`db push --dry-run`) แนบผล
- [ ] ลำดับ deploy (`migration-and-rollback.md` §2): ______

### D. Release
- [ ] ช่วงเวลา deploy นอกเวลาทำการ (Q-19): ______
- [ ] ผู้อนุมัติ (Q-20): ______ เวลา ______
- [ ] Apply DB migration production ผ่าน workflow (ถ้ามี) และ verification SQL ผ่าน
- [ ] Merge release PR → `main` (merge commit)
- [ ] Vercel production deployment สำเร็จ · deployment SHA = ______ = merge commit
- [ ] Tag `vX.Y.Z` บน SHA นั้น + push tag + GitHub Release (notes)
- [ ] Back-merge `main` → `develop` (ถ้ามี)

### E. หลัง Release (Step 11)
- [ ] Smoke test production (อ่านอย่างเดียว): login, ภาพรวมโหลด, ค้างชำระโหลด และประวัติเดือนนี้โหลด **ไม่สร้างหรือแก้ข้อมูลทดสอบบน production** ยกเว้นเจ้าของทำรายการจริงของร้าน
- [ ] ตรวจ error log 1 ชม. / 24 ชม. แรก
- [ ] แจ้งผู้ใช้ในร้านให้ reload tablet หรือแอป
- [ ] Success metrics baseline หลัง release (SM-01..10 ที่วัดได้)
- [ ] ปิด release branch

### F. Rollback plan ของ release นี้ (กรอกก่อน merge)
- App: rollback ไป deployment ______ (tag ______)
- DB: D1 / D2 / D3 (`migration-and-rollback.md` §4) · down scripts: ______
- เงื่อนไข trigger rollback: error rate > ______ หรือ CUJ ______ ใช้ไม่ได้ หรือข้อมูลผิด

## 3. Release Notes Template

```markdown
# vX.Y.Z — <ชื่อ release> (YYYY-MM-DD)

## สำหรับผู้ใช้ในร้าน (ภาษาง่าย)
- …

## การเปลี่ยนแปลง
### Added / Changed / Fixed / Security / Removed
- … (Refs: ER-xx, PR #)

## Database
- Migrations: M0xx … (expand-only: yes/no)

## Known issues
- …

## Rollback
- App → vX.Y.(Z-1) · DB: …
```
