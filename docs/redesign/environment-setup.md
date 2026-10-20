# Environment Setup

> Step 12 · 2026-10-20 · ป้าย: **[V]** Verified · **[I]** Inferred · **[U]** Unknown
> **เอกสารนี้ไม่มีค่าจริงของ key หรือรหัสผ่าน** · ทุกค่าเป็น placeholder `<...>` · ค่าจริงอยู่ใน Vercel (เจ้าของ) และ `.env.local` บนเครื่องของแต่ละคน
> ไฟล์ตัวอย่าง: `.env.example` (ที่ root) และ `docs/redesign/environment-variables.example` (มีคำอธิบายยาวกว่า)

## 1. Environment ที่มี

| | Local (เครื่อง dev) | Preview (Vercel) | Production (Vercel) |
|---|---|---|---|
| โค้ด | branch ที่ทำงานอยู่ | ทุก branch ที่ push ยกเว้น `main` | `main` เท่านั้น (deploy อัตโนมัติเมื่อ merge) [V] |
| ฐานข้อมูล | **Supabase ในเครื่อง** (Docker, แนะนำ) หรือ staging | **staging** [V] | **production** [V] |
| ข้อมูล | ข้อมูลสมมติจาก `supabase/seed.sql` | ข้อมูลสมมติ | ข้อมูลจริงของร้าน |
| บัญชี | สร้างเอง (§4) | บัญชีทดสอบของ staging (ขอจากเจ้าของ) | บัญชีจริงของคนในร้าน |
| การเข้าถึง | `http://localhost:3000` | ต้องผ่าน Vercel Authentication [V] | สาธารณะ (หน้าอื่นนอกจาก login ต้อง login) |
| แถบบอก environment (`components/patterns/StatusBar.tsx`) | "เครื่องนักพัฒนา (Development)" · ถ้าชี้ฐานข้อมูลจริงจะเตือน "กำลังใช้ฐานข้อมูลจริงของร้าน" | "ระบบทดสอบ (Preview) · ข้อมูลในหน้านี้ไม่ใช่ข้อมูลจริง" [V] | ไม่มี |

**กฎ:** Local และ Preview ห้ามชี้ฐานข้อมูล production · build จะล้มเองถ้าตั้งผิด เมื่อตั้ง `PRODUCTION_SUPABASE_PROJECT_REF` ไว้ (§3)

## 2. ตัวแปรทั้งหมด

### 2.1 ของแอป

| ตัวแปร | จำเป็น | Scope ใน Vercel | ค่า | ความลับ? |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | P = production · V, D = staging | `https://<project-ref>.supabase.co` หรือ `http://127.0.0.1:54321` (ในเครื่อง) | ไม่ (ฝังใน JS) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | คู่กับ URL ของ project เดียวกัน | publishable key (`sb_publishable_…`) หรือ anon key ของ project นั้น | ไม่ (ออกแบบให้เป็น public · ความปลอดภัยมาจาก RLS) |
| `PRODUCTION_SUPABASE_PROJECT_REF` | แนะนำ | **ค่าเดียวกันทุก scope** | `<production-project-ref>` (subdomain ของ URL production) | ไม่ |
| `NEXT_PUBLIC_APP_ENV` | ไม่ | P = `production`, V = `preview`, D = `development` | ถ้าไม่ตั้ง ใช้ `VERCEL_ENV` · ในเครื่องเป็น `development` | ไม่ |
| `NEXT_PUBLIC_WEATHER_LAT`, `NEXT_PUBLIC_WEATHER_LON` | ไม่ | ทุก scope | ค่าเริ่มต้น `19.91`, `99.84` (เชียงราย) | ไม่ |
| `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_APP_DATABASE` | **ห้ามตั้ง** | — | `next.config.ts` ใส่ให้จาก `package.json` และ env guard | — |

`lib/env.ts` ตรวจตอนเริ่มแอป: ถ้าไม่มี URL หรือ key แอปจะ throw พร้อมบอกชื่อตัวแปรที่ขาด [V]

### 2.2 ของการทดสอบ (ไม่อยู่ใน Vercel และห้าม commit)

| ตัวแปร | ใช้กับ | ค่า |
|---|---|---|
| `E2E_SUPABASE_URL`, `E2E_ANON_KEY`, `E2E_SERVICE_ROLE_KEY` | `npm run test:e2e` | จาก `supabase status -o env` ของ **Supabase ในเครื่องเท่านั้น** · `e2e/global-setup.ts` ปฏิเสธถ้า host ไม่ใช่ `127.0.0.1`/`localhost` [V] |
| `PREVIEW_URL` | `e2e-preview/` | URL ของ Preview deployment ที่จะทดสอบ |
| `PREVIEW_BYPASS` | `e2e-preview/` | Vercel "Protection Bypass for Automation" secret · เก็บในไฟล์ `.env.preview` ในเครื่อง (ถูก `.gitignore` ครอบ) [V] |
| `STAGING_EMAIL`, `STAGING_PASSWORD` | `e2e-preview/` | บัญชีทดสอบของ staging (ขอจากเจ้าของ) |

### 2.3 ห้ามมีในแอปหรือใน Vercel

| ตัวแปร | เหตุผล |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` / `sb_secret_…` ของ staging หรือ production | ข้ามทุก RLS · ใช้ได้เฉพาะผู้ดูแลใน Supabase Dashboard · CI ตรวจว่าไม่มีใน bundle [V] |
| `GEMINI_API_KEY` | ไม่มีโค้ดใช้แล้ว (`/api/insights` ถูกลบ) · ถ้ายังตั้งอยู่ใน Vercel ลบได้ [U ว่ายังตั้งอยู่หรือไม่] |

## 3. Env guard (กันชี้ฐานข้อมูลผิด)

`next.config.ts` เรียก `checkEnvironment()` (`lib/env-guard.ts`) ทุกครั้งที่ build [V]

| สถานการณ์ | ผล |
|---|---|
| ไม่ได้ตั้ง `PRODUCTION_SUPABASE_PROJECT_REF` | build ผ่าน แต่มีคำเตือน `⚠ [env-guard] … cannot check which database it uses` |
| Preview หรือ Development ชี้ project ref เดียวกับ production | **build ล้ม**: `This preview build points at the production database …` |
| Production ไม่ได้ชี้ production | **build ล้ม** |
| `NEXT_PUBLIC_APP_ENV` ไม่ตรงกับ `VERCEL_ENV` | **build ล้ม** |

## 4. ตั้งค่าเครื่อง dev

### 4.1 แบบ A: Supabase ในเครื่อง (แนะนำ ปลอดภัยที่สุด)

ต้องมี: Docker Desktop และ Supabase CLI **2.118.0** (เวอร์ชันเดียวกับ CI) · ขั้นตอนเต็มใน `development-guide.md` §3

```bash
supabase start -x realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
supabase status -o env      # ดู API_URL, ANON_KEY, SERVICE_ROLE_KEY
```

สร้างไฟล์ `.env.local` ที่ root:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY จาก supabase status>
PRODUCTION_SUPABASE_PROJECT_REF=<production-project-ref>
```

key ของ Supabase ในเครื่องเป็นค่าตายตัวของ CLI สำหรับ dev ใช้ได้เฉพาะในเครื่องตัวเอง ไม่ใช่ความลับของร้าน แต่ก็ไม่ต้อง commit

**บัญชีสำหรับ login ในเครื่อง:**

1. วิธีง่าย: รัน E2E ครั้งหนึ่ง (`testing-guide.md` §4) ซึ่งจะสร้างบัญชีสมาชิก `e2e-member@example.com` ให้ (รหัสอยู่ใน `e2e/global-setup.ts`)
2. หรือสร้างเองด้วย Admin API ของ Supabase **ในเครื่อง**:

```bash
# สร้างผู้ใช้ (ในเครื่องเท่านั้น: ใช้ SERVICE_ROLE_KEY ของ supabase status)
curl -s -X POST http://127.0.0.1:54321/auth/v1/admin/users \
  -H "apikey: <SERVICE_ROLE_KEY>" -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -H "Content-Type: application/json" \
  -d '{"email":"<you>@example.com","password":"<รหัสผ่าน>","email_confirm":true}'
# ใส่ผู้ใช้เป็นสมาชิกร้าน (ไม่งั้นจะเห็นข้อมูลว่าง)
curl -s -X POST http://127.0.0.1:54321/rest/v1/app_members \
  -H "apikey: <SERVICE_ROLE_KEY>" -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -H "Content-Type: application/json" \
  -d '{"user_id":"<id จากคำสั่งแรก>"}'
```

### 4.2 แบบ B: ชี้ staging

ใช้เมื่อต้องการข้อมูลชุดเดียวกับ Preview · ขอ URL, publishable key และบัญชีทดสอบของ staging จากเจ้าของ

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<staging-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key ของ staging>
PRODUCTION_SUPABASE_PROJECT_REF=<production-project-ref>
```

ข้อมูลบน staging ใช้ร่วมกับคนอื่นและกับ `e2e-preview/` · ข้อมูลที่สร้างเพื่อทดสอบให้ลบเองหลังใช้

**ห้าม** ใส่ URL หรือ key ของ production ใน `.env.local` · ถ้าตั้ง `PRODUCTION_SUPABASE_PROJECT_REF` ไว้ build จะล้ม แต่ `npm run dev` จะเตือนแล้วรันต่อ [I: guard อยู่ใน `next.config.ts` ซึ่ง dev อ่านด้วย ยังไม่ได้ลองกับ production ref โดยตั้งใจ]

## 5. Vercel (เจ้าของตั้ง)

| การตั้งค่า | ค่าที่ใช้อยู่ | หลักฐาน |
|---|---|---|
| Production Branch | `main` | deploy ทุกครั้งที่ merge [V] |
| Environment Variables | P = production · V = staging · D = staging [V สำหรับ P และ V จากการทดสอบ Step 10–11 · D [U]] | `preview-test-results.md` §1, `smoke-test-results.md` |
| Deployment Protection (Preview) | Vercel Authentication | Preview ตอบ 302 ไป `vercel.com/sso-api` [V] |
| Protection Bypass for Automation | มี secret 1 ค่า (ใช้กับ `e2e-preview/`) | เจ้าของสร้าง 2026-10-19 [V] |
| Ignored Build Step | commit ที่แก้แค่ `docs/` ไม่ build | `git-workflow.md` §5 [V] · ยังไม่ยกเว้น `supabase/` (S07-20) [U ปัจจุบัน] |
| Node.js Version | [U] | ยังไม่มี `engines.node` ใน `package.json` |
| Plan | Hobby | log ย้อนได้ 30 นาที ไม่มี alert [V] |

**เพิ่มหรือเปลี่ยนตัวแปร:** Vercel → Project → Settings → Environment Variables → เลือก scope ให้ถูก → Redeploy (ตัวแปร `NEXT_PUBLIC_*` ถูกฝังตอน build จึงต้อง deploy ใหม่) · ถ้าเป็น production ให้ทำตาม `deployment-guide.md` §5

## 6. GitHub Actions

CI **ไม่ใช้ secret ใด ๆ** [V]: build ใช้ค่า placeholder (`ci-placeholder.supabase.co`) และ job `db`/`e2e` ใช้ key ตายตัวของ Supabase CLI ในเครื่อง runner · ถ้าวันหน้าทำ workflow รัน migration อัตโนมัติ ให้ใช้ GitHub Environments (`staging`, `production` ที่มีผู้อนุมัติ) ตาม `branch-protection.md` §3

## 7. ถ้า key รั่ว

| Key | ทำอะไร |
|---|---|
| publishable/anon key | ไม่ใช่ความลับ ไม่ต้องทำอะไร (ความปลอดภัยมาจาก RLS) |
| service role / secret key | Supabase → Project Settings → API Keys → สร้างใหม่และยกเลิกอันเดิม · ตรวจ log ว่ามีการใช้ผิดปกติ · บันทึก incident |
| Vercel bypass secret | Vercel → Settings → Deployment Protection → ลบแล้วสร้างใหม่ · แก้ `.env.preview` |
| รหัสผ่านผู้ใช้ | เปลี่ยนรหัสผ่านบัญชีนั้น (Supabase → Authentication → Users) |
