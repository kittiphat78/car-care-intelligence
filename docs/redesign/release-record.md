# Release Record — v2.1.0

> บันทึกอย่างเป็นทางการของ release · ป้ายหลักฐาน: [V] Verified · [I] Inferred · [U] Unknown
> รายละเอียด: `production-release-report.md` · `smoke-test-results.md` · `monitoring-report.md` · `incident-report.md` · notes `release-notes-draft.md`

## 1. ตัวตน

| | |
|---|---|
| เวอร์ชัน | `2.1.0` (MINOR) |
| ฐาน | `v2.0.0` `99b7311` (2026-10-18) |
| RC ที่อนุมัติ | `v2.1.0-rc.4` `20a66eb` (tag annotated) |
| Release branch | `release/2.1.0` (หัวสุดท้าย `5046d23`) |
| PR | #49 `chore(release): 2.1.0` → merge commit `e63d175` · #50 `chore(release): set the version label to 2.1.0` → merge commit **`8465548`** |
| Production | `8465548` · deployment `7178871333` · success 23:21:39 [V] |
| Tag | `v2.1.0` (annotated) → `8465548` · สร้างหลังยืนยัน deployment · push 23:41 [V] · `e63d175` ไม่มี tag (ป้ายเป็น rc.4) |
| ผู้อนุมัติ / ผู้ merge | เจ้าของ (kittiphat78) · "อนุมัติ Step 11" 2026-10-19 |
| Migration | ไม่มี |

## 2. เส้นเวลา (เวลาไทย, 2026-10-19)

| เวลา | เหตุการณ์ | หลักฐาน |
|---|---|---|
| 21:58 | CI (push) บน `170e13d` เริ่ม · ผ่าน 8/8 | GitHub check runs [V] |
| 22:01 | เจ้าของเปิด PR #49 · CI (PR) รันซ้ำ 9 checks | [V] |
| 22:06:04 | check สุดท้าย (`e2e`) ผ่าน | [V] |
| 22:06:26 | เจ้าของ merge PR #49 แบบ merge commit → `e63d175` | [V] |
| 22:07 | Vercel production deployment `7177418079` success | GitHub deployments [V] |
| 22:08–22:12 | Smoke test อ่านอย่างเดียว รอบ 1 ผ่าน · พบเลขเวอร์ชัน `v2.1.0-rc.4` (S11-01) | `smoke-test-results.md` §1 [V] |
| 22:11 | push `5046d23` `chore(release): 2.1.0` (เลขเวอร์ชันเท่านั้น) · CI (push) ผ่าน 8/8 ถึง 22:16 | [V] |
| 22:12–23:12 | ตรวจ production จากภายนอกทุก 5 นาที 13 รอบ ปกติทุกรอบ | `monitoring-report.md` §2 [V] |
| 22:16–22:30 | Preview `5046d23` ขึ้น `v2.1.0` · `e2e-preview` PC 6/6, มือถือ 3/3 | [V] |
| 22:32 | เจ้าของเปิด PR #50 · CI ของ PR ค้างคิวเพราะ GitHub Actions ล่ม (S11-02) | [V] |
| 22:49 | GitHub ประกาศ incident ของ Actions | githubstatus.com [V] |
| 23:10 | fast-forward `develop` → `e63d175` | git [V] |
| 23:11–23:17 | `pr-title` และ `ci` ของ PR #50 เริ่มรัน | GitHub Actions [V] |
| 23:21:11 | เจ้าของ merge PR #50 แบบ merge commit → `8465548` | git [V] |
| 23:21:39 | Vercel production deployment `7178871333` success (`8465548`) | GitHub deployments [V] |
| 23:33–23:37 | Smoke test อ่านอย่างเดียว รอบ 2 ผ่าน · `v2.1.0` | `smoke-test-results.md` §2 [V] |
| 23:34 | fast-forward `develop` → `8465548` (back-merge เสร็จ) | git [V] |
| 23:34– | เฝ้าระวังรอบ 2 ทุก 5 นาที | `monitoring-report.md` §2 |
| 23:41 | tag `v2.1.0` (annotated) บน `8465548` · push | git [V] |

## 3. Production ก่อน / หลัง

| | commit | deployment | เวลา |
|---|---|---|---|
| ก่อน release | `4162c44` (PR #47 hotfix D-07) | `7174701859` | 20:12 |
| หลัง PR #49 | `e63d175` (ป้าย `v2.1.0-rc.4`) | `7177418079` | 22:07 |
| **หลัง PR #50 = v2.1.0** | `8465548` | `7178871333` | 23:21 |

## 4. Rollback

| ย้อนไป | ได้อะไร | ใช้เมื่อ |
|---|---|---|
| `e63d175` | โค้ดเดียวกับ v2.1.0 แค่ป้าย rc.4 | ปัญหาจากการ deploy รอบ 2 เท่านั้น |
| `4162c44` | ก่อน v2.1.0 (ไม่มี D-09/D-10/D-11) | ปัญหาจากของใหม่ใน release นี้ |
| `ea41d14` / `99b7311` | ก่อน Step 09 / v2.0.0 | ดู `production-readiness-checklist.md` §4 |

Vercel Instant Rollback ย้อนเฉพาะโค้ด ไม่ย้อนข้อมูลในฐานข้อมูลและไม่ย้อน env

## 5. งานหลัง release

| งาน | สถานะ |
|---|---|
| Tag `v2.1.0` บน commit ที่ production รันจริง | ✅ `v2.1.0` → `8465548` |
| Back-merge `main` → `develop` (นำ D-11 เข้า `develop`) | ✅ fast-forward `develop` = `main` = `8465548` |
| Smoke test ที่ต้อง login (เจ้าของ) | ✅ ผ่านหมด ~23:50 |
| Vercel logs (เจ้าของ) | ✅ 30 นาทีแรกไม่มี error · วันแรกที่ร้านเปิดดูต่อเป็นช่วง ๆ (Hobby ดูย้อนได้ 30 นาที) ⏳ |
| D-07: ค้น log `password=` (เจ้าของ) | ทำไม่ได้ (Hobby ดูย้อนได้ 30 นาที) · แนะนำเปลี่ยนรหัสผ่าน ⏳ (`incident-report.md`) |
| D-08: แก้ใน PR แยกเข้า `develop` | ⏳ branch `fix/keep-typing-before-ready` รอ merge (ขึ้น production ใน release ถัดไป) |
| ruleset ของ `develop` (แนะนำ) | ⏳ เจ้าของ |
| GitHub Release (หน้า Releases) | ไม่ได้สร้าง: ไม่มี `gh` และไม่มีสิทธิ์ API ในเครื่องนี้ · เจ้าของสร้างจาก tag ได้ถ้าต้องการ (ไม่บังคับ) |
