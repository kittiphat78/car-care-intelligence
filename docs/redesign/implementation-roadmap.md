# Implementation Roadmap — Step 06

> วันที่: 2026-10-14 · ลำดับงานจริงของ Step 07 เป็น PR เล็กที่ build, test และ rollback ได้ทีละตัว
> ทุก PR ทำตาม `git-workflow.md` §3 และผ่าน `ci-quality-gates.md` · ประมาณการเวลาเป็น † (ยังไม่มีข้อมูล velocity)
> **ไม่มีงานใดใน roadmap นี้ถูกเริ่มใน Step 06**

## 0. Prerequisites (ต้องเสร็จก่อนเริ่ม PR ที่แตะ DB หรือ deploy)

| # | งาน | ใคร | Blocks | อ้างอิง |
|---|---|---|---|---|
| P-1 | Push docs branch + draft PR | Claude (หลังอนุมัติ) | — | S01-09 |
| P-2 | ยืนยัน production commit = `7f58eec` | เจ้าของ (Vercel) | tag/rollback baseline | A1 |
| P-3 | สร้าง Supabase **staging** project | เจ้าของ | ทุกงาน DB, ทุก test เขียนข้อมูล | E-02, B2 |
| P-4 | ตั้ง env scope Preview/Development → staging | เจ้าของ | Preview ใช้งานได้อย่างปลอดภัย | B4, ADR-12 |
| P-5 | Backup production + ทดลอง restore ลง staging | เจ้าของ (+ Claude ช่วยเขียนขั้นตอน) | apply migration production | B5, rollback-readiness §4 |
| P-6 | ผล SQL / schema dump (M000) | เจ้าของ | M001+ | S01-01, S05-01 |
| P-7 | ตั้ง branch protection + environments | เจ้าของ | merge ปลอดภัย | `branch-protection.md`, S06-01 |
| P-8 | ปิด public sign-up ใน Supabase Auth | เจ้าของ | — (ทำได้ทันที ไม่กระทบผู้ใช้เดิม) | ER-13 |
| P-9 | รายชื่อสมาชิกที่ถูกต้อง | เจ้าของ | M001 | S05-03 |
| P-10 | อนุมัติ ADR (S05-02), Phase B big-bang (S06-02), Q ที่เหลือ | เจ้าของ | ตามรายการ | — |

## 1. Phase 0 — Hotfix (v1.0.1) · ถ้า Q-18 = a

| PR | Branch | เนื้อหา | ต้องมี | Release |
|---|---|---|---|---|
| H1 | `hotfix/next-16-4` | `build(deps)`: `next` + `eslint-config-next` 16.4.x (exact) | lockfile diff review, audit ก่อน/หลัง | v1.0.1 |
| H2 | `hotfix/edit-date-shift` | `fix(records)`: ER-01 + test 00:00/03:30/06:59/07:00/23:59 ภายใต้ TZ Asia/Bangkok และ UTC | — | v1.0.1 |

ไม่มี DB change และ rollback = Vercel instant rollback ไป v1.0.0
⚠ ปัจจุบันยังไม่มี staging จึงทดสอบ H2 ได้แค่ unit test และการแก้ไขจริงบน Preview จะเขียน production DB (R01) **ถ้ายังไม่มี P-3 ให้ทดสอบ H2 แบบ manual บน production เฉพาะการ "เปิด-บันทึกโดยไม่แก้" กับรายการทดสอบที่สร้างเองแล้วลบทิ้ง หรือรอ P-3** โดยต้องได้อนุมัติแยก

## 2. Phase A — Foundation & Data (UI เดิม)

### R0 → v1.1.0 "Foundation"
| PR | Branch | เนื้อหา | Deps |
|---|---|---|---|
| A1 | `ci/quality-gates` | `.github/workflows/ci.yml`, PR template, `engines.node`, secret scan | P-7 (ตั้ง required checks หลัง merge) |
| A2 | `chore/vercel-ignore-docs` | Ignored Build Step สำหรับ docs-only | — |
| A3 | `feature/env-guard` | ADR-12: `NEXT_PUBLIC_APP_ENV`, guard ตอน build, StatusBar env (UI เดิม + แถบเล็ก) | P-4 |
| A4 | `refactor/proxy-and-server-client` | `middleware.ts` → `proxy.ts`, `lib/supabase/server.ts` (`getAll/setAll`), `next` param + test redirect | H1 |
| A5 | `db/baseline` | M000 + Supabase CLI config + `supabase/tests` skeleton + CI `db` job | P-6 |
| A6 | `db/app-members-rls` | M001 + M002 + RLS tests | A5, P-9 |
| A7 | `db/indexes-idempotency-audit` | M003 + M004 + M005 + tests | A5 |
| A8 | `chore/remove-unused-api` | ลบ `/api/insights`, `/api/export-excel`, `GEMINI_API_KEY`, CSP host | Q-12 |
| A9 | `chore/error-reporting` | `/api/client-errors` + `reportError` + `app/error.tsx` (ADR-11) | — |
| R0 | `release/1.1.0` | bump, notes, apply M000–M005 production (DB ก่อน app), merge, tag | P-5, gates G1–G8 |

### R1 → v1.2.0 "Data correctness" (ยัง UI เดิม แต่แก้พฤติกรรม)
| PR | Branch | เนื้อหา | แก้ |
|---|---|---|---|
| B1 | `refactor/time-bangkok` | `lib/time/bangkok.ts` แทน `dateUtils` และ test TZ=UTC/Bangkok | ER-01 (ถ้ายังไม่ทำ H2), ER-10, ER-11 |
| B2 | `refactor/data-access-layer` | `lib/result.ts`, `lib/errors.ts`, `features/*/api.ts` + `fetchAllPages` แล้วย้าย query ออกจาก component (UI เดิม) | TD-01, ER-07, ER-17 |
| B3 | `db/read-rpcs` + `feature/dashboard-rpc` | M006 + dashboard/history ใช้ RPC และ realtime เฉพาะส่วน | ER-02, ER-31 |
| B4 | `db/settle-records` + `fix/debts-settle` | M007 + เคลียร์ยอดด้วย ids + dialog ยืนยันจำนวน | ER-03, S05-07, ER-25 |
| B5 | `fix/records-validation-shared` | Zod schema กลาง (create/edit), idempotency key, ส่งเฉพาะ field ที่เปลี่ยน, concurrency check, เลิก DOMPurify ตอนบันทึก | ER-05, ER-08, S03-04 |
| B6 | `db/constraints-not-valid` + `db/seq-trigger` | M008 + M009 (deploy **หลัง** B5 อยู่บน production) | T4, ER-04 |
| B7 | `fix/export-complete` | export ด้วย count check + ไม่สร้างไฟล์เมื่อไม่ครบ + กัน formula injection | ER-02, ER-07, T6 |
| R1 | `release/1.2.0` | ลำดับ deploy: M006–M007 → app (B1–B5, B7) → M008–M009 | |

## 3. Phase B — Redesign UI (`develop` → v2.0.0)

| PR | Branch (จาก `develop`) | เนื้อหา | Design ref |
|---|---|---|---|
| C1 | `feature/ui-tokens-and-primitives` | `tokens.css`, `@theme`, primitives (Button, Chip, Dialog, Toast, Banner, Skeleton, Icon) + contrast script (S04-03) + lint rules (S04-05) | design-tokens, component-specs §1 |
| C2 | `feature/ui-shell-nav` | AppShell, BottomNav/SideNav, route groups `(app)`/`(auth)`, `/more`, StatusBar, theme | screen-specs §0, §6 |
| C3 | `feature/ui-record-editor` | RecordEditor + fields + draft + ลบ `useKioskMode` + `/add` ใหม่ | §4 |
| C4 | `feature/ui-dashboard` | MoneyHero, รายการวันนี้ + dialog แก้ไข (URL state), ChartCard, CustomerBreakdown, Weather | §2, §8 |
| C5 | `feature/ui-debts-page` | `/debts`, DebtCustomerCard, settle dialog, bill | §3, §9 |
| C6 | `feature/ui-history` | `/history` URL filters, DataTable (Expanded), ExportForm | §5, §10 |
| C7 | `feature/ui-login-errors` | `/login`, error/404, session-expired dialog | §1, §7, §16 |
| C8 | `chore/remove-legacy-css` | ลบ class และ token เดิม (design-to-code-map §5) | — |
| C9 | `test/e2e-cuj` | E2E CUJ-1..8 + axe (Step 08) | — |
| RC | `release/2.0.0` | `v2.0.0-rc.1…` → UAT เจ้าของบน Preview → `v2.0.0` | release-checklist |

Phase B **ไม่มี migration ใหม่** ถ้าระหว่างทางพบว่าต้องเปลี่ยน DB ให้ทำเป็น PR แยกเข้า `main` แบบ Phase A (expand-only) ก่อน แล้ว back-merge `develop`

## 4. Decision-gated (นอกลำดับหลัก)
| งาน | เงื่อนไข | ช่วงที่เหมาะ |
|---|---|---|
| Soft delete + กู้คืน | Q-02 = b/c | Phase A (DB) + Phase B (UI) |
| เลขบิลกลาง | Q-05 = b | Phase A |
| Audit log | Q-13 = b | Phase A |
| Owner/staff roles | Q-01 = b | Phase A (policy) + Phase B (UI) |
| Structured columns แทน `services[]` | ADR-09 | หลัง v2.0.0 |

## 5. Critical path
`P-3 staging` → `P-6 M000` → `A5` → `A6 (RLS)` → `R0` → `B3/B4/B5` → `R1` → `C1` → `C2` → (`C3`‖`C4`‖`C5`‖`C6`) → `C7` → `C8` → `C9` → `RC` → `v2.0.0`

สิ่งที่ทำได้ **ก่อน** มี staging (ไม่แตะ DB หรือ production): A1, A2, A4, A9, B1, B2 (refactor ที่ test ด้วย unit test), C1 (primitives + Storybook-free test)
