# Step 07 — Progress & Issue Log

> Step: 07 — Incremental Production Implementation · เริ่ม 2026-10-14
> กติกา: ทำทีละ feature ตาม `implementation-roadmap.md` แล้ว commit ในเครื่อง จากนั้นหยุดรออนุมัติก่อน feature ถัดไป และ push/merge/deploy ต้องได้อนุมัติแยก

## 1. Feature Status

| Feature | Branch | Commits | Tests | สถานะ |
|---|---|---|---|---|
| Phase 0: Hotfix v1.0.1 (ER-01 + Next 16.3.8) | `hotfix/1.0.1` (จาก `v1.0.0`) | `1cab952`, `e2b67ed`, `93f60ff` | 191/191 (TZ Bangkok/UTC/NY), lint 0 error, type, build ✅ | ✅ **Production** · PR #3 merge `d748ac6` (merge commit) · Vercel production deploy success 2026-10-14 19:43 · tag `v1.0.1` → `d748ac6` ✅ |
| A1: CI quality gates | `ci/quality-gates` | `5d12043` | CI รันจริงบน GitHub ผ่าน 9/9 (Node 22 runner) ✅ | ✅ PR #4 merge แล้ว |
| A2: Ignored Build Step | — (ตั้งใน Vercel โดยเจ้าของ) | — | commit docs-only ถูกข้าม build ✅ | ✅ (S07-08) |
| A4: proxy + server client + `next` param | `refactor/proxy-and-server-client` | `9ca9719`, `a73e770` | 222/222 · production: `/history` → `/login?next=%2Fhistory` ✅ · เจ้าของ login ใช้งานได้ ✅ | ✅ **Production** · PR #6 → `24c6c8c` |
| A9: error reporting | `chore/error-reporting` | `75d7613` | 242/242 · production: `/api/client-errors` ไม่มี session → 401 ✅ | ✅ **Production** · PR #7 → `152fd26` |
| B1: เวลาไทย | `refactor/time-bangkok` (rebase บน `152fd26`) | `776780b` | 287/287 ทั้ง TZ Bangkok และ UTC · test ใหม่ fail กับโค้ดเดิมเมื่อ TZ=UTC/NY ✅ | ✅ **Production** · PR #8 |
| B2: data-access layer | `refactor/data-access-layer` (ต่อจาก B1) | `c402e3b` | 323/323 (รวม A4 `next`) ทั้ง TZ Bangkok และ UTC ✅ | ✅ **Production** · PR #9 |
| A5: DB baseline + CI `db` | `db/baseline`, `db/indexes-idempotency-audit` | `e67140c`, `978af00` | CI `db` job บน GitHub: migration ทั้งหมด + seed + SQL tests + rollback ทุกไฟล์ ✅ (2 นาที 15 วินาที) | ✅ merge แล้ว (PR #11, #16) |
| A8: ลบ API ที่ไม่ใช้ | `chore/remove-unused-api` | `e99c31c` | 241/241 · production: `/api/insights`, `/api/export-excel` → 404 ✅ | ✅ **Production** · PR #10 |
| P-3/P-4: staging | — (Supabase + Vercel โดยเจ้าของ) | — | Preview login + ทดสอบ B2 บน staging ✅ · `PRODUCTION_SUPABASE_PROJECT_REF` ตั้งแล้ว | ✅ |
| A3: env guard | `feature/env-guard` | `7528cb0` | 333/333 · จำลอง build Preview→production ไม่ผ่าน ✅ | ✅ **Production** · PR #13 |
| A6: สมาชิกร้าน + RLS | `db/app-members-rls` | `c3cc5bf`, `fa32310` | staging: `ALL MEMBER RLS TESTS PASSED` ✅ · production 2026-10-15: 4/4 บัญชีเป็นสมาชิก, แอปปกติ, anon ถูกปฏิเสธทุกตาราง/ฟังก์ชัน ✅ | ✅ **ใช้กับ production แล้ว** · PR #15 |
| A7: index + client_request_id + audit trigger | `db/indexes-idempotency-audit` | `ea15a4a` | ในเครื่อง (Supabase local) + staging: `ALL INDEX / IDEMPOTENCY / AUDIT TESTS PASSED` ✅ · production 2026-10-15: index 4 / column 2 / trigger 2 ✅ · บันทึกและแก้ไขในแอปแสดงชื่อจาก session ✅ | ✅ **ใช้กับ production แล้ว** · PR #16 |
| B3: ยอดหน้าแรกในฐานข้อมูล (M006) | `feature/dashboard-rpc` | `e4f147b` | SQL tests ✅ · ยอดบน seed ตรงกับสูตรแยก ✅ · production: ยอดค้างชำระ/รายรับตามลูกค้าเท่าเดิม ✅ | ✅ **Production** · PR #18 |
| B4: เคลียร์ยอดตาม id (M007) | `fix/debts-settle` | `7b556c1` | SQL tests ✅ · production: ยืนยัน "4 รายการ รวม ฿6,500" ✅ | ✅ **Production** · PR #18 |
| B5: กฎบันทึกชุดเดียว + กันซ้ำ + กันแก้ทับ | `fix/records-validation-shared` | `067c073` | 357/357 · production: แก้ไขโดยลบทะเบียน → "กรุณากรอกป้ายทะเบียน" ✅ | ✅ **Production** · PR #18 |
| B7: Excel export กันสูตร | `fix/export-complete` | `0c43ee5` | 365/365 · test สร้างไฟล์จริงแล้วอ่านกลับ ✅ | ✅ **Production** · PR #20 |
| B6: กฎข้อมูล (M008) + เลขลำดับ (M009, ตัวเลือก ก) | `db/constraints-seq` | — | ข้อมูล production ผ่านกฎ 9/9 · SQL tests ✅ · 2 session พร้อมกันได้เลข 1, 2 ✅ | ✅ **ใช้กับ production แล้ว** 2026-10-15 · PR #21 |
| **R1: release v1.2.0** | `release/1.2.0` | `425e9ab` | CI 8/8 บน merge commit ✅ · Vercel production deploy success 2026-10-16 18:34 (เวลาไทย) | ✅ **Production** · PR #22 merge `b5213db` (merge commit) · tag `v1.2.0` → `b5213db` ✅ · `docs/redesign/release-1.2.0.md` |
| C1: tokens + primitives (Phase B) | `feature/ui-tokens-and-primitives` | `7bb3aca` | contrast 38 คู่ × 2 theme ✅ | ✅ `develop` · PR #24 |
| C2: shell, nav, `/more`, server guard (ADR-13) | `feature/ui-shell-nav` | `455178d` | redirect `/login?next=` ✅ | ✅ `develop` · PR #25 |
| C3: RecordEditor + `/add` + draft · เลิกนับ `seq_number` ในแอป | `feature/ui-record-editor` | `6e85125` | ✅ | ✅ `develop` · PR #26 |
| C4: ภาพรวม + dialog แก้ไข (`?edit=`) | `feature/ui-dashboard` | `257edbf` | ✅ | ✅ `develop` · PR #28 |
| C5: `/debts` + เคลียร์ยอด (`?settle=`) + บิล + badge | `feature/ui-debts-page` | `a50b8cc` | ✅ | ✅ `develop` · PR #30 |
| C6: `/history` + DataTable + ส่งออก Excel (`?export=1`) | `feature/ui-history` | `dfea250` | ✅ | ✅ `develop` · PR #31 (#32 ว่าง) |
| C7: login, error, 404, เซสชันหมดอายุ | `feature/ui-login-errors` | `b5ec968` | ✅ | ✅ `develop` · PR #35 |
| C8: ลบ v1 design system | `chore/remove-legacy-css` | `ca39a07` | CSS 92→60 KB | ✅ `develop` · PR #36 |
| C9: E2E CUJ-1..8 + axe (Playwright, Supabase จำลองใน CI) | `test/e2e-cuj` | `60da757` | 18/18 ในเครื่อง ×3 · CI `e2e` ✅ (4 นาที) | ✅ `develop` · PR #39 |
| แก้หลังเจ้าของทดสอบ | `fix/ui-tokens-robust`, `fix/legacy-css-scope`, `fix/mobile-sheet`, `fix/mobile-width`, `fix/ui-overlaps` | — | ภาพจาก build จริง 390/1440 px | ✅ `develop` · PR #27, #29, #33, #34, #38 |
| C1–C9 | — | — | — | ยังไม่เริ่ม |

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

## 2.1 Batch A4 · A9 · B1 · B2 (อนุมัติให้ทำต่อกันแล้วรายงานรวม)

ทุกงานผ่าน `lint` (0 error, warning เดิม 1 ตัว HF-03), `type-check`, `test` และ `build` [V] และ**ไม่แตะ DB schema, RLS, env หรือการตั้งค่า Vercel/Supabase**

| งาน | เปลี่ยนอะไร | ผู้ใช้เห็นอะไรต่างไป |
|---|---|---|
| A4 | `middleware.ts` → `proxy.ts` (Next 16), `lib/supabase/server.ts` ใช้ `getAll/setAll`, redirect เก็บ cookie ที่ refresh แล้ว + ส่ง cache header ของ `@supabase/ssr` | ไม่มี (กติกา redirect เดิม) |
| A9 | `reportError` → `POST /api/client-errors` → Vercel runtime log (JSON, user id แบบ hash, ลบอีเมลและตัวเลข ≥3 หลัก) ครอบคลุม `app/error.tsx`, uncaught error, unhandled rejection · จำกัด 10 รายงาน/หน้า | ไม่มี |
| B1 | `lib/time/bangkok.ts` + ทุกขอบเขตวัน/สัปดาห์/เดือน/ปี และการแสดงเวลาเป็นเวลาไทย (`dateUtils` เป็น wrapper) | เครื่องที่ตั้งเวลาไทย: **ไม่มี** · ตัวกรองวันที่ใน History รวมรายการ 00:00–06:59 ของวันเริ่มแล้ว (ER-10) |
| B2 | `lib/result.ts`, `lib/errors.ts`, `lib/fetch-all-pages.ts`, `features/{records,history,dashboard}/api.ts` · query ข้อมูลธุรกิจทั้งหมดย้ายออกจาก component | ข้อความ error เป็นภาษาไทยพร้อมรหัสอ้างอิงแทนข้อความดิบ (ER-17) · Export ไม่สร้างไฟล์ถ้าโหลดไม่ครบ (ER-07) · โหลดข้อมูลเกิน 1,000 แถวได้ครบ (ER-02) |

**ลำดับ merge (branch ต่อกันเป็นสาย):** A4 → A9 → B1 → B2 · หลัง squash merge แต่ละตัว ผม rebase branch ถัดไปบน `main` ในเครื่อง**ก่อน** push จึงไม่ต้อง force push

## 3. Issue Log

| ID | เรื่อง | Severity | สถานะ |
|---|---|---|---|
| S07-01 | Incident ด้านสิทธิ์เข้าถึงฐานข้อมูล (`docs/incidents/2026-10-14-summary.md`) mitigated 2026-10-14 · แก้ถาวรด้วย A6 2026-10-15 | Critical → Resolved | RESOLVED (เหลือตรวจ log ย้อนหลัง) |
| S07-02 | Audit gate ระดับ `critical` แทน `high` ตามแผน เพราะหลัง hotfix ยังมี high 5 ตัวใน production deps (HF-01) และถ้าใช้ `high` gate จะ fail ถาวรจนถึง R1 | Medium | RESOLVED (ตัดสินใจในงาน) → ยกเป็น `high` เมื่อ HF-01 ปิด |
| S07-03 | ไม่ใส่ `engines.node` ใน `package.json` ตามแผน A1 เพราะ Vercel ใช้ค่านี้เลือก Node ตอน build ซึ่ง**เปลี่ยนพฤติกรรม production** และยังไม่รู้ Node version ปัจจุบันของ Vercel (S05-05) → CI ใช้ Node 22 [I] ไปก่อน | Low | NEEDS_APPROVAL (ต้องรู้ Node version บน Vercel) |
| S07-04 | Secret scan ใช้ grep ใน workflow แทน gitleaks action เพื่อไม่พึ่ง action ภายนอกและ license | Low | RESOLVED |
| S07-05 | `.github/` ใช้ LF แต่เครื่องตั้ง `core.autocrlf` (Windows) จึงมีคำเตือน CRLF ซึ่งไม่กระทบ GitHub Actions | Low | RESOLVED (ไม่ต้องทำ) |
| S07-06 | เจ้าของเลือกเผยแพร่เฉพาะสรุป incident (repo public) และบันทึกฉบับเต็มเก็บใน branch `local/incident-detail-2026-10-14` บนเครื่องเท่านั้น (ไม่ push) | Medium | RESOLVED |
| S07-07 | สลับ branch ทำให้ `node_modules` ต้อง `npm ci` ใหม่ทุกครั้ง (hotfix = Next 16.3.8, main = 16.2.1) และตอนนี้ `node_modules` ตรงกับ `main` | Low | — (ขั้นตอนปกติ) |
| S07-08 | ถ้ายังไม่ตั้ง Ignored Build Step ทุก commit เอกสารหรือ CI จะ build และ deploy ใหม่ → เจ้าของตั้ง Custom `git diff --quiet HEAD^ HEAD -- . ':(exclude)docs' ':(exclude).github'` แล้ว 2026-10-14 | Low | RESOLVED (ยืนยันจาก commit เอกสารถัดไปที่ถูกข้าม build) |
| S07-09 | `next` param (กลับไปหน้าเดิมหลัง login) เป็นพฤติกรรม Authentication ใหม่ → เจ้าของอนุมัติ 2026-10-14 → `a73e770` รับเฉพาะ path ในเว็บนี้ (กัน open redirect) | Low | RESOLVED |
| S07-10 | `proxy.ts` ของ Next 16 รันบน Node runtime (middleware เดิมเป็น Edge) [I จากเอกสาร Next 16] | Low | RESOLVED (architecture §8 เลือก Node อยู่แล้ว) |
| S07-11 | Vercel Hobby เก็บ runtime log สั้น [I ~1 ชั่วโมง] และไม่มี alert ดังนั้น A9 ช่วยตอนตรวจย้อนหลังได้จำกัด | Medium | UNRESOLVED (ADR-11: ทบทวนหลัง 1 เดือน / Sentry ต้องอนุมัติ) |
| S07-12 | B2 ยังไม่ย้ายการเรียก Auth (login, `getUser`, `signOut`) และ realtime channel เพราะเป็นงาน Authentication (`features/auth`, Phase C) และ B3 | Low | — (ตามแผน) |
| S07-13 | ถ้านับลำดับรายการของวัน (`seq_number`) ไม่สำเร็จ จะเริ่มที่ 1 เหมือนเดิม และลำดับซ้ำยังไม่แก้ | Low | RESOLVED (M009 ใน B6) |
| S07-14 | ทดสอบเส้นทางบันทึก/แก้/ลบจริงบน Preview ไม่ได้ เพราะ Preview ใช้ production DB ทำให้ unit test ใช้ mock | Medium | RESOLVED (staging + Preview ใช้ได้ตั้งแต่ A6) |
| S07-15 | `fetchAllPages` ใช้ offset pagination ซึ่งถ้ามีการบันทึกระหว่างโหลดหลายหน้า อาจได้แถวซ้ำ 1 แถว [I] (ร้านบันทึก ~3 รายการ/วัน) | Low | UNRESOLVED (แก้ด้วย RPC ใน B3) |
| S07-16 | สภาพอากาศ (`useWeather`) ยังใช้ชั่วโมงของเครื่อง | Low | — (ย้ายใน `features/weather`) |
| S07-17 | login บน Preview ไม่ได้: สาเหตุจริงคือ `NEXT_PUBLIC_SUPABASE_URL` ของ Preview เป็นค่า production แต่ key เป็นของ staging (ตรวจด้วย F12) → แก้ค่าแล้ว | Low | RESOLVED |
| S07-18 | `pr-title` ไม่รันใหม่เมื่อแก้หัวข้อ PR → แยกเป็น workflow `pr-title.yml` ที่ฟัง `edited` | Low | RESOLVED (merge แล้ว) |
| S07-19 | PR #4–#7 ถูก merge แบบ merge commit ไม่ใช่ squash ตาม `git-workflow.md` §3.1 | Low | — (ไม่เสียหาย) |
| S07-20 | Ignored Build Step ไม่ยกเว้น `supabase/` ทำให้ merge PR ที่แก้แค่ SQL จะ deploy production ใหม่ด้วยโค้ดเดิม | Low | NEEDS_APPROVAL (เพิ่ม `':(exclude)supabase'` ใน Vercel) |
| S07-21 | `GEMINI_API_KEY` ใน Vercel | Low | RESOLVED (ไม่มีตัวแปรนี้อยู่แล้ว) |
| S07-22 | ไฟล์ test RLS แบบหลายคำสั่งใช้ไม่ได้ใน SQL Editor ของ Supabase (รันแต่ละคำสั่งแยก transaction) → เขียนใหม่เป็น DO block เดียวที่ rollback ตัวเอง | Low | RESOLVED (`fa32310`) |
| S07-23 | VS Code บันทึกไฟล์ test เวอร์ชันเก่าทับไฟล์ใหม่ (เนื้อหาซ้อนกัน) → กู้จาก commit | Low | RESOLVED |
| S07-24 | Backup production (P-5) เป็น CSV ที่เจ้าของ export เอง ยังไม่ได้ทดลอง restore | Medium | RESOLVED (ดู S07-31) |
| S07-25 | Supabase CLI บน Windows ต้องตั้ง `TMP`/`TEMP` เป็นโฟลเดอร์ที่เขียนได้ ไม่งั้น `supabase start` ล้มด้วย `makeTempDirectoryScoped NotFound` (CI บน Linux ไม่เป็น) | Low | RESOLVED (วิธีแก้บันทึกไว้) |
| S07-26 | ทดสอบ A7 บน production ด้วยการบันทึกรายการ "7788 TEST" ฿500 ลงข้อมูลจริง ต้องลบออก | Low | RESOLVED (เจ้าของลบแล้ว · ดู S07-34) |
| S07-27 | ตั้ง required checks (`lint`, `typecheck`, `test`, `build`, `audit`, `secrets`, `pr-title`, `db`) ใน ruleset ของ `main` | Medium | RESOLVED 2026-10-17 · ruleset `main` ใช้งานแล้ว (target = default branch) ตรวจผ่าน API · เสนอเพิ่ม `e2e` ตอน v2.0.0 |
| S07-28 | PR #18 ถูก merge ก่อนรัน M006/M007 บน production → ยอดบนหน้าแรกโหลดไม่ได้และเคลียร์ยอดล้มเหลว (ไม่แก้ข้อมูล) ประมาณ 22:45–22:48 2026-10-15 จนรัน SQL แล้ว | Medium | RESOLVED · ป้องกัน: บรรทัดแรกของ PR template บอกไฟล์ SQL ที่ต้องรันก่อน merge |
| S07-29 | B3–B5 ทดสอบบน production หลัง merge แทน Preview (ทดสอบเฉพาะสิ่งที่ไม่เขียนข้อมูล) · เรื่องแก้ชนกัน 2 เครื่องและบันทึกซ้ำทดสอบด้วย unit test + SQL test เท่านั้น | Low | — (ยอมรับ) |
| S07-30 | ลบ `isomorphic-dompurify` (ADR-10) ข้อความที่บันทึกก่อนนี้ซึ่งถูกแปลงเป็น `&lt;` ยังคงอยู่ | Low | — (ตาม ADR-10) |
| S07-31 | ทดลองกู้ backup (G5): CSV จาก production (962 รายรับ / 91 รายจ่าย) import ลงตาราง `restore_*` บน staging แล้ว fingerprint และ hash ของ id ตรงกันทุกค่า · ลบตาราง restore แล้ว · ไฟล์เก็บที่ `backup-2026-10-15` ของเจ้าของ | High | RESOLVED 2026-10-15 |
| S07-32 | เลขลำดับเดิมที่ซ้ำ 10 วัน / ข้าม 8 วัน: เจ้าของเลือก (ก) ไม่แก้ของเก่า M009 ใช้กับรายการใหม่เท่านั้น | Low | RESOLVED (ตัดสินแล้ว) |
| S07-33 | แอปยังคำนวณ `seq_number` เองแล้วส่งไป (trigger แทนที่ให้) จึงยังมี request นับเกินมา 1 ครั้งต่อการบันทึก | Low | RESOLVED ใน C3 (ฐานข้อมูลออกเลขเอง, M009) |
| S07-34 | ทดสอบบน production ด้วยรายการ TEST1 (฿2,000), TEST2 (฿1,500), TEST3 (฿500) ลงข้อมูลจริง → เจ้าของลบแล้ว 2026-10-16 · การทดสอบที่เขียนข้อมูลต้องทำบน Preview (staging) | Low | RESOLVED |
| S07-35 | C1: ตัวแปร radius ของ v1 เปลี่ยนชื่อเป็น `--legacy-radius-*` เพื่อไม่ทับ token ใหม่ · class `rounded-*` ในหน้าเดิมจึงโค้งน้อยลงเล็กน้อย (เช่น 24→20px) **เฉพาะบน `develop`** · `ErrorBanner.tsx` (v1) ยกเว้นจาก lint ของ UI ใหม่จนกว่าหน้าเดิมจะย้ายไป `Banner` | Low | RESOLVED ใน C8 (v1 CSS ลบแล้ว) |
| S07-36 | S04-04 (ชื่อ variable ชนใน Tailwind v4) ตรวจกับ Tailwind 4.2.2 แล้ว: `@theme inline { --color-bg: var(--color-bg) }` อ้างตัวเอง จึงใช้ `@theme static` เก็บค่าจริง + `[data-theme="light"]` override ชื่อเดียวกัน | Low | RESOLVED |

| S07-37 | หน้าจอ PC ของเจ้าของแสดง token ใหม่ไม่ได้ (สี/ระยะหาย) ทั้งที่ build บน Windows และ Linux (Docker แบบ Vercel) ได้ CSS ถูกต้อง · แก้ทาง: token ทั้งหมดอยู่ใน `@theme static` ไม่มี var() ต่อกัน (#27), แยก v1 element rules ไป layer base (#29), `darkreader-lock` · หลัง #29 เจ้าของยืนยัน "ปกติแล้ว" · ต้นเหตุที่แน่ชัด **ไม่ทราบ** | Medium | RESOLVED (สาเหตุ Unknown) · ถ้าเกิดอีกขอ share link ของ Preview |
| S07-38 | Chrome Android: bottom sheet เปิดแล้วเลื่อนขึ้นเกินจอ เพราะ focus ระหว่าง slide-in ทำให้กล่อง `overflow:hidden` scroll → `overflow:clip` + `h-dvh` + `preventScroll` (#33) | Medium | RESOLVED |
| S07-39 | Chrome Android: `<select>`/date input กว้างตามเนื้อหา ดันคอลัมน์ grid ให้กว้างเกินจอ → `grid-cols-1` (minmax(0,1fr)) ทุก grid คอลัมน์เดียว + `size=1` (#34) | Medium | RESOLVED |
| S07-40 | E2E พบ: CSP บล็อก Supabase ที่ไม่ใช่ `*.supabase.co` (เพิ่ม origin ที่ตั้งตอน build), กราฟ `aria-hidden` มีจุด focus (ปิด accessibility layer ของ recharts), ของที่ scroll เข้าจออาจอยู่ใต้ bottom nav (`scroll-padding-bottom`) (#39) | Medium | RESOLVED |
| S07-41 | ยังไม่ได้ทดสอบบนเครื่องจริง: บิล PDF บน iPhone (S03-05), dialog เซสชันหมดอายุตอนหมดจริง, การแก้สีของ autofill | Low | UNRESOLVED → รายการ UAT ใน `release-2.0.0.md` |
| S07-42 | เครื่องมือ E2E เลือกเวอร์ชันที่ออกนานแล้ว (Playwright 1.63.0, axe 4.13.0) แทนเวอร์ชันที่เพิ่งออก 3–4 วัน (supply chain) | Low | — (ตัดสินใจในงาน) |

## 4. รออนุมัติ (ต่อ feature)
| # | ขอ | ผล |
|---|---|---|
| H-d | สร้าง annotated tag `v1.0.1` บน `d748ac6` แล้ว push tag | ✅ อนุมัติและทำแล้ว |
| BA-1 | Push `refactor/proxy-and-server-client` (A4) + เปิด PR → `main` | ✅ อนุมัติ · push แล้ว (เจ้าของเปิด PR เพราะเครื่องไม่มี `gh`) |
| BA-2 | Merge A4 แล้วทำ A9 → B1 → B2 ตามลำดับ (push/PR/merge ทีละตัว) | ✅ อนุมัติ · **ทุก merge deploy production** ทำนอกเวลาร้านเปิด |
| A1-a | Push `ci/quality-gates` + เปิด PR → `main` (✅ อนุมัติ · push แล้ว) | CI รันครั้งแรกบน GitHub และ Vercel สร้าง Preview (โค้ดแอปเหมือน v1.0.0) |
| A1-b | Merge PR (✅ อนุมัติ) | ไม่เปลี่ยน runtime · Ignored Build Step ตั้งแล้ว (S07-08) จึงไม่ deploy production ใหม่ |
| A1-c | ตั้ง required checks ใน ruleset (เจ้าของ) | `lint`, `typecheck`, `test`, `build`, `secrets`, `pr-title` ทันที และ `audit` หลัง v1.0.1 |
