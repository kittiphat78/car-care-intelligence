# Step 08 — Security Review

> 2026-10-18 · ขอบเขต: v2.0.0 + branch `qa/step-08` · ป้ายหลักฐาน: [V] Verified · [I] Inferred · [U] Unknown
> หลักการ: "ผ่าน" หมายถึงลองโจมตี/ลองทำสิ่งที่ไม่ควรทำได้แล้ว **ถูกปฏิเสธจริง** และตรวจว่าข้อมูลไม่เปลี่ยน ไม่ใช่แค่ "ไม่มี error"
> ทุกการทดสอบที่เขียนข้อมูลทำบน Supabase ในเครื่องเท่านั้น · production ตรวจแบบอ่านอย่างเดียว

## 1. สรุป

| หัวข้อ | ผล | หลักฐาน |
|---|---|---|
| RLS: คนไม่ login (anon key) | **Passed** | ทุกตารางได้ 42501, insert และ RPC ทั้ง 4 ตัวถูกปฏิเสธ [V] |
| RLS: login แล้วแต่ไม่ใช่สมาชิกร้าน | **Passed** | อ่านได้ `[]`, insert 403/42501, update/delete กระทบ 0 แถว, RPC คืน 0/ว่าง, เคลียร์ยอด 0 รายการ, เพิ่มตัวเองเป็นสมาชิกไม่ได้, แถวเป้าหมายราคาเท่าเดิม [V] |
| RLS: สมาชิก ข้ามแอปไปเรียกฐานข้อมูลตรง | **Passed** | กฎข้อมูลยังบังคับ (23514) และปลอมชื่อผู้บันทึก/เลขลำดับไม่ได้ [V] |
| หน้าที่ต้อง login | **Passed** | 5 หน้าส่งไป `/login?next=` (ในเครื่อง) · production `/` และ `/history` → 307 ไป login [V] |
| Open redirect | **Passed** | `next=https://evil.example/` ถูกเมิน กลับ `/` ของแอป [V] |
| Secrets ใน client bundle | **Passed** | ไม่พบ service role key, `sb_secret_`, `service_role`, project ref ของ production/staging หรืออีเมลเจ้าของ ใน `.next/static` 48 ไฟล์ · พบเฉพาะ anon key (ตั้งใจให้เป็น public) [V] |
| Secrets ใน git | **Passed** | ไฟล์ env ที่ track มีแค่ `.env.example` (ค่าว่าง) · CI `secrets` ตรวจ JWT/คีย์ทุก PR · history ไม่มี `sb_secret_` [V] |
| Service role ในโค้ดแอป | **Passed** | แอปไม่ใช้ service role เลย (มีแค่ใน E2E setup ที่บังคับ localhost และใน CI) [V] |
| Security headers | **Passed** (มีข้อสังเกต) | ครบทั้งในเครื่องและ production · production v2.0.0 ยังมี `'unsafe-eval'` → ตัดแล้วใน `fix/csp-no-unsafe-eval` (D-05) [V] |
| `/api/client-errors` | **Passed** | ไม่มี session → 401 (ในเครื่องและ production), origin อื่น → 403, body เกิน 4KB → 413 (unit) [V] |
| Dependency | **Passed ตามเกณฑ์ CI** (ไม่มี Critical ใน production deps) · มี High ที่ประเมินแล้วว่าไม่ถึงได้ (D-04) | §5 |
| XSS | **Passed** (ตรวจโค้ด) | React escape ทุกข้อความ · `dangerouslySetInnerHTML` มีที่เดียวคือ theme script ค่าคงที่ (`app/layout.tsx:57-81`) [V] · Excel กันสูตร (unit) [V] |

## 2. RLS และการแยกผู้ใช้ (ADR-04)

ทดสอบด้วยการเรียก PostgREST/Supabase Auth ตรง (`e2e/security.spec.ts`) เหมือนคนที่มี anon key จากหน้าเว็บ:

| ผู้เรียก | การกระทำ | ผลที่คาด | ผลจริง |
|---|---|---|---|
| anon | `GET records/expenses/app_members` | ปฏิเสธ | 401/42501 ทุกตาราง ✅ |
| anon | `POST records` | ปฏิเสธ | ≥400 ✅ |
| anon | `rpc dashboard_today, daily_series, customer_breakdown, settle_records` | ปฏิเสธ | ≥400 ทุกตัว ✅ |
| outsider | `GET` ทุกตาราง | ว่าง ไม่บอกใบ้ | 200 `[]` ✅ |
| outsider | `GET records?id=eq.<id จริง>` | ว่าง | `[]` ✅ |
| outsider | `POST records`, `POST expenses` | ปฏิเสธ | 403 / 42501 ✅ |
| outsider | `PATCH`/`DELETE records?id=eq.<id จริง>` | ไม่กระทบ | `[]` และสมาชิกอ่านแล้วราคาเท่าเดิม ✅ |
| outsider | `rpc dashboard_today`, `daily_series` (2020→วันนี้), `customer_breakdown` | ไม่มียอด | ศูนย์ทั้งหมด / `[]` ✅ |
| outsider | `rpc settle_records([id จริง])` | ไม่เคลียร์ | `updated_count = 0` ✅ |
| outsider | `POST app_members` | ปฏิเสธ | ≥400 ✅ |
| outsider (ผ่าน UI) | เปิดหน้าภาพรวม, ค้างชำระ, ประวัติ | ไม่เห็นข้อมูลร้าน | "ยังไม่มีงานวันนี้", "ไม่มีรายการค้างชำระ", ประวัติว่าง ✅ |
| member | `POST records` ราคา -1 / ทะเบียนช่องว่าง / ทะเบียน 21 ตัว | ปฏิเสธที่ฐานข้อมูล | 400 / 23514 ✅ |
| member | `POST expenses` amount 0 | ปฏิเสธ | 400 ✅ |
| member | ส่ง `created_by_email` ของคนอื่น และ `seq_number: 999` | ฐานข้อมูลใช้ค่าจริง | อีเมลจาก session, เลขลำดับไม่ใช่ 999 ✅ |

SQL tests บน Postgres จริงอีกชั้น: `member_rls.test.sql`, `settle_records.test.sql`, `dashboard_rpcs.test.sql`, `data_rules_seq.test.sql`, `indexes_idempotency_audit.test.sql` → 5/5 PASSED [V]

**ข้อจำกัด:** ทดสอบกับ schema จาก migration ใน repo บน Supabase ในเครื่อง · production ใช้ migration ชุดเดียวกัน (Step 07: A6 ตรวจบน production แล้วว่า anon ถูกปฏิเสธทุกตาราง/ฟังก์ชัน) แต่ Step 08 **ไม่ได้** รัน test ชุดนี้กับ production [V]

## 3. Authentication

| เรื่อง | ผล | หมายเหตุ |
|---|---|---|
| Server guard ทุกหน้าใน `(app)` + proxy | Passed [V] | unit 12 + E2E |
| ข้อความ error ตอน login ไม่บอกว่าอีเมลมีอยู่หรือไม่ | Passed [V] | unit "one message for a wrong email or password" |
| Session หมดอายุ → ขอ login ใหม่และกลับหน้าเดิม | Passed (unit) · ตอนหมดจริงบนเครื่อง Not Run | S07-41 |
| ออกจากระบบ | Passed [V] | ออกเฉพาะเครื่องที่กด (D-03 ตามที่เจ้าของเลือก) · เน็ตหลุดก็ยังออกจากเครื่องนี้ (D-06) · E2E `logout.spec.ts` |
| Cookie session (`sb-…-auth-token`) | ข้อสังเกต | ในเครื่อง: `HttpOnly=false`, `SameSite=Lax`, อายุ 400 วัน [V] · เป็นค่าตั้งต้นของ `@supabase/ssr` เพราะ browser client ต้องอ่าน cookie [I] · แปลว่าถ้ามี XSS จะขโมย session ได้ จึงพึ่ง CSP และ React escape · flag `Secure` บน HTTPS ของ production ยังไม่ได้ตรวจ [U] → ตรวจใน Step 10 บน Preview |
| Rate limit ของ login | Not Run | ใช้ค่าของ Supabase Auth · ไม่ทดสอบยิงซ้ำบน production/staging |
| นโยบายรหัสผ่าน / การสมัครเอง | Not Run [U] | ตั้งใน Supabase dashboard ของเจ้าของ · คนที่สมัครเองได้ก็ยังเห็นข้อมูลไม่ได้เพราะ RLS (ทดสอบด้วยบัญชี outsider ✅) |

## 4. Headers (production, `curl -I /login` 2026-10-18) [V]

| Header | ค่า | ผล |
|---|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; … frame-ancestors 'none'; base-uri 'self'; form-action 'self'` | Passed · `'unsafe-eval'` ตัดแล้วใน `fix/csp-no-unsafe-eval` (D-05, ยังไม่ขึ้น production) และ `connect-src` อนุญาต `*.supabase.co` ทุกโปรเจกต์ (Low) |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` | Passed |
| X-Frame-Options | `SAMEORIGIN` (+ CSP `frame-ancestors 'none'`) | Passed |
| X-Content-Type-Options | `nosniff` | Passed |
| Referrer-Policy | `origin-when-cross-origin` | Passed |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Passed |
| X-Powered-By | ไม่มี | Passed |

## 5. Dependency (`npm audit`, 2026-10-18) [V]

CI ใช้ `npm audit --omit=dev --audit-level=critical` → ผ่าน (ไม่มี Critical ใน production deps)

> อัปเดต: branch `build/deps-audit` (D-04) ลด production deps เหลือ High 0 / Moderate 2 (`uuid` ที่ถึงไม่ได้) และ dev deps เหลือ Critical 0 · ตารางด้านล่างคือสถานะของ v2.0.0

production deps: High 4 / Moderate 5 · ประเมินว่าถึงได้จริงหรือไม่:

| แพ็กเกจ | ระดับ | มาจาก | ถึงได้หรือไม่ |
|---|---|---|---|
| `brace-expansion` | High | exceljs → archiver → glob | ไม่ [I] · ใช้ตอนเขียน zip แบบ stream บน Node · แอปสร้าง Excel ในเบราว์เซอร์จากข้อมูลของร้าน ไม่รับ pattern จากผู้ใช้ |
| `tmp` | High | exceljs | ไม่ [I] · ใช้เฉพาะ API อ่านไฟล์บน Node · แอปไม่อ่าน Excel |
| `ws` | High | supabase-js → realtime-js | ไม่ [I] · เบราว์เซอร์ใช้ WebSocket ของตัวเอง · ฝั่ง server ไม่เปิด realtime |
| `source-map-js` | High | next → postcss | ไม่ [I] · ใช้ตอน build ไม่รับ input จากภายนอก |
| `dompurify` | Moderate | jspdf | ไม่ [I] · ใช้ใน `jsPDF.html()` ซึ่งแอปไม่เรียก (`lib/generateBill.ts` วาดข้อความเอง) [V] |
| `fflate` | Moderate | jspdf | ไม่ [I] · ช่องโหว่อยู่ใน `unzipSync` แอปไม่แตก zip |
| `uuid` | Moderate | exceljs | ไม่ [I] · ช่องโหว่เมื่อส่ง `buf` เอง |
| `baseline-browser-mapping` | Moderate | next | ไม่ [I] · ใช้ตอน build |
| `exceljs` | Moderate | direct | ตามตัวที่พาเข้ามาด้านบน |

dev deps: Critical 2 (`vitest`, `tinypool`), High 13 · ไม่ถูกส่งไปผู้ใช้ [V] · ความเสี่ยงอยู่ที่เครื่องนักพัฒนา/CI เมื่อเปิด Vitest UI หรือ dev server กับเว็บที่ไม่น่าไว้ใจ · แนวทางใน D-04

## 6. สิ่งที่เพิ่มใน Step 08 เพื่อป้องกันซ้ำ

- `e2e/security.spec.ts`: RLS 3 บัญชี, กฎข้อมูล, audit, `/api/client-errors`, headers, redirect, open redirect, non-member ผ่าน UI — รันทุก PR ใน CI `e2e`
- CI step "No server keys in the browser bundle": build จริงแล้วตรวจว่า bundle มี anon key (เพื่อยืนยันว่าตรวจถูกที่) แต่ไม่มี service role key/ชื่อ key ฝั่ง server · ทดสอบ script ในเครื่องแล้วทั้งกรณีปกติและกรณีใส่ key ปลอมลงไป [V]

## 7. ไม่ได้ตรวจ (Not Run)

- Penetration test โดยบุคคลภายนอก, fuzzing
- RLS และ cookie บน production/staging โดยตรง (ต้องใช้บัญชีจริง · Step 10 บน Preview)
- Supabase Auth settings ของ production (สมัครเอง, รหัสผ่าน, rate limit) [U]
- Safari / Firefox
