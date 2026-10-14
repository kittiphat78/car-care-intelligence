# Step 07 — Progress & Issue Log

> Step: 07 — Incremental Production Implementation · เริ่ม 2026-10-14
> กติกา: ทำทีละ feature ตาม `implementation-roadmap.md` แล้ว commit ในเครื่อง จากนั้นหยุดรออนุมัติก่อน feature ถัดไป และ push/merge/deploy ต้องได้อนุมัติแยก

## 1. Feature Status

| Feature | Branch | Commits | Tests | สถานะ |
|---|---|---|---|---|
| Phase 0: Hotfix v1.0.1 (ER-01 + Next 16.3.8) | `hotfix/1.0.1` (จาก `v1.0.0`) | `1cab952`, `e2b67ed`, `93f60ff` | 191/191 (TZ Bangkok/UTC/NY), lint 0 error, type, build ✅ | ✅ **Production** · PR #3 merge `d748ac6` (merge commit) · Vercel production deploy success 2026-10-14 19:43 · รอ H-d (tag `v1.0.1`) |
| A1: CI quality gates | `ci/quality-gates` (จาก `main` = `v1.0.0`) | `e820660` | จำลองทุก job ในเครื่อง ✅ (§2) | ✅ เสร็จในเครื่อง · รออนุมัติ push + PR |
| A2: Ignored Build Step | — (ตั้งใน Vercel โดยเจ้าของ) | — | commit docs-only ถูกข้าม build ✅ | ✅ (S07-08) |
| A4: proxy + server client | `refactor/proxy-and-server-client` (จาก `main` `d748ac6`) | `9ca9719` | 215/215 · `next start` ในเครื่อง: `/`,`/history`,`/add` → 307 `/login` ✅ | ✅ เสร็จในเครื่อง · ไม่ push |
| A9: error reporting | `chore/error-reporting` (ต่อจาก A4) | `e5f8b61` | 223/223 · endpoint ในเครื่อง: ไม่มี session 401, origin อื่น 403 ✅ | ✅ เสร็จในเครื่อง · ไม่ push |
| B1: เวลาไทย | `refactor/time-bangkok` (ต่อจาก A9) | `e008638` | 268/268 ทั้ง TZ Bangkok และ UTC · test ใหม่ fail กับโค้ดเดิมเมื่อ TZ=UTC/NY ✅ | ✅ เสร็จในเครื่อง · ไม่ push |
| B2: data-access layer | `refactor/data-access-layer` (ต่อจาก B1) | `ccb0a2e` | 304/304 ทั้ง TZ Bangkok และ UTC ✅ | ✅ เสร็จในเครื่อง · ไม่ push |
| A3, A5–A8, B3–B7, C1–C9 | — | — | — | ยังไม่เริ่ม (A3/A5–A7 รอ P-3/P-4, A8 รอ Q-12, C* รอ S06-02) |

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
| S07-01 | Incident ด้านสิทธิ์เข้าถึงฐานข้อมูล (สรุป: `docs/incidents/2026-10-14-summary.md`) แก้และยืนยันแล้ว 2026-10-14 | Critical → Mitigated | NEEDS_APPROVAL: ยืนยันแอปใช้งานได้, ยืนยัน 4 บัญชี, ตรวจ log ย้อนหลัง |
| S07-02 | Audit gate ระดับ `critical` แทน `high` ตามแผน เพราะหลัง hotfix ยังมี high 5 ตัวใน production deps (HF-01) และถ้าใช้ `high` gate จะ fail ถาวรจนถึง R1 | Medium | RESOLVED (ตัดสินใจในงาน) → ยกเป็น `high` เมื่อ HF-01 ปิด |
| S07-03 | ไม่ใส่ `engines.node` ใน `package.json` ตามแผน A1 เพราะ Vercel ใช้ค่านี้เลือก Node ตอน build ซึ่ง**เปลี่ยนพฤติกรรม production** และยังไม่รู้ Node version ปัจจุบันของ Vercel (S05-05) → CI ใช้ Node 22 [I] ไปก่อน | Low | NEEDS_APPROVAL (ต้องรู้ Node version บน Vercel) |
| S07-04 | Secret scan ใช้ grep ใน workflow แทน gitleaks action เพื่อไม่พึ่ง action ภายนอกและ license | Low | RESOLVED |
| S07-05 | `.github/` ใช้ LF แต่เครื่องตั้ง `core.autocrlf` (Windows) จึงมีคำเตือน CRLF ซึ่งไม่กระทบ GitHub Actions | Low | RESOLVED (ไม่ต้องทำ) |
| S07-06 | เจ้าของเลือกเผยแพร่เฉพาะสรุป incident (repo public) และบันทึกฉบับเต็มเก็บใน branch `local/incident-detail-2026-10-14` บนเครื่องเท่านั้น (ไม่ push) | Medium | RESOLVED |
| S07-07 | สลับ branch ทำให้ `node_modules` ต้อง `npm ci` ใหม่ทุกครั้ง (hotfix = Next 16.3.8, main = 16.2.1) และตอนนี้ `node_modules` ตรงกับ `main` | Low | — (ขั้นตอนปกติ) |
| S07-08 | ถ้ายังไม่ตั้ง Ignored Build Step ทุก commit เอกสารหรือ CI จะ build และ deploy ใหม่ → เจ้าของตั้ง Custom `git diff --quiet HEAD^ HEAD -- . ':(exclude)docs' ':(exclude).github'` แล้ว 2026-10-14 | Low | RESOLVED (ยืนยันจาก commit เอกสารถัดไปที่ถูกข้าม build) |
| S07-09 | A4 ตามแผนรวม "`next` param" (กลับไปหน้าเดิมหลัง login) แต่เป็นพฤติกรรม Authentication ใหม่ จึง**ไม่ทำ**ในรอบนี้ | Low | NEEDS_APPROVAL |
| S07-10 | `proxy.ts` ของ Next 16 รันบน Node runtime (middleware เดิมเป็น Edge) [I จากเอกสาร Next 16] | Low | RESOLVED (architecture §8 เลือก Node อยู่แล้ว) |
| S07-11 | Vercel Hobby เก็บ runtime log สั้น [I ~1 ชั่วโมง] และไม่มี alert ดังนั้น A9 ช่วยตอนตรวจย้อนหลังได้จำกัด | Medium | UNRESOLVED (ADR-11: ทบทวนหลัง 1 เดือน / Sentry ต้องอนุมัติ) |
| S07-12 | B2 ยังไม่ย้ายการเรียก Auth (login, `getUser`, `signOut`) และ realtime channel เพราะเป็นงาน Authentication (`features/auth`, Phase C) และ B3 | Low | — (ตามแผน) |
| S07-13 | ถ้านับลำดับรายการของวัน (`seq_number`) ไม่สำเร็จ จะเริ่มที่ 1 เหมือนเดิม และลำดับซ้ำยังไม่แก้ | Low | — (แก้ถาวรใน B6) |
| S07-14 | ทดสอบเส้นทางบันทึก/แก้/ลบจริงบน Preview ไม่ได้ เพราะ Preview ใช้ production DB ทำให้ unit test ใช้ mock | Medium | BLOCKED (P-3/P-4 staging) |
| S07-15 | `fetchAllPages` ใช้ offset pagination ซึ่งถ้ามีการบันทึกระหว่างโหลดหลายหน้า อาจได้แถวซ้ำ 1 แถว [I] (ร้านบันทึก ~3 รายการ/วัน) | Low | UNRESOLVED (แก้ด้วย RPC ใน B3) |
| S07-16 | สภาพอากาศ (`useWeather`) ยังใช้ชั่วโมงของเครื่อง | Low | — (ย้ายใน `features/weather`) |

## 4. รออนุมัติ (ต่อ feature)
| # | ขอ | ผล |
|---|---|---|
| H-d | สร้าง annotated tag `v1.0.1` บน `d748ac6` แล้ว push tag | อ้างอิง rollback ได้ ไม่กระทบ production |
| BA-1 | Push `refactor/proxy-and-server-client` (A4) + เปิด PR → `main` | Vercel สร้าง Preview (ใช้ production DB: เปิดดูได้ ห้ามบันทึก) |
| BA-2 | Merge A4 แล้วทำ A9 → B1 → B2 ตามลำดับ (push/PR/merge ทีละตัว) | **ทุก merge deploy production** (แตะโค้ดแอป) ทำนอกเวลาร้านเปิด |
| A1-a | Push `ci/quality-gates` + เปิด PR → `main` | CI รันครั้งแรกบน GitHub และ Vercel สร้าง Preview (โค้ดแอปเหมือน v1.0.0) |
| A1-b | Merge PR | ไม่เปลี่ยน runtime · Ignored Build Step ตั้งแล้ว (S07-08) จึงไม่ deploy production ใหม่ |
| A1-c | ตั้ง required checks ใน ruleset (เจ้าของ) | `lint`, `typecheck`, `test`, `build`, `secrets`, `pr-title` ทันที และ `audit` หลัง v1.0.1 |
