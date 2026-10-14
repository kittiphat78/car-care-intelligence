# Branch Protection & Repository Settings — Step 06

> วันที่: 2026-10-14 · **ยังไม่ได้ตั้งค่าใด ๆ** (ไม่มี `gh` และไม่มีสิทธิ์ admin ผ่าน API ในสภาพแวดล้อมนี้ S06-01)
> เอกสารนี้คือค่าที่ต้องตั้ง + วิธีตั้งผ่าน GitHub UI โดยเจ้าของ repo ตั้งเองแล้วส่ง screenshot หรือผล `gh api` กลับมาเพื่อยืนยัน
> บาง feature (เช่น required reviewers ของ environment, rulesets บน private repo) ขึ้นกับ plan ของ GitHub [U]

## 1. Rulesets (GitHub → Settings → Rules → Rulesets)

### R-main: `main`

| Rule | ค่า | เหตุผล |
|---|---|---|
| Restrict deletions | ✅ | กันลบ branch production |
| Block force pushes | ✅ | ห้ามเขียนทับประวัติ |
| Require a pull request before merging | ✅ (required approvals = **0** เพราะทีม 1 คน และ GitHub ไม่ให้อนุมัติ PR ตัวเอง) | ทุกการเปลี่ยนผ่าน PR + CI |
| Dismiss stale approvals | ✅ | ถ้าภายหลังเพิ่ม reviewer |
| Require status checks to pass | ✅ `lint`, `typecheck`, `test`, `build`, `audit`, `secrets`, `db` (เมื่อมีไฟล์ `supabase/**`) | `ci-quality-gates.md` |
| Require branches to be up to date | ✅ | test บน code ล่าสุด |
| Require linear history | ❌ (release ใช้ merge commit) | §3.2 ของ git-workflow |
| Require conversation resolution | ✅ | |
| Require signed commits | ⭕ แนะนำ ถ้าตั้ง signing key ได้ | ไม่บังคับใน MVP |
| Bypass list | **ว่าง** (admin ก็ต้องผ่าน PR) และกรณีฉุกเฉินให้เพิ่มชั่วคราวพร้อมบันทึกใน incident log | ป้องกันพลาด |

### R-develop: `develop` (สร้างเมื่อเริ่ม Phase B)
เหมือน R-main ยกเว้น status checks ไม่ต้องมี `audit` แบบ blocking (ให้เตือน) และอนุญาต squash เท่านั้น

### R-release: `release/**`
Block force pushes + restrict deletions (จนกว่าจะ merge) + require PR สำหรับการเปลี่ยนนอกเหนือจาก bump version

### R-tags: tag `v*`
| Rule | ค่า |
|---|---|
| Restrict creations | ✅ เฉพาะ admin (เจ้าของ) |
| Restrict updates | ✅ **ห้ามย้าย tag** |
| Restrict deletions | ✅ |

## 2. Repository settings

| Setting | ค่า |
|---|---|
| Default branch | `main` |
| Allow merge commits | ✅ (release/hotfix) |
| Allow squash merging | ✅ (feature/fix — default) · message = PR title + body |
| Allow rebase merging | ❌ |
| Automatically delete head branches | ✅ |
| Secret scanning + push protection | ✅ ถ้า plan รองรับ [U] |
| Dependabot alerts | ✅ |
| Dependabot security updates | ✅ (PR อัตโนมัติ ซึ่งยังต้องผ่าน CI และ review) |
| Actions permissions | อนุญาตเฉพาะ actions จาก GitHub + verified creators + ที่ระบุ (pin ด้วย commit SHA) |
| Workflow permissions | default `contents: read` |

## 3. GitHub Environments (สำหรับ DB migration workflow)

| Environment | Secrets | Protection |
|---|---|---|
| `staging` | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` (staging) | deploy จาก `develop`, `release/**`, `main` ได้ |
| `production` | ชุดเดียวกันของ production | **Required reviewer: เจ้าของ** + wait timer 0 + deploy เฉพาะจาก `main` และ tag `v*` |

## 4. Vercel Project Settings (เจ้าของตั้ง)

| Setting | ค่า | อ้างอิง |
|---|---|---|
| Production Branch | `main` | A2 |
| Environment Variables | แยก scope ตาม `environment-variables.example` (Preview/Development = staging) | ADR-12 |
| Deployment Protection (Preview) | Vercel Authentication (หรือ password) | A7, T9 |
| Ignored Build Step | `git diff --quiet HEAD^ HEAD -- . ':(exclude)docs'` | git-workflow §5 |
| Node.js Version | ตรงกับ `engines` ใน `package.json` | S05-05 |
| Function Region | ใกล้ Supabase region | ADR-13 |
| Instant Rollback | เปิดใช้ (เป็น default) และเจ้าของรู้วิธีกด | `migration-and-rollback.md` |

## 5. การยืนยันหลังตั้งค่า (ต้องได้หลักฐาน)
```bash
gh api repos/kittiphat78/car-care-intelligence/rulesets            # มี R-main, R-tags
gh api repos/kittiphat78/car-care-intelligence/environments        # มี staging, production
git push origin HEAD:main                                          # ต้องถูกปฏิเสธ (ทดสอบด้วย branch ว่าง ไม่ใช่โค้ดจริง)
```
ผลบันทึกใน `step-06-issues.md` S06-01
