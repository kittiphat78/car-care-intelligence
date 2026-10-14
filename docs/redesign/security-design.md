# Security Design — Step 05

> วันที่: 2026-10-14 · ครอบคลุม master prompt §G: unauthorized access, broken access control, XSS, SQL injection, CSRF, secret leakage, Supabase RLS/Auth/Data isolation
> สถานะปัจจุบันของ RLS/Auth ใน production = **Unknown** (ER-12, ER-13, S01-01) ดังนั้นแผนนี้ใช้ได้ไม่ว่าผลตรวจจะออกมาอย่างไร

## 1. Threat Model (ระบบร้านเดียว ผู้ใช้ไม่กี่คน)

| # | ภัย | ทางเข้า | ผลกระทบ | การป้องกัน | Residual |
|---|---|---|---|---|---|
| T1 | คนนอกอ่าน/แก้/ลบข้อมูลร้าน | anon key (สาธารณะ) + PostgREST ตรง | ข้อมูลรั่ว, ข้อมูลเงินถูกแก้ | RLS + revoke anon (M002) | ต่ำ |
| T2 | คนนอกสมัครบัญชีเอง | Auth sign-up API | ได้สิทธิ์ authenticated | ปิด sign-up + **`app_members` allowlist** (ADR-04) ทำให้แม้หลุดก็ไม่เห็นข้อมูล | ต่ำ |
| T3 | ผู้ใช้ภายในปลอมว่าใครสร้าง/แก้ | ส่ง audit fields เอง | audit ไม่น่าเชื่อถือ | trigger (M005) | ต่ำ |
| T4 | ข้ามการ validate ฝั่ง client | เรียก PostgREST ตรง | ข้อมูลผิด (ราคาติดลบ, ทะเบียนว่าง) | DB constraints (M008/M010) | ต่ำ |
| T5 | XSS ผ่านข้อความที่ผู้ใช้กรอก | ชื่อลูกค้า, หมายเหตุ, ทะเบียน | ขโมย session | React escaping, ห้าม `dangerouslySetInnerHTML` กับข้อมูล และ CSP | ต่ำ |
| T6 | Formula injection ใน Excel | ข้อความขึ้นต้น `=`, `+`, `-`, `@` | สูตรทำงานเมื่อเปิดไฟล์ | เขียนเป็นค่า string ด้วย exceljs (ไม่ใช่ `{ formula }`) และ prefix `'` ถ้าขึ้นต้นด้วยอักขระดังกล่าว | ต่ำ |
| T7 | Middleware/proxy bypass (Next advisories) | ER-09 | เห็น shell ของหน้า (ไม่มีข้อมูล) | upgrade Next 16.4.x + ข้อมูลผ่าน RLS เท่านั้น + server layout ตรวจซ้ำ | ต่ำ |
| T8 | Secret รั่ว | commit `.env`, service role ใน client | เข้าถึง DB เต็ม | ไม่มี service role ในแอป, `.env*` ignore, CI secret scan (Step 06) | ต่ำ |
| T9 | Preview เขียนข้อมูล production | env ผิด scope | ข้อมูลจริงเสีย | แยก staging + **guard** (§6) | ต่ำ (หลัง E-02) |
| T10 | Session ค้างบนเครื่องที่ใช้ร่วมกัน | tablet ร้าน | คนอื่นใช้บัญชี | logout ทุกหน้า (UXD-07) + ล้าง draft เมื่อ logout | กลาง (เป็นธรรมชาติของเครื่องร่วม) |
| T11 | Abuse endpoint `/api/client-errors` | spam log | ค่าใช้จ่ายหรือ log ท่วม | ต้อง login + จำกัด payload 4KB + ไม่เก็บถาวร | ต่ำ |
| T12 | Supply chain (dependency) | npm | โค้ดอันตราย | lockfile, `npm ci`, `npm audit --omit=dev` ใน CI และไม่เพิ่ม dependency โดยไม่จำเป็น | กลาง |

## 2. Authentication

| เรื่อง | การออกแบบ |
|---|---|
| วิธี | Supabase Auth email/password (คงเดิม) |
| Sign-up | **ปิด** ใน Supabase Auth settings และไม่มี UI sign-up |
| Session | cookie ผ่าน `@supabase/ssr` (`getAll/setAll`) และ refresh ใน `proxy.ts` |
| ตรวจตัวตนฝั่ง server | `supabase.auth.getUser()` (ตรวจกับ Auth server) ใน `(app)/layout.tsx` และ Route Handler ห้ามใช้ `getSession()` อย่างเดียวฝั่ง server |
| Rate limit login | ใช้ของ Supabase Auth (default) และแสดงข้อความตาม UF-AUTH-01 |
| Password policy | ตั้งใน Supabase (ขั้นต่ำ 8 ตัว †) ซึ่งเป็นการตั้งค่า Dashboard |
| Logout | `signOut()` + ล้าง draft (sessionStorage key ของ user) + redirect |
| Redirect หลัง login | `next` รับเฉพาะ path ภายใน (`/` นำหน้า, ไม่ใช่ `//`) เพื่อกัน open redirect |

## 3. Authorization
ดู `authorization-matrix.md` โดยสรุปคือ RLS ทุกตาราง, `anon` ไม่มี grant, สมาชิกผ่าน `is_app_member()` และ RPC เป็น `security invoker` (ยกเว้น `is_app_member` ที่เป็น definer + `search_path = ''`)

## 4. Data Isolation
ระบบเป็น **ร้านเดียว ข้อมูลใช้ร่วมกัน** [V] (ไม่มี filter ต่อ user ในโค้ดเดิม และ D-01) จึงไม่มี multi-tenant isolation ใน MVP ถ้าอนาคตมีหลายสาขา ต้องเพิ่ม `shop_id` + policy ต่อสาขา (นอก scope)

## 5. Input, Output & Injection

| ภัย | การป้องกัน |
|---|---|
| SQL injection | ไม่มี raw SQL จาก client เพราะทุกอย่างผ่าน PostgREST/RPC ที่ parameterized และ RPC เขียนด้วย SQL แบบ static (ไม่มี `execute format(...)` จาก input) |
| XSS | React escaping · ห้าม `dangerouslySetInnerHTML` ยกเว้น theme script คงที่ใน `layout.tsx` (lint rule) · เลิก sanitize ตอนบันทึก (ER-08) เพราะทำให้ข้อมูลเพี้ยนโดยไม่เพิ่มความปลอดภัยเมื่อ render ด้วย React |
| CSV/Excel injection | T6 |
| PDF | jsPDF วาดเป็น text จึงไม่มี HTML |
| Validation | Zod (UX) + DB constraints (truth) |
| ขนาด input | จำกัดที่ฟอร์มและ constraint (§ database-schema) |

## 6. Environment Separation Guard (ADR-12)

ป้องกัน T9 แม้มีคนตั้ง env ผิด:
1. `lib/env.ts` อ่าน `NEXT_PUBLIC_APP_ENV` (`production` | `preview` | `development`) และ `NEXT_PUBLIC_SUPABASE_URL`
2. Server-only `PRODUCTION_SUPABASE_PROJECT_REF` (ไม่ใช่ secret เพราะเป็นแค่ ref) ตั้งไว้ **ทุก** scope
3. ถ้า `APP_ENV !== 'production'` และ URL มี production ref ให้ **build fail** (ตรวจใน `next.config.ts` ตอน build) และ runtime แสดงหน้า error "ตั้งค่า environment ผิด" (AC-36-2)
4. ถ้า `VERCEL_ENV === 'production'` แต่ `APP_ENV !== 'production'` ให้ build fail เช่นกัน
5. Non-production แสดง StatusBar `env` ทุกหน้า (A-08)

## 7. Secrets

| Secret | อยู่ที่ไหน | ห้าม |
|---|---|---|
| Supabase anon/publishable key | Vercel env (public โดยธรรมชาติ) | — |
| Supabase service role key | **ไม่ใช้ในแอป** และอยู่เฉพาะ Supabase Dashboard ของผู้ดูแล | ห้ามใส่ Vercel, GitHub Actions ของแอป และห้ามขึ้นต้นด้วย `NEXT_PUBLIC_` |
| DB password / access token (สำหรับ migration ใน CI) | GitHub Actions secrets (environment `staging`, `production` แยก + required reviewers) | ห้ามอยู่ใน repo |
| `GEMINI_API_KEY` | ลบเมื่อ Q-12 อนุมัติ | — |

CI: secret scanning (GitHub push protection ถ้าเปิดได้ [U] plan) + grep pattern ใน workflow (Step 06)

## 8. HTTP Security Headers (ปรับจาก `next.config.ts`)

| Header | ปัจจุบัน [V] | Target |
|---|---|---|
| CSP `script-src` | `'self' 'unsafe-inline' 'unsafe-eval'` | ตัด `'unsafe-eval'` ใน production (ER-15) และใช้ nonce หรือ hash สำหรับ theme script ถ้าทำได้กับ Next 16 (ไม่งั้นคง `'unsafe-inline'` + บันทึกเหตุผล) |
| CSP `connect-src` | มี `generativelanguage.googleapis.com` | ลบ (Q-12) |
| `X-Frame-Options` / `frame-ancestors` | SAMEORIGIN / `'none'` | คง `frame-ancestors 'none'` และเลิก `X-XSS-Protection` (deprecated) |
| HSTS, nosniff, Referrer-Policy, Permissions-Policy | มี | คงเดิม |

## 9. CSRF
- ข้อมูลธุรกิจไปที่ Supabase ด้วย `Authorization: Bearer` (ไม่ใช่ cookie ของโดเมนแอป) จึงไม่เสี่ยง CSRF แบบ cookie
- Route Handler `/api/client-errors` ใช้ cookie session: รับเฉพาะ `POST` + `Content-Type: application/json` (ทำให้ form ข้ามโดเมนส่งแบบ simple request ไม่ได้) และตรวจ `Origin` ต้องตรงกับ host
- ไม่ใช้ Server Actions ใน MVP แต่ถ้าใช้ภายหลัง Next มีการตรวจ Origin ในตัว

## 10. Security Testing (Step 08)
RLS test suite (`database-migration-plan.md` §4.3), `npm audit --omit=dev` = 0 critical/high ที่เข้าเงื่อนไข, secret scan, ตรวจ header ด้วย curl บน Preview, XSS payload ใน AC-13-2 และ open-redirect test ของ `next`
