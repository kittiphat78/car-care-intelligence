# CI Quality Gates — Step 06

> วันที่: 2026-10-14 · **ยังไม่มี CI ใน repo** [V] (`.github/` ไม่มี) · workflow ด้านล่างเป็นแบบร่างที่จะสร้างใน R0 (Step 07) **ยังไม่ได้ commit เป็นไฟล์จริง**
> ใช้แค่ GitHub Actions + เครื่องมือที่มีใน repo และไม่เพิ่ม npm dependency (ADR-14)

## 1. Gates

| Gate | Job | คำสั่ง | Block merge? | ใช้กับ | ผล baseline ที่ `7f58eec` |
|---|---|---|---|---|---|
| G-LINT | `lint` | `npm run lint` | ✅ | ทุก PR | PASS [V] |
| G-TYPE | `typecheck` | `npm run type-check` | ✅ | ทุก PR | PASS [V] |
| G-TEST | `test` | `npm run test` (Vitest) | ✅ | ทุก PR | PASS 146/146 [V] |
| G-BUILD | `build` | `npm run build` ด้วย env placeholder | ✅ | ทุก PR | ดู §4 |
| G-AUDIT | `audit` | `npm audit --omit=dev --audit-level=high` | ✅ (main, release) / ⚠ warn (feature) | ทุก PR | **FAIL** (`next` 16.2.1, ER-09) จึงต้องแก้ใน PR แรก |
| G-SECRETS | `secrets` | gitleaks (GitHub Action, ไม่ใช่ npm) หรือ grep pattern ถ้าไม่อนุญาต action ภายนอก | ✅ | ทุก PR | 0 hit ใน docs [V] (ทั้ง repo ยังไม่ได้ scan → R0) |
| G-PRTITLE | `pr-title` | regex (`commit-conventions.md` §7) | ✅ | ทุก PR | — |
| G-DB | `db` | Supabase CLI: start local stack → apply migrations → run `supabase/tests/*.sql` → apply down แล้ว up อีกรอบ | ✅ | PR ที่แตะ `supabase/**` | ยังไม่มี migration |
| G-TYPES-SYNC | `db-types` | `supabase gen types` แล้ว diff กับ `types/database.ts` | ✅ | PR ที่แตะ `supabase/**` | — |
| G-PREVIEW | (Vercel) | Vercel Preview deployment สำเร็จ | ✅ | ทุก PR | — |
| G-E2E | `e2e` | (Step 08 เลือกเครื่องมือ) CUJ-1..8 บน Preview + staging | ✅ release, ⚠ feature | release PR | — |
| G-A11Y | `a11y` | axe บนหน้าหลัก (Step 08) | ✅ release | release PR | NOT RUN (S03-01) |
| G-SIZE | `bundle` | รายงานขนาด First Load JS จาก build output (เตือนถ้าโต > 10%) | ⚠ warn | ทุก PR | — |

**Manual gates (ไม่ใช่ CI):** release approval โดยเจ้าของ (Q-20) · regression checklist · migration gate G1–G8 (`database-migration-plan.md` §5)

## 2. Workflow ร่าง: `.github/workflows/ci.yml`

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main, develop, 'release/**']
permissions:
  contents: read
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
env:
  # placeholders — ไม่ใช่ค่าจริง และ build ไม่ต่อ Supabase (ตรวจแล้ว §4)
  NEXT_PUBLIC_APP_ENV: development
  NEXT_PUBLIC_SUPABASE_URL: https://ci-placeholder.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ci-placeholder-anon-key-not-real
  PRODUCTION_SUPABASE_PROJECT_REF: ci-production-ref-not-real
jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4            # pin เป็น commit SHA ตอนสร้างจริง (S06-04)
      - uses: actions/setup-node@v4
        with: { node-version-file: package.json, cache: npm }   # อ่าน engines.node (S05-05)
      - run: npm ci
      - name: lint
        run: npm run lint
      - name: typecheck
        run: npm run type-check
      - name: test
        run: npm run test
      - name: build
        run: npm run build
      - name: audit (production deps)
        run: npm audit --omit=dev --audit-level=high
        continue-on-error: ${{ github.event_name == 'pull_request' && !startsWith(github.base_ref, 'main') && !startsWith(github.head_ref, 'release/') }}

  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2    # ถ้าไม่อนุญาต action ภายนอก ให้แทนด้วย grep ใน §3
        env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }

  pr-title:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - env: { TITLE: ${{ github.event.pull_request.title }} }
        run: |
          echo "$TITLE" | grep -Eq '^(feat|fix|perf|refactor|style|test|docs|build|ci|chore|db|revert)(\([a-z0-9-]+\))?!?: .{1,72}$' \
            || { echo "PR title ต้องเป็น Conventional Commit"; exit 1; }

  db:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - id: changed
        run: |
          git fetch origin ${{ github.base_ref }} --depth=1
          git diff --quiet FETCH_HEAD -- supabase/ && echo "db=false" >> $GITHUB_OUTPUT || echo "db=true" >> $GITHUB_OUTPUT
      - if: steps.changed.outputs.db == 'true'
        uses: supabase/setup-cli@v1
      - if: steps.changed.outputs.db == 'true'
        run: |
          supabase start -x studio,imgproxy,inbucket,edge-runtime,logflare,vector
          supabase db reset                     # apply ทุก migration + seed (ข้อมูลสมมติ)
          for f in supabase/tests/*.sql; do supabase db query --file "$f" || exit 1; done   # คำสั่งตรวจจริงยืนยันใน R0 (S06-05)
          supabase gen types typescript --local > /tmp/database.ts
          diff -u types/database.ts /tmp/database.ts
```

> `db` job รันกับ Postgres ใน container ของ runner เท่านั้น ไม่ต่อ staging หรือ production และไม่ใช้ secret

## 3. Secret scan สำรอง (ถ้าไม่ใช้ gitleaks)
```bash
! git grep -nE 'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|service_role|sk_live_|AIza[0-9A-Za-z_-]{35}|-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----' -- . ':(exclude)package-lock.json' ':(exclude)docs/redesign/*'
```
(ยกเว้น docs เพราะมีชื่อ pattern อธิบายไว้ และ docs ถูก scan แยกด้วย pattern ค่าจริงแบบ JWT เต็ม)

## 4. ตรวจว่า build ใน CI ทำได้โดยไม่มี secret จริง
รัน `npm run build` ในเครื่องด้วย `NEXT_PUBLIC_SUPABASE_URL=https://ci-placeholder.supabase.co` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY=ci-placeholder-anon-key-not-real` (env ของ process ชนะ `.env.local` ตามกติกาของ Next.js) → ผลบันทึกใน `step-06-issues.md` S06-06
ข้อควรระวัง: build ดึงฟอนต์ Sarabun จาก Google Fonts ผ่าน `next/font/google` จึงต้องมีอินเทอร์เน็ต ซึ่ง GitHub runner มี

## 5. DB Deploy Workflow (แยกจาก CI): `.github/workflows/db-deploy.yml` (ร่าง)

| Trigger | Environment | ขั้นตอน |
|---|---|---|
| push `develop` / `release/**` ที่แตะ `supabase/migrations/**` | `staging` (อัตโนมัติ) | `supabase link --project-ref $REF` → `supabase db push --dry-run` (log) → `supabase db push` → รัน verification SQL |
| `workflow_dispatch` (input: tag `v*`) | `production` (**required reviewer = เจ้าของ**) | ตรวจว่า tag มีอยู่และอยู่บน `main` → ตรวจ backup ล่าสุด (manual confirm input) → `db push --dry-run` แนบใน summary → อนุมัติ → `db push` → verification |

ห้ามรัน production DB push อัตโนมัติจาก push event

## 6. Definition: "CI ผ่าน"
ทุก job ที่ block เป็นสีเขียวบน **commit ล่าสุด** ของ PR และ Vercel Preview สำเร็จ โดย job ที่ `continue-on-error` (audit บน feature) ต้องถูกอ่านและบันทึกใน PR ห้ามปิด lint, type, test หรือ audit เพื่อให้ผ่าน (master prompt §F)
