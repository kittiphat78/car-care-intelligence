# Step 11 — Production Release Report (v2.1.0)

> 2026-10-19 · ป้ายหลักฐาน: [V] Verified · [I] Inferred · [U] Unknown
> ผล smoke test: `smoke-test-results.md` · การเฝ้าระวัง: `monitoring-report.md` · บันทึก release: `release-record.md` · เหตุการณ์: `incident-report.md`

## 1. สรุป

| | |
|---|---|
| สถานะ | **Deployed** · `v2.1.0` บน production ตั้งแต่ PR #50 (`8465548`, merge 23:21) · ตรวจจากภายนอกผ่านทุกข้อ [V] · **ยังไม่ปิด:** ตรวจที่ต้อง login และ Vercel logs (เจ้าของ) [U] |
| เจ้าของอนุมัติ | "อนุมัติ Step 11" 2026-10-19 ~22:06 · เปิดและ merge PR #49 และ #50 เอง |
| สิ่งที่ขึ้น production | D-09 การ์ด "ไม่มียอดค้าง" · D-10 ไม่แสดงอากาศ 0° ปลอม · D-11 กราฟโหลดไม่ได้หน้าไม่พัง · (D-01..D-07 ขึ้นไปก่อนแล้ว) |
| ฐานข้อมูล | ไม่มีการเปลี่ยน · ไม่ได้รัน migration [V] |
| Rollback | ไม่ได้ใช้ |

## 2. Pre-release gate

| ข้อ | หลักฐาน | ผล |
|---|---|---|
| RC ที่อนุมัติและ commit | `v2.1.0-rc.4` = `20a66eb` · หัว `release/2.1.0` ตอน merge = `170e13d` ต่างจาก rc.4 แค่ docs + `e2e-preview/` (ไม่ใช่โค้ดแอป) [V] | ✅ |
| CI, tests, build | CI บน `170e13d` (push และ PR #49) ผ่านครบ 9 required checks ก่อน merge (e2e เสร็จ 22:06:04 · merge 22:06:26) · ในเครื่อง unit 404/404, E2E Chromium 55/55 บน rc.4 [V] | ✅ |
| Regression | Preview + staging มือถือ 3/3 · PC 6/6 · iPhone 3/3 · WebKit ในเครื่อง 44/11 ไม่มี defect ใหม่ (`preview-test-results.md`) [V] | ✅ |
| Security | `npm audit --omit=dev`: High 0 · Critical 0 · Moderate 2 (`uuid` ผ่าน `exceljs`, ต้อง major upgrade) · bundle ไม่มี key ฝั่ง server · CSP ไม่มี `unsafe-eval` [V] | ✅ |
| Database migration | `git diff v2.0.0..release -- supabase/` = `supabase/tests/ci_fixtures.sql` เท่านั้น · ไม่มี migration [V] | ✅ N/A |
| Backup / recovery | ไม่มี schema change จึงไม่ต้อง restore เพื่อย้อน release · แผน backup ของ Supabase production ยังไม่ได้ตรวจในขั้นนี้ [U] · แนะนำเจ้าของส่งออก Excel ตามรอบปกติ | ✅ (ไม่บังคับ) |
| Environment variables | ชื่อ env ที่โค้ดใช้เหมือน `v2.0.0` ทุกตัว (เพิ่มแค่ `NODE_ENV` ที่ Next ตั้งเอง) · ไม่ต้องตั้ง env ใหม่ใน Vercel [V] | ✅ |
| Rollback procedure | Vercel Instant Rollback → `4162c44` (production ก่อน release) · ไม่ย้อนข้อมูล (`production-readiness-checklist.md` §4) | ✅ |
| Known issues + monitoring | D-08, iPhone keyboard, LCP ประวัติ/ค้างชำระ (`release-notes-draft.md`) · แผนเฝ้าระวัง `monitoring-report.md` · เจ้าของอนุมัติ Step 11 ตาม Go/No-Go ที่ระบุ known issues ไว้ [I] | ✅ |
| Critical/High defect ค้าง | ไม่มี [V] | ✅ |
| ช่วงเวลา (Q-19 นอกเวลาทำการ) | merge PR #49 22:06 · PR #50 23:21 เวลาไทย | ✅ |

## 3. Release procedure

| # | ขั้นตอน | หลักฐาน | ผล |
|---|---|---|---|
| 1 | ยืนยัน commit และ release notes | `170e13d` · `release-notes-draft.md` | ✅ · ⚠ ยังไม่ได้ bump `2.1.0` ก่อน merge (S11-01) |
| 2 | Branch protection + PR approvals | ruleset ของ `main`: ห้ามลบ · ห้าม force push · ต้องผ่าน PR · ต้องผ่าน `lint` `typecheck` `test` `build` `audit` `secrets` `pr-title` `db` `e2e` · approvals 0 (ทีมคนเดียว) [V] · `develop` ยังไม่มี ruleset [V] | ✅ |
| 3 | Merge ตาม workflow | PR #49 `release/2.1.0` → `main` · **merge commit** `e63d175` (parents `4162c44` + `170e13d`) · tree เท่ากับ `170e13d` [V] | ✅ |
| 4 | CI + build อีกครั้ง | CI ของ PR ผ่าน 9/9 · Vercel build production สำเร็จ [V] | ✅ |
| 5 | Database changes | ไม่มี [V] | ✅ N/A |
| 6 | Deploy ผ่าน Vercel | deployment `7177418079` · Production · `e63d175` · success 22:07 [V] | ✅ |
| 7 | Production URL + deployment status | `car-care-intelligence-53wd.vercel.app` เสิร์ฟ build ใหม่ (เวอร์ชันท้ายหน้าเปลี่ยนเป็น `v2.1.0-rc.4`) [V] | ✅ |
| 8 | Smoke test CUJ | อ่านอย่างเดียวผ่านทั้ง 2 รอบ (`smoke-test-results.md` §1–2) · ส่วนที่ต้อง login รอเจ้าของ (§3) | ✅ / ⏳ |
| 9 | Error logs + พฤติกรรมหลัง deploy | ตรวจจากภายนอกทุก 5 นาที ปกติทุกรอบ (`monitoring-report.md` §2) · Vercel logs ต้องใช้สิทธิ์เจ้าของ [U] | ✅ / ⏳ |
| 10 | ตัดสิน: ไปต่อ / เฝ้าระวัง / rollback | **ไปต่อและเฝ้าระวัง** (§8) | ✅ |

Feature flag / gradual rollout: แอปไม่มีระบบ feature flag และ Vercel Hobby ไม่มี gradual rollout จึง deploy ทั้งก้อน · การปิดของใหม่ = Instant Rollback ไป `4162c44`

## 4. S11-01 — PR #49 merge ก่อน bump เวอร์ชัน · Low (process) · [V]

- ขั้นตอน release (`git-workflow.md` §3.2–3.3) ต้อง commit `chore(release): 2.1.0` (เปลี่ยน `package.json` เป็น `2.1.0`) **ก่อน** เปิด PR · คำแนะนำ PR ที่ผมให้ไว้ตอนจบ Step 10 ไม่ได้บอกขั้นนี้ เจ้าของจึงเปิดและ merge PR #49 ตามนั้นจากหัว `170e13d` ที่ยังเป็น `2.1.0-rc.4`
- ผล: production รันโค้ด rc.4 ที่ทดสอบแล้วทุกบรรทัด แต่แสดง `v2.1.0-rc.4` ท้ายหน้า login, หน้าเพิ่มเติม และใน `appVersion` ของรายงาน error · ไม่กระทบข้อมูลหรือการใช้งาน
- แก้: commit `5046d23` บน `release/2.1.0` (เปลี่ยนแค่ `package.json`/`package-lock.json`) → PR ที่สองเข้า `main` (§5)
- tag `v2.1.0` จะอยู่บน merge commit ของ PR ที่สอง (commit ที่แสดงเลข `2.1.0` จริง) ไม่ใช่ `e63d175`

## 5. รอบที่ 2 — เลขเวอร์ชัน

| ขั้น | หลักฐาน | ผล |
|---|---|---|
| Commit | `5046d23` `chore(release): 2.1.0` · เปลี่ยนแค่ `version` ใน `package.json` และ `package-lock.json` [V] | ✅ |
| CI (push) | lint, typecheck, test, build, audit, secrets, db, e2e ผ่าน 8/8 (22:11–22:16) [V] | ✅ |
| Preview | deployment `7177521626` · ขึ้น `v2.1.0` · ใช้ staging · `e2e-preview` PC 6/6 · มือถือ 3/3 (รอบแรกล้ม 1 เพราะ open-meteo ตอบ 503 · รันใหม่ผ่าน) · เก็บกวาด staging ไม่เหลือรายการค้าง [V] | ✅ |
| PR | #50 `chore(release): set the version label to 2.1.0` · base `main` · เจ้าของเปิด 22:32 · CI ของ PR ค้างคิวจนถึง ~23:17 (S11-02) แล้วผ่าน | ✅ |
| Merge | **merge commit `8465548`** (parents `e63d175` + `5046d23`) · 23:21:11 · tree เท่ากับหัว `release/2.1.0` [V] | ✅ |
| Deploy | deployment `7178871333` · Production · `8465548` · success 23:21:39 · production URL ขึ้น `v2.1.0` [V] | ✅ |
| Smoke รอบ 2 | 23:33–23:37 ผ่านทุกข้อ · เวอร์ชัน `v2.1.0` (`smoke-test-results.md` §2) [V] | ✅ |

## 7. หลัง release

| งาน | หลักฐาน | ผล |
|---|---|---|
| Tag | `v2.1.0` annotated → `8465548` (commit ที่ production รันและแสดง `2.1.0`) · สร้างหลังยืนยัน deployment · `e63d175` ไม่มี tag [V] | ✅ |
| Back-merge `main` → `develop` | fast-forward ไม่ force push: `a40ba8f` → `e63d175` (23:10) → `8465548` (23:34) · `develop` = `main` [V] · D-11 อยู่ใน `develop` แล้ว | ✅ |
| D-08 (known issue ของ release นี้) | เจ้าของอนุมัติให้แก้ระหว่างรอ CI · branch `fix/keep-typing-before-ready` (`7b99a31`) → PR เข้า `develop` · ไม่ขึ้น production จนกว่าจะ release รอบหน้า · ผลในเครื่อง: unit 407/407, Chromium E2E 57/57, WebKit 54/3 (เดิม 44/11) [V] | ⏳ รอ merge |
| ปิด `release/2.1.0` | ไม่ลบ branch (เก็บไว้เหมือน `release/2.0.0`) · ไม่ commit เพิ่ม | ✅ |

## 8. ตัดสิน

**ไปต่อและเฝ้าระวัง** · ไม่ rollback

- ไม่พบเงื่อนไข rollback (`monitoring-report.md` §3): login, redirect, API และ Supabase ปกติทุกรอบ · ไม่มี error ใหม่ใน console · ไม่มี request ล้ม
- สิ่งที่ยังตรวจไม่ได้จากภายนอก: หน้าที่ต้อง login (ยอดเงิน, บันทึก, ค้างชำระ, Excel) และ error ของผู้ใช้จริงใน Vercel logs → เจ้าของตรวจ (`smoke-test-results.md` §3, `monitoring-report.md` §4)
- ถ้าเจ้าของพบปัญหาตามเกณฑ์: Vercel → Deployments → `4162c44` → Instant Rollback (ย้อนเฉพาะโค้ด ข้อมูลที่บันทึกระหว่างนี้ยังอยู่)

## 6. S11-02 — GitHub Actions ล่มระหว่าง release · ไม่กระทบ production · [V]

- CI ของ PR #50 ค้าง `queued` ตั้งแต่ 22:32 ไม่มีเครื่องรับงาน ปุ่ม Merge จึงกดไม่ได้ เพราะ ruleset บังคับให้ต้องผ่าน checks
- repo อื่นโดนเหมือนกันในเวลาเดียวกัน:
  - `vercel/next.js` งานล่าสุดเริ่มรัน 22:30 และ 22:37
  - `microsoft/vscode` งานล่าสุดเริ่มรัน 22:23 · ค้าง 26 จาก 30 งาน
- GitHub ประกาศ incident "Degraded availability for GitHub Actions, GitHub Pages and Webhooks" เมื่อ 22:49
- เจ้าของ Close/Reopen PR 1 ครั้ง (22:45) ได้งานรอบใหม่เข้าคิวเพิ่ม รอบที่ซ้ำกันจะถูกยกเลิกเองตาม `concurrency` ของ workflow
- ตัดสิน: **รอ** ไม่ข้าม ruleset · production ยังรันโค้ด v2.1.0 ปกติ (`monitoring-report.md` §2)
