# Testing Guide

> Step 12 · 2026-10-20 · ป้าย: **[V]** Verified · **[I]** Inferred · **[U]** Unknown
> แผนและเกณฑ์เดิม: `test-plan.md`, `ci-quality-gates.md` · ผลล่าสุด: `preview-test-results.md` (Step 10), `smoke-test-results.md` (Step 11)
> **ห้ามทดสอบด้วยการเขียนข้อมูลลง production** · test อัตโนมัติทุกชุดใช้ Supabase ในเครื่องหรือ staging เท่านั้น

## 1. ชั้นของการทดสอบ

| ชั้น | เครื่องมือ | อยู่ที่ | ฐานข้อมูล | ใน CI | จำนวน (v2.1.0) |
|---|---|---|---|---|---|
| Unit / component | Vitest 4 + Testing Library + jsdom | `**/__tests__/*.test.ts(x)` | mock (ไม่ต่อฐานข้อมูล) | `test` | 404 ใน 32 ไฟล์ [V] |
| SQL | `psql` + `DO $$ … assert … $$` | `supabase/tests/*.test.sql` | Postgres ในเครื่อง/CI | `db` | 5 ไฟล์ [V] |
| Rollback | `psql` รัน down script ทุกไฟล์ (ใหม่→เก่า) | `supabase/rollback/*.down.sql` | Postgres ในเครื่อง/CI | `db` | 9 ไฟล์ [V] |
| E2E + a11y | Playwright 1.63 + axe-core 4.13 | `e2e/*.spec.ts` | **Supabase ในเครื่อง** (migrations + seed) | `e2e` | 55 ผ่าน รวมมือถือ (Pixel 7) และ PC (1440 px) Chromium · ข้าม 9 ที่ตั้งใจรันแค่ project เดียว [V] |
| E2E WebKit (Safari) | Playwright WebKit | ชุดเดียวกับข้างบน + config ชั่วคราว (§4.3) | Supabase ในเครื่อง | ❌ รันเอง | 44 ผ่าน / 11 ล้ม บน rc.4 (`preview-test-results.md` §3) |
| Preview / RC | Playwright | `e2e-preview/` | **staging** ผ่าน Vercel Preview | ❌ รันเอง | มือถือ 3/3 · PC 6/6 · iPhone 3/3 บน rc.4 [V] |
| Smoke production | สคริปต์อ่านอย่างเดียว + เจ้าของ login ตรวจ | `smoke-test-results.md` | production (อ่านอย่างเดียว) | ❌ | ทำทุก release |
| Performance | Lighthouse 13 (lab, จำกัด CPU/เน็ต) | `performance-audit.md` | — | ❌ | ตอน audit |

ตัวเลขบน `develop` ปัจจุบัน (รวม D-08, PR #51): unit 407 · E2E 57 ผ่าน (ข้าม 9) · WebKit 54 ผ่าน / 3 ล้ม [V ในเครื่อง · unit และ E2E รันซ้ำบน clone ใหม่ 2026-10-20 ผ่าน]

## 2. Unit / component

```bash
npm test                                    # ทั้งหมด
npx vitest run features/records             # เฉพาะโฟลเดอร์
npx vitest run -t "D-08"                    # เฉพาะชื่อที่ตรง
```

- เขตเวลาของ test ถูกตั้งเป็น `Asia/Bangkok` ใน `vitest.config.mts` · test ที่ต้องการเขตอื่นตั้ง `TZ` เอง
- mock Supabase และ `next/navigation` ด้วย `vi.mock` (ดู `features/records/__tests__/record-editor.test.tsx`)
- ทดสอบพฤติกรรมก่อนหน้าพร้อม (hydration): สร้าง HTML ด้วย `renderToString` แล้ว `render(ui, { container, hydrate: true })` (ดู describe "text typed before the page is ready (D-08)" ในไฟล์เดียวกัน)

## 3. SQL tests และ rollback

CI ทำแบบนี้ (`.github/workflows/ci.yml` job `db`): start Postgres → migrations + seed → `ci_fixtures.sql` → ทุก `*.test.sql` → ทุก down script

ในเครื่อง (Supabase เปิดอยู่แล้ว · ใช้ `psql` ใน container จึงไม่ต้องติดตั้ง psql):

```bash
DB=supabase_db_car-care-intelligence       # ชื่อ container (docker ps)
docker exec -i $DB psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/ci_fixtures.sql
for f in supabase/tests/*.test.sql; do echo "$f"; docker exec -i $DB psql -U postgres -v ON_ERROR_STOP=1 -q < "$f"; done
```

ทดสอบ down script (จะ**ลบ** object ของ migration ในฐานข้อมูลในเครื่อง · ทำเสร็จแล้วต้อง reset):

```bash
for f in $(ls supabase/rollback/*.down.sql | sort -r); do echo "$f"; docker exec -i $DB psql -U postgres -v ON_ERROR_STOP=1 -q < "$f"; done
supabase db reset                          # ใส่ migrations + seed กลับ
```

## 4. E2E (Playwright)

### 4.1 เตรียม

1. Supabase ในเครื่องเปิดอยู่ (`development-guide.md` §3)
2. ติดตั้ง browser: `npx playwright install chromium`
3. ตั้งตัวแปรจาก `supabase status -o env` (bash):

```bash
eval "$(supabase status -o env | sed -n 's/^\(API_URL\|ANON_KEY\|SERVICE_ROLE_KEY\)=/E2E_\1=/p' | sed 's/^E2E_API_URL=/E2E_SUPABASE_URL=/')"
export E2E_SUPABASE_URL E2E_ANON_KEY E2E_SERVICE_ROLE_KEY
export NEXT_PUBLIC_SUPABASE_URL=$E2E_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY=$E2E_ANON_KEY
```

### 4.2 รัน

```bash
npm run build                               # build ด้วยค่าข้างบน (test ใช้ next start ที่ port 3100)
npm run test:e2e                            # มือถือ + PC
npx playwright test --project=desktop -g "CUJ-3"     # เฉพาะบางข้อ
npx playwright test --output test-results/run-1      # แยกโฟลเดอร์ผลต่อรอบ ไม่ให้ทับกัน
npx playwright show-report                  # ดูรายงาน
```

- `e2e/global-setup.ts` สร้างบัญชี 3 บัญชี (สมาชิก, ไม่ใช่สมาชิก, บัญชีสำหรับทดสอบออกจากระบบ) และ**ปฏิเสธถ้า URL ไม่ใช่ localhost** [V]
- `playwright.config.ts` ใช้ `next start` เดิมถ้ามีอยู่แล้วที่ port 3100 (นอก CI) · หลัง build ใหม่ให้ปิดตัวเก่าก่อน
- ชุด test: `cuj.spec.ts` (CUJ-1..8), `security.spec.ts` (RLS 3 บัญชี, headers, CSP, D-07), `regression.spec.ts` (ฟีเจอร์ v1, D-11), `ui-quality.spec.ts` (axe WCAG 2.2 + Label in Name, 320 px, ธีมสว่าง, focus), `logout.spec.ts` (ออกจากระบบ 2 เครื่อง)

### 4.3 WebKit (เครื่องยนต์ของ Safari)

ไม่มีใน CI · ใช้ก่อน release เพื่อจับปัญหาที่เกิดก่อนหน้าพร้อม (WebKit ช้ากว่า Chromium) · สร้างไฟล์ชั่วคราว **ไม่ commit**:

```ts
// playwright.webkit.config.ts
import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config'
export default defineConfig({
  ...base,
  projects: [
    { name: 'phone', use: { ...devices['iPhone 13'] } },
    { name: 'desktop', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
  ],
})
```

```bash
npx playwright install webkit
npx playwright test -c playwright.webkit.config.ts
```

ล้มที่รู้อยู่แล้ว (ไม่ใช่ defect): skip link 2 ข้อ (WebKit ไม่ Tab ไปที่ลิงก์ เหมือน Safari) และ contrast ของปุ่มบันทึกตอนยังกดไม่ได้ 1 ข้อ (WCAG ยกเว้นปุ่มที่ใช้ไม่ได้) · ล้มจาก D-08 อีก 8 ข้อหายไปตั้งแต่ PR #51

### 4.4 เขียน E2E ใหม่

- หา element ด้วย role และชื่อภาษาไทยที่ผู้ใช้เห็น (`getByRole('button', { name: 'บันทึก', exact: true })`, `getByLabel(/^ป้ายทะเบียน/)`)
- ข้อมูลที่สร้างต้องไม่ชนกับ test อื่น: ใช้ `uniquePlate(info, '<tag>')` (`e2e/helpers.ts`) หรือแถวจาก seed (ทะเบียนขึ้นต้น "ทดสอบ")
- seed มีราว 3 รายการต่อวัน บางวันจึงไม่มีรายการ "วันนี้" อย่าเขียน test ที่พึ่งรายการวันนี้จาก seed
- ทดสอบสถานะก่อนหน้าพร้อม: กัน `/_next/static/chunks/*.js` ด้วย `page.route` แล้วปล่อยทีหลัง (ดู test D-07 ใน `security.spec.ts`)
- test ของบั๊กต้อง**ล้มกับโค้ดเดิม**ก่อน แล้วผ่านกับโค้ดที่แก้ (บันทึกผลใน PR)

## 5. Preview / Release Candidate (`e2e-preview/`)

ใช้ตรวจ RC บน Vercel Preview + ฐานข้อมูล staging ก่อน release (`git-workflow.md` §4)

```bash
# .env.preview (ในเครื่อง ไม่ commit) มีบรรทัด PREVIEW_BYPASS=<secret>
export PREVIEW_BYPASS=$(sed -n 's/^PREVIEW_BYPASS=//p' .env.preview | tr -d '\r\n ')
export PREVIEW_URL=https://<deployment>.vercel.app
export STAGING_EMAIL=<บัญชีทดสอบ staging> STAGING_PASSWORD=<รหัส>
npx playwright test -c e2e-preview/playwright.config.ts                 # มือถือ, PC, iPhone
npx playwright test -c e2e-preview/playwright.config.ts --project=desktop -g "clean up"   # ลบข้อมูลทดสอบที่ค้าง
```

กันพลาด [V]:
- ปฏิเสธถ้า `PREVIEW_URL` เป็นโดเมน production หรือไม่ใช่ `*.vercel.app`
- ทุก test ตรวจว่า request ไปฐานข้อมูล staging และ**ไม่มี**ไป production
- ข้อมูลที่สร้างมีป้าย `RCP`/`RCD`/`RCI` + ตัวเลข และถูกลบในตัว test · test "clean up" ลบที่ค้างจากรอบที่ล้ม
- เข้าผ่าน bypass cookie ของ Vercel (ครั้งเดียวต่อ browser context) ไม่ส่ง header ไปทุก request (เคยทำให้ CORS ของบริการอากาศล้ม)

ข้อความใน console ที่ไม่นับเป็นข้อผิดพลาด: Vercel Toolbar (`vercel.live`), `interactive-widget` บน iPhone, `… due to access control checks` บน WebKit, WebSocket realtime · บางครั้ง `api.open-meteo.com` ตอบ 503 ทำให้ test ล้ม: รันซ้ำ

## 6. CI (GitHub Actions)

| Job | ทำอะไร | Required บน `main` |
|---|---|---|
| `lint` | ESLint | ✅ |
| `typecheck` | `tsc --noEmit` | ✅ |
| `test` | Vitest | ✅ |
| `build` | `next build` ด้วยค่า placeholder | ✅ |
| `audit` | `npm audit --omit=dev` ไม่มี High/Critical | ✅ |
| `secrets` | ไม่มีไฟล์ `.env*` และไม่มีค่าหน้าตาเหมือน key | ✅ |
| `db` | migrations + seed + SQL tests + down scripts | ✅ |
| `e2e` | Supabase ในเครื่อง runner + build + ตรวจ bundle ไม่มี server key + Playwright Chromium | ✅ |
| `pr-title` | PR title ตาม Conventional Commits (workflow แยก) | ✅ |

CI รันเมื่อ push `main`, `develop`, `release/**` และทุก PR · ruleset ของ `main` บังคับทุก job ข้างบน [V] · `develop` ยังไม่มี ruleset [V] (แนะนำให้ตั้ง)
ถ้า CI ค้าง `queued` นาน ๆ ให้ดู githubstatus.com และ repo ใหญ่อื่น ก่อนสงสัยโค้ด (เคยเกิด 2026-10-19, S11-02) · ห้ามข้าม ruleset

## 7. ก่อน release ต้องผ่านอะไร

`release-checklist.md` §2 · สรุป: CI ครบ · unit + E2E Chromium ผ่าน · WebKit ไม่มีล้มใหม่ · `e2e-preview` ผ่านบน RC · axe ไม่มี serious/critical · smoke production หลัง deploy (อ่านอย่างเดียว + เจ้าของ login ตรวจ)
