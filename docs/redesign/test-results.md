# Step 08 — Test Results

> 2026-10-18 · branch `qa/step-08` (จาก `main` `99b7311` = v2.0.0) · แผน: `test-plan.md`
> ป้ายหลักฐาน: [V] Verified · [I] Inferred · [U] Unknown · สถานะ: Passed / Failed / Blocked / Not Run
> ผลด้านล่างรันบนเครื่องนักพัฒนา (Windows 11, Node 24.13.0) กับ Supabase ในเครื่อง · ผลบน GitHub Actions (Node 22) จะได้เมื่อเปิด PR

## 1. สรุปตามชั้น

| # | ชั้น | ผล | สถานะ |
|---|---|---|---|
| 1 | Static analysis | `tsc --noEmit` 0 error · ESLint `--max-warnings=0` 0 ปัญหา | **Passed** [V] |
| 2 | Unit | Vitest 31 ไฟล์ 393 test | **Passed** [V] |
| 3 | Integration | Vitest (screen + data layer) รวมใน 393 · SQL tests 5/5 บน Postgres ในเครื่อง | **Passed** [V] |
| 4 | E2E (CUJ-1…8) | 9 test × 2 ขนาดจอ = 18/18 | **Passed** [V] |
| 5 | Regression | F-01…F-40: Passed 36, บางส่วน 2, Blocked 1 (realtime), ถอดตามแบบ 1 · `regression-report.md` | **Passed** [V] |
| 6 | Auth / Authorization | unit 5 ไฟล์ (proxy, guard, login, logout, redirect) · E2E redirect 5 หน้า, open redirect, login ใหม่ | **Passed** [V] |
| 7 | RLS / cross-user | anon, outsider, member ผ่าน PostgREST ตรง · SQL `member_rls` | **Passed** [V] · `security-review.md` §2 |
| 8 | Form validation / error | unit schema/editor/dialog · DB 23514 · Enter ไม่บันทึก (หลังแก้ D-01) | **Passed** [V] |
| 9 | Responsive / a11y | 360 px ทุก 7 หน้า · axe ธีมมืด (6 หน้า: login, ภาพรวม, บันทึก, ค้างชำระ, ประวัติ, เพิ่มเติม) + สว่าง (4 หน้า) + dialog 2 ตัว · keyboard-only · skip link | **Passed** [V] |
| 10 | Build / runtime | `next build` ผ่าน · E2E รันบน `next start` · bundle ไม่มี key ฝั่ง server · header ครบ (ในเครื่องและ production) | **Passed** [V] |
| — | Dependency | ไม่มี Critical ใน production deps · High 4 ประเมินแล้ว (D-04) | **Passed** ตามเกณฑ์ CI [V] |

## 2. E2E

ชุดทั้งหมด 26 test × 2 project (phone, desktop) = 52 · รันจริง 45 · ข้ามโดยตั้งใจ 7 (test ระดับ API 6 ตัวรันบน desktop ครั้งเดียว, ตรวจความกว้าง 360 px รันบน phone อย่างเดียว)

| ไฟล์ | Test | phone | desktop |
|---|---|---|---|
| `cuj.spec.ts` | UF-AUTH-02 + CUJ-1…8 (9) | 9 Passed | 9 Passed |
| `security.spec.ts` | API: anon, outsider, member rules, client-errors, headers (5) | ข้าม (ตั้งใจ) | 5 Passed |
| `security.spec.ts` | UI: redirect, open redirect, non-member, login ใหม่ (4) | 4 Passed | 4 Passed |
| `ui-quality.spec.ts` | 360 px, axe สว่าง, axe dialog, keyboard-only, skip link (5) | 5 Passed | 4 Passed + 1 ข้าม (360 px) |
| `regression.spec.ts` | PWA, ธีม, ยี่ห้อ/ลูกค้า/ผู้บันทึก (3) | 2 Passed + 1 ข้าม (PWA) | 3 Passed |

**ความนิ่ง (รันเต็มชุดซ้ำ):**

| ชุด | รอบ | ผล |
|---|---|---|
| ก่อนแก้ test (T-01, T-02) | หลายรอบ | ล้มจากการที่ test ชนกันเองและรอ network ภายนอก ไม่ใช่จากแอป |
| หลังแก้ T-01/T-02 ก่อนเพิ่ม `regression.spec.ts` (40 test) | 10 | 8 ผ่านหมด · 1 รอบล้มจาก T-03 (แก้แล้ว) · 1 รอบ dialog (phone) หมดเวลา สาเหตุไม่ทราบ (T-04) |
| ชุดสุดท้าย (45 test) | 5 | **45/45 ทุกรอบ** (รวม 1 รอบทดลองตัด `'unsafe-eval'` ใน D-05 แล้วคืนค่า) |

เวลา: ~1.6 นาทีต่อรอบ (2 workers)

## 3. Unit / Integration

| กลุ่ม | ไฟล์ | สถานะ |
|---|---|---|
| UI primitives + tokens (contrast 38 คู่ × 2 ธีม) | 2 | Passed |
| Shell / nav / theme / error pages | 2 | Passed |
| Auth (login, logout, guard, redirect, proxy) | 5 | Passed |
| Records (schema, editor, record-editor, edit dialog, api) | 5 | Passed |
| Dashboard / Debts / History | 7 | Passed |
| lib (เวลาไทย 3 TZ, env guard, errors, export, pagination, observability, spreadsheet) | 8 | Passed |
| อื่น ๆ (weather cache, `/api/client-errors`) | 2 | Passed (รวม 31 ไฟล์ · 393 test) |

SQL tests (Supabase ในเครื่อง, ข้อมูล seed 1,563 รายรับ):

| ไฟล์ | ผล |
|---|---|
| `dashboard_rpcs.test.sql` | ALL DASHBOARD RPC TESTS PASSED |
| `data_rules_seq.test.sql` | ALL DATA RULE / SEQUENCE TESTS PASSED |
| `indexes_idempotency_audit.test.sql` | ALL INDEX / IDEMPOTENCY / AUDIT TESTS PASSED |
| `member_rls.test.sql` | ALL MEMBER RLS TESTS PASSED |
| `settle_records.test.sql` | ALL SETTLE TESTS PASSED |

## 4. Production (อ่านอย่างเดียว, 2026-10-18)

| ตรวจ | ผล | สถานะ |
|---|---|---|
| `GET /login` headers | CSP, HSTS, XFO, nosniff, Referrer, Permissions ครบ · ไม่มี X-Powered-By | Passed [V] |
| `GET /` ไม่ login | 307 → `/login` | Passed [V] |
| `GET /history` ไม่ login | 307 → `/login?next=%2Fhistory` | Passed [V] |
| `POST /api/client-errors` ไม่ login | 401 | Passed [V] |

## 5. Not Run / Blocked

| เรื่อง | สถานะ | เหตุผล / ทำเมื่อไร |
|---|---|---|
| Realtime (F-18) | Blocked | ไม่ได้เปิดบริการ realtime ใน Supabase ทดสอบ · production ปิดอยู่ |
| Safari, Firefox, iPhone/Android จริง | Not Run | Playwright ใช้ Chromium จำลองขนาดจอ · UAT บนเครื่องจริง (S07-41) |
| Widget สภาพอากาศกับ API จริง | Not Run | บริการภายนอก |
| E2E บน Preview + staging | Not Run | Step 10 |
| Performance / Web Vitals | Not Run | Step 09 |
| RLS/cookie บน production โดยตรง | Not Run | ไม่ใช้บัญชีจริงทดสอบ · Step 10 บน Preview |
| CI บน GitHub ของการเปลี่ยนแปลงชุดนี้ | Not Run (รอ PR) | เจ้าของเปิด PR แล้ว CI จะรันทั้ง 9 job |

## 6. เกณฑ์ยอมรับ Step 08

| เกณฑ์ | ผล |
|---|---|
| ไม่มี Critical/High ที่ยังไม่จัดการ | ✅ ไม่พบ Critical/High (`defect-log.md`) |
| CUJ ผ่าน | ✅ CUJ-1…8 ผ่านทั้ง phone และ desktop ทุกรอบของชุดสุดท้าย |
| แก้ข้อบกพร่องสำคัญและทดสอบซ้ำ | ✅ D-01, D-02 แก้และทดสอบซ้ำ · D-03, D-06 แก้หลังเจ้าของตัดสิน (`fix/logout-this-device`) · D-04/D-05 ใน PR แยก |
