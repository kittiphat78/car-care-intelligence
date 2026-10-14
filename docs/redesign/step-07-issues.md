# Step 07 — Progress & Issue Log

> Step: 07 — Incremental Production Implementation · เริ่ม 2026-10-14
> กติกา: ทำทีละ feature ตาม `implementation-roadmap.md` แล้ว commit ในเครื่อง จากนั้นหยุดรออนุมัติก่อน feature ถัดไป และ push/merge/deploy ต้องได้อนุมัติแยก

## 1. Feature Status

| Feature | Branch | Commits | Tests | สถานะ |
|---|---|---|---|---|
| Phase 0: Hotfix v1.0.1 (ER-01 + Next 16.3.8) | `hotfix/1.0.1` (จาก `v1.0.0`) | `1cab952`, `e2b67ed`, `93f60ff` | 191/191 (TZ Bangkok/UTC/NY), lint 0 error, type, build ✅ | ✅ push แล้ว (H-a) · Vercel Preview `93f60ff` build สำเร็จ · รอ H-b..H-d (`hotfix-1.0.1.md`) |
| A1: CI quality gates | `ci/quality-gates` (จาก `main` = `v1.0.0`) | `e820660` | จำลองทุก job ในเครื่อง ✅ (§2) | ✅ เสร็จในเครื่อง · รออนุมัติ push + PR |
| A2…C9 | — | — | — | ยังไม่เริ่ม |

## 2. A1 — CI quality gates

**ไฟล์:** `.github/workflows/ci.yml` (ใหม่), `.github/pull_request_template.md` (ใหม่) · ไม่แตะโค้ดแอป, dependency, DB หรือ Vercel

| Job | ทำอะไร | จำลองในเครื่องบนโค้ด `main` |
|---|---|---|
| `lint` | `npm run lint` | ✅ exit 0 |
| `typecheck` | `npm run type-check` | ✅ |
| `test` | `npm run test` | ✅ 146/146 (รันด้วย TZ=UTC แบบ runner) |
| `build` | `npm run build` + env placeholder | ✅ exit 0 |
| `audit` | `npm audit --omit=dev --audit-level=critical` | ❌ **ตามคาด** (`next` 16.2.1 critical) → ผ่านเมื่อ merge v1.0.1 (hotfix ตรวจแล้วว่า critical = 0) |
| `secrets` | ห้ามมีไฟล์ `.env*` ที่ track (ยกเว้น `.env.example`) + grep pattern JWT/API key/private key | ✅ ไม่พบ · self-test ด้วย JWT ปลอมตรวจจับได้ |
| `pr-title` | regex Conventional Commits | ✅ ผ่าน 2 ตัวอย่างถูก และปฏิเสธ 3 ตัวอย่างผิด (`Update stuff`, `feat(UI): …`, `merge: …`) |
| YAML | parse ด้วย PyYAML + ทุก action pin ด้วย SHA 40 ตัว | ✅ |

**ยังไม่ได้ตรวจ:** การรันจริงบน GitHub Actions (ต้อง push) และ Node 22 บน runner (ในเครื่องใช้ Node 24)

## 3. Issue Log

| ID | เรื่อง | Severity | สถานะ |
|---|---|---|---|
| S07-01 | Incident ด้านสิทธิ์เข้าถึงฐานข้อมูล (สรุป: `docs/incidents/2026-10-14-summary.md`) แก้และยืนยันแล้ว 2026-10-14 | Critical → Mitigated | NEEDS_APPROVAL: ยืนยันแอปใช้งานได้, ยืนยัน 4 บัญชี, ตรวจ log ย้อนหลัง |
| S07-02 | Audit gate ระดับ `critical` แทน `high` ตามแผน เพราะหลัง hotfix ยังมี high 5 ตัวใน production deps (HF-01) และถ้าใช้ `high` gate จะ fail ถาวรจนถึง R1 | Medium | RESOLVED (ตัดสินใจในงาน) → ยกเป็น `high` เมื่อ HF-01 ปิด |
| S07-03 | ไม่ใส่ `engines.node` ใน `package.json` ตามแผน A1 เพราะ Vercel ใช้ค่านี้เลือก Node ตอน build ซึ่ง**เปลี่ยนพฤติกรรม production** และยังไม่รู้ Node version ปัจจุบันของ Vercel (S05-05) → CI ใช้ Node 22 [I] ไปก่อน | Low | NEEDS_APPROVAL (ต้องรู้ Node version บน Vercel) |
| S07-04 | Secret scan ใช้ grep ใน workflow แทน gitleaks action เพื่อไม่พึ่ง action ภายนอกและ license | Low | RESOLVED |
| S07-05 | `.github/` ใช้ LF แต่เครื่องตั้ง `core.autocrlf` (Windows) จึงมีคำเตือน CRLF ซึ่งไม่กระทบ GitHub Actions | Low | RESOLVED (ไม่ต้องทำ) |
| S07-06 | เจ้าของเลือกเผยแพร่เฉพาะสรุป incident (repo public) และบันทึกฉบับเต็มเก็บใน branch `local/incident-detail-2026-10-14` บนเครื่องเท่านั้น (ไม่ push) | Medium | RESOLVED |
| S07-07 | สลับ branch ทำให้ `node_modules` ต้อง `npm ci` ใหม่ทุกครั้ง (hotfix = Next 16.3.8, main = 16.2.1) และตอนนี้ `node_modules` ตรงกับ `main` | Low | — (ขั้นตอนปกติ) |
| S07-08 | ถ้ายังไม่ตั้ง Ignored Build Step ทุก commit เอกสารหรือ CI จะ build และ deploy ใหม่ → เจ้าของตั้ง Custom `git diff --quiet HEAD^ HEAD -- . ':(exclude)docs' ':(exclude).github'` แล้ว 2026-10-14 | Low | RESOLVED (ยืนยันจาก commit เอกสารถัดไปที่ถูกข้าม build) |

## 4. รออนุมัติ (ต่อ feature)
| # | ขอ | ผล |
|---|---|---|
| A1-a | Push `ci/quality-gates` + เปิด PR → `main` | CI รันครั้งแรกบน GitHub และ Vercel สร้าง Preview (โค้ดแอปเหมือน v1.0.0) |
| A1-b | Merge PR | ไม่เปลี่ยน runtime · Ignored Build Step ตั้งแล้ว (S07-08) จึงไม่ deploy production ใหม่ |
| A1-c | ตั้ง required checks ใน ruleset (เจ้าของ) | `lint`, `typecheck`, `test`, `build`, `secrets`, `pr-title` ทันที และ `audit` หลัง v1.0.1 |
