# Architecture Decision Records

> ADR-01..14 เขียนใน Step 05 (2026-10-14) · อัปเดตสถานะตามของจริงใน Step 12 (2026-10-20, `v2.1.0`) · ADR-15..20 บันทึกการตัดสินใจระหว่าง Step 07–11
> รูปแบบ: Context → Decision → Consequences → **ผลจริง** · สถานะ: **Implemented** (ทำตามนั้น) · **Partial** (ทำบางส่วน/ต่างจากแผน) · **Superseded**

| ADR | หัวข้อ | สถานะ |
|---|---|---|
| ADR-01 | คง stack: Next.js App Router + Supabase + Vercel | Implemented |
| ADR-02 | DB เป็นเส้นแบ่งความปลอดภัย ไม่มี BFF สำหรับข้อมูลธุรกิจ | Implemented (มีข้อยกเว้น 1 จุด) |
| ADR-03 | ไม่เพิ่ม data-fetching library | Implemented |
| ADR-04 | Allowlist สมาชิก `app_members` + RLS | Implemented |
| ADR-05 | ยอดรวมด้วย RPC + pagination helper | Partial |
| ADR-06 | Asia/Bangkok ทั้ง client และ DB | Implemented |
| ADR-07 | `client_request_id` + optimistic concurrency ด้วย `updated_at` | Implemented |
| ADR-08 | Supabase CLI migrations ใน repo | Partial |
| ADR-09 | คง `services[]` แล้วย้ายเป็น column ภายหลัง | Implemented (ส่วนย้ายยังไม่ทำ) |
| ADR-10 | เลิก sanitize ตอนบันทึก | Implemented |
| ADR-11 | Observability แบบไม่เพิ่ม dependency | Implemented |
| ADR-12 | Environment guard กัน Preview ชี้ production | Implemented |
| ADR-13 | Route groups `(app)`/`(auth)` + server guard ชั้นที่ 2 | Implemented |
| ADR-14 | Dependency policy | Implemented (เพิ่ม dev tools ใน Step 08) |
| ADR-15 | `develop` เป็นที่รวมงาน · `main` รับเฉพาะ release/hotfix | Implemented (2026-10-19) |
| ADR-16 | ออกจากระบบเฉพาะเครื่องที่กด | Implemented (D-03) |
| ADR-17 | ฟอร์มที่ server render ต้องปลอดภัยก่อนหน้าพร้อม | Implemented (D-07 production · D-08 ใน `develop` #51) |
| ADR-18 | ไลบรารีหนักโหลดเมื่อใช้ และล้มได้โดยหน้าไม่พัง | Implemented (O-07, D-11) |
| ADR-19 | Test อัตโนมัติไม่แตะ production | Implemented |
| ADR-20 | CSP production ไม่มี `unsafe-eval` | Implemented (D-05) |

---

## ADR-01 — คง stack เดิม
**Context:** ระบบใช้ Next.js 16 App Router, React 19, Supabase และ Vercel อยู่แล้ว และมีผู้ใช้จริง
**Decision:** ไม่เปลี่ยน framework, hosting หรือ DB · อัปเกรดเวอร์ชันเพื่อแก้ช่องโหว่
**ผลจริง:** `next 16.3.8`, `react 19.2.4`, `@supabase/ssr 0.10` · อัปเกรด dependency ที่มีช่องโหว่ใน D-04 (เลือกเวอร์ชันที่ออกมาแล้ว ≥ 2 สัปดาห์) · production audit High/Critical = 0 [V]

## ADR-02 — DB เป็นเส้นแบ่งความปลอดภัย
**Context:** anon key อยู่ใน bundle และ PostgREST เรียกตรงได้ · การ validate ใน Server Actions ถูกข้ามได้ถ้าตารางยังเขียนตรงได้
**Decision:** กฎทั้งหมด (สิทธิ์, validation, audit, seq, การแก้หลายแถว) อยู่ใน Postgres · client เรียก Supabase ตรง ไม่ใช้ Server Actions/Route Handlers เป็นทางผ่านข้อมูลธุรกิจ
**Consequences:** client เก่าและใหม่อยู่ร่วมกันได้ระหว่าง rollout · กฎธุรกิจต้องเขียน SQL พร้อม test
**ผลจริง:** ตามนั้น (M001–M009, SQL tests ใน CI) · ข้อยกเว้น: `app/(app)/layout.tsx` นับลูกค้าค้างชำระฝั่ง server สำหรับ badge (ใช้ session ของผู้ใช้ จึงยังผ่าน RLS)

## ADR-03 — ไม่เพิ่ม data-fetching library
**Decision:** hook เขียนเองบน `useState`/`useEffect` + `Result` · ไม่ใช้ React Query/SWR
**ผลจริง:** ตามนั้น · กันผลเก่าทับผลใหม่ด้วยตัวนับ request (`features/dashboard/hooks.ts`)

## ADR-04 — Allowlist สมาชิก
**Context:** ไม่รู้ว่าเปิด sign-up อยู่หรือไม่ และแอปไม่มี role · incident 2026-10-14 พบว่าตารางยังไม่จำกัดสิทธิ์
**Decision:** `app_members` + `is_app_member()` ใน RLS ทุกตาราง และปิด sign-up
**ผลจริง:** M001–M002 ขึ้น production 2026-10-15 · ทุกบัญชีจริงเป็นสมาชิก · anon ถูกปฏิเสธ · คนที่ login แต่ไม่ใช่สมาชิกเห็นผลว่าง (ทดสอบใน `e2e/security.spec.ts`) [V] · สถานะการปิด sign-up [U]

## ADR-05 — ยอดรวมด้วย RPC + pagination helper
**Context:** query ทั้งปีถูกตัดที่ max rows (ER-02) และหน้าแรกโหลดข้อมูล 1 ปีทุกครั้ง (ER-31)
**Decision:** ยอดรวมคำนวณใน DB · รายการแถวผ่าน `fetchAllPages` ที่ตรวจ count
**ผลจริง (Partial):** RPC 3 ตัวของหน้าแรก (`dashboard_today`, `daily_series`, `customer_breakdown`) + `settle_records` · `fetchAllPages` ใช้ทุกรายการ · **ไม่ได้ทำ** `debt_summary`, `period_summary`: ยอดค้างและสรุปประวัติคำนวณใน client จากรายการที่โหลดครบ · ผลข้างเคียง: หน้าประวัติโหลดทั้งปี (known-issues K-03)

## ADR-06 — Asia/Bangkok
**Decision:** `lib/time/bangkok.ts` ใช้ `Intl` (ไม่เพิ่ม library) · DB ใช้ `at time zone 'Asia/Bangkok'`
**ผลจริง:** ตามนั้น · test รันด้วย `TZ=Asia/Bangkok` และมี test เฉพาะที่ตั้งเขตอื่น [V]

## ADR-07 — Idempotency และ concurrency
**Decision:** `client_request_id` (unique, nullable) ต่อการบันทึก 1 ครั้ง · update พร้อมเงื่อนไข `updated_at` เดิม · ส่งเฉพาะ field ที่เปลี่ยน
**ผลจริง:** M004 + `features/records/api.ts` (`savedOnce`, `updateEntry`) · การบันทึกซ้ำนับเป็นสำเร็จ · การแก้ชนกันได้ `CONFLICT` [V]

## ADR-08 — Supabase CLI migrations
**Decision:** `supabase/migrations` + `rollback` + `tests` · ใช้ CLI ใน CI/เครื่อง dev · staging อัตโนมัติ · production ผ่าน workflow ที่ต้องอนุมัติ
**ผลจริง (Partial):** ไฟล์ใน repo + CI job `db` ทดสอบ migrations, SQL tests และ down scripts ทุก PR [V] · **workflow staging/production ไม่ได้สร้าง**: เจ้าของรัน SQL บน production เองก่อน merge (PR template บรรทัดแรก) · ประวัติ migration ใน CLI ของ production [U] (`database-migrations.md` §2)

## ADR-09 — คง `services[]`
**Decision:** MVP แปลงที่ขอบ data access · ย้ายเป็น `car_type`/`car_brand`/`note` หลัง v2.0.0 ด้วย expand/contract
**ผลจริง:** แปลงใน `features/records/editor.ts` · ยังไม่ย้าย (TD-06)

## ADR-10 — เลิก sanitize ตอนบันทึก
**Decision:** เก็บตามที่พิมพ์ (หลัง trim) · ป้องกันที่ output · ลบ `isomorphic-dompurify`
**ผลจริง:** ตามนั้น · ไม่มี `dangerouslySetInnerHTML` กับข้อมูลผู้ใช้ · Excel กัน formula injection (`lib/spreadsheet-text.ts`) [V]

## ADR-11 — Observability ไม่เพิ่ม dependency
**Decision:** `reportAppError` → `POST /api/client-errors` → Vercel runtime logs แบบ JSON ไม่มี PII
**ผลจริง:** ตามนั้น · ข้อจำกัด: Vercel Hobby ดู log ย้อนได้ 30 นาที ไม่มี alert (K-12) · ทบทวน Sentry หรือ plan ถ้าต้องการเฝ้าระวังจริงจัง

## ADR-12 — Environment guard
**Decision:** `NEXT_PUBLIC_APP_ENV` + `PRODUCTION_SUPABASE_PROJECT_REF` → build ล้มถ้า non-production ชี้ production · แสดงแถบ environment
**ผลจริง:** `lib/env-guard.ts` ใน `next.config.ts` + `StatusBar` · Preview ใช้ staging ตรวจแล้วใน Step 10 [V]

## ADR-13 — Route groups + server guard
**Decision:** `app/(app)/layout.tsx` (server) เรียก `getUser()` แล้ว redirect · `page.tsx` เป็น server shell ที่มี `metadata` · proxy refresh session + redirect
**ผลจริง:** ตามนั้น · `getSessionUser` ใช้ `cache()` ให้ layout และ page เรียก Auth ครั้งเดียวต่อ request

## ADR-14 — Dependency policy
**Decision:** runtime ไม่เพิ่ม · ลบ `isomorphic-dompurify`
**ผลจริง:** runtime deps 7 ตัว (`architecture.md` §9) · Step 08 เพิ่ม dev tools `@playwright/test`, `@axe-core/playwright` · Supabase CLI ใช้เป็น binary ไม่อยู่ใน `package.json`

---

## ADR-15 — `develop` เป็นที่รวมงาน (2026-10-19, เจ้าของตัดสิน)
**Context:** `main` deploy production อัตโนมัติ · หลัง v2.0.0 PR #41–#46 ตั้ง base เป็น `main` จึงขึ้น production โดยไม่ผ่าน RC และทำให้ D-07 (High) ขึ้น production (S10-01)
**Decision:** งานปกติเข้า `develop` · `main` รับเฉพาะ `release/*` (merge commit) และ hotfix ที่เจ้าของอนุมัติ · back-merge หลัง release
**Consequences:** ทุกการเปลี่ยนผ่าน RC บน Preview + staging ก่อนถึงผู้ใช้ · ต้องทำ release บ่อยพอ ไม่งั้นการแก้ค้างใน `develop` · `develop` ควรมี ruleset (K-17)

## ADR-16 — ออกจากระบบเฉพาะเครื่องที่กด (D-03)
**Context:** ร้านใช้บัญชีเดียวกันหลายเครื่อง (tablet หน้าร้าน + มือถือ) · `signOut()` เดิมออกทุกเครื่อง
**Decision:** `signOut({ scope: 'local' })` · ถ้าเน็ตหลุดลบ cookie ในเครื่องเอง (D-06)
**Consequences:** session ของเครื่องอื่นยังอยู่ · ถ้าเครื่องหายต้องเปลี่ยนรหัสผ่านเพื่อเตะทุก session

## ADR-17 — ฟอร์มที่ server render ต้องปลอดภัยก่อนหน้าพร้อม (D-07, D-08)
**Context:** O-01 (Step 09) ทำให้ฟอร์ม login มาพร้อม HTML · กดส่งก่อน JavaScript โหลด เบราว์เซอร์ส่ง GET ทำให้รหัสผ่านอยู่ใน URL (D-07 High) · ข้อความที่พิมพ์ก่อนพร้อมในฟอร์มบันทึกถูกล้าง (D-08)
**Decision:** ทุกฟอร์มที่ server render: `method="post"` · ปุ่มส่งปิดจนหน้าพร้อม (`useHydrated`) · login ใช้ช่องแบบ uncontrolled · ฟอร์ม controlled เก็บค่าที่พิมพ์ก่อนพร้อมเข้า state (`useKeepEarlyTyping`)
**Consequences:** ปุ่มเป็นสีจางช่วงสั้น ๆ ตอนโหลด (axe บน WebKit นับเป็น contrast แต่ WCAG ยกเว้นปุ่มที่ใช้ไม่ได้) · ต้องทดสอบด้วยการกัน JavaScript และบน WebKit (`testing-guide.md` §4.4)

## ADR-18 — ไลบรารีหนักโหลดเมื่อใช้ และล้มได้โดยหน้าไม่พัง (O-07, D-11)
**Decision:** `recharts` โหลดหลังข้อมูลหน้าแรกมาถึง · `exceljs`/`jspdf` โหลดตอนกด · import ที่ล้มแสดงข้อความในกล่องของมัน (`.catch(() => ({ default: Fallback }))`)
**Consequences:** หน้าแรกเร็วขึ้น · เน็ตอ่อนแล้วไฟล์กราฟโหลดไม่ได้ หน้ายังใช้ได้ (เดิมทั้งหน้าเป็น error)

## ADR-19 — Test อัตโนมัติไม่แตะ production
**Decision:** CI และ E2E ใช้ Supabase ในเครื่อง (ปฏิเสธ host ที่ไม่ใช่ localhost) · RC test ใช้ Preview + staging (ปฏิเสธโดเมน production และตรวจว่าไม่มี request ไป production) · production ตรวจแบบอ่านอย่างเดียว ส่วนที่ต้อง login ให้เจ้าของทำ
**Consequences:** ไม่มีข้อมูลทดสอบในร้าน · การตรวจหลัง deploy ที่ต้อง login พึ่งเจ้าของ

## ADR-20 — CSP production ไม่มี `unsafe-eval` (D-05)
**Decision:** ใส่ `'unsafe-eval'` เฉพาะ `next dev` · ใช้ `zod/mini` (ผ่าน `lib/zod.ts`) ซึ่งไม่ต้อง eval · test ตรวจว่าไม่มี CSP violation ในทุกหน้าและทุก dialog
**Consequences:** ลดความเสียหายถ้ามี XSS · import zod ต้องผ่าน `lib/zod.ts` เท่านั้น
