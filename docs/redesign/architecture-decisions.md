# Architecture Decision Records — Step 05

> วันที่: 2026-10-14 · รูปแบบ: Context → Decision → Consequences · สถานะ: **Proposed** (รออนุมัติ Step 05) / **Gated** (รอคำตอบเจ้าของ)

| ADR | หัวข้อ | สถานะ |
|---|---|---|
| ADR-01 | คง stack: Next.js App Router + Supabase + Vercel | Proposed |
| ADR-02 | DB เป็น enforcement boundary และไม่มี BFF หรือ Server Actions สำหรับข้อมูลธุรกิจ | Proposed |
| ADR-03 | ไม่เพิ่ม data-fetching library (React Query/SWR) | Proposed |
| ADR-04 | Allowlist สมาชิก `app_members` + RLS | Proposed |
| ADR-05 | Aggregate ด้วย RPC ฝั่ง DB และ pagination helper | Proposed |
| ADR-06 | Timezone Asia/Bangkok ทั้ง client และ DB | Proposed |
| ADR-07 | Idempotency ด้วย `client_request_id` + optimistic concurrency ด้วย `updated_at` | Proposed |
| ADR-08 | Supabase CLI migrations ใน repo | Proposed |
| ADR-09 | คง `services[]` ใน MVP และย้ายเป็น column ภายหลัง | Proposed |
| ADR-10 | เลิก sanitize ตอนบันทึก | Proposed |
| ADR-11 | Observability แบบไม่เพิ่ม dependency | Proposed |
| ADR-12 | Environment guard กัน Preview ชี้ production | Proposed |
| ADR-13 | Route groups `(app)`/`(auth)` + server guard ชั้นที่ 2 | Proposed |
| ADR-14 | Dependency policy: ลบ 1, เพิ่ม 0 (runtime) | Proposed |

---

## ADR-01 — คง stack เดิม
**Context:** ระบบใช้ Next.js 16 App Router, React 19, Supabase และ Vercel อยู่แล้ว [V] ซึ่งตรงกับ target stack ของ master prompt และมีผู้ใช้จริง
**Decision:** ไม่เปลี่ยน framework, hosting หรือ DB แต่ upgrade `next` เป็น 16.4.x (patch ด้านความปลอดภัย) ก่อนงานอื่น
**Consequences:** ความเสี่ยงต่ำและความรู้เดิมใช้ต่อได้ แต่ต้องติดตาม advisory ของ Next ต่อเนื่อง

## ADR-02 — DB เป็น enforcement boundary
**Context:** anon key อยู่ใน bundle และ PostgREST เรียกตรงได้ ดังนั้นการ validate ใน Server Actions จะถูกข้ามได้ถ้า table ยัง grant ให้ `authenticated` เขียนตรง การปิด grant แล้วบังคับให้ทุกอย่างผ่าน server จะทำให้ realtime และ client เดิม (v1.0.0) ใช้ไม่ได้ระหว่าง rollout และเพิ่ม latency (Vercel region ↔ Supabase region [U])
**Decision:** กฎทั้งหมด (สิทธิ์, validation, audit, seq, multi-row update) อยู่ใน Postgres (RLS, constraints, triggers, RPC) และ client เรียก Supabase ตรง **ไม่ใช้ Server Actions/Route Handlers เป็นทางผ่านข้อมูลธุรกิจใน MVP**
**Alternatives:** (a) BFF ด้วย Server Actions + revoke table grants: ปลอดภัยเท่ากันแต่ทำลาย compatibility และ realtime ต้องคิดใหม่ (b) client-only แบบเดิม: ไม่ปลอดภัย
**Consequences:** client เก่าและใหม่อยู่ร่วมกันได้ และ business rule ต้องเขียน SQL (มี test ใน `supabase/tests`)

## ADR-03 — ไม่เพิ่ม data-fetching library
**Context:** หน้าจอมีไม่กี่หน้า ข้อมูลมาจาก realtime + refresh และ master prompt ห้ามเพิ่ม dependency ที่ไม่จำเป็น
**Decision:** feature hooks เขียนเองบน `useState`/`useEffect` + `Result` และ realtime provider ตัวเดียว
**Consequences:** โค้ด hook มากขึ้นเล็กน้อย แต่ถ้าภายหลังต้องการ cache ข้ามหน้า สามารถทบทวนได้

## ADR-04 — Allowlist สมาชิก
**Context:** ไม่รู้ว่าเปิด sign-up อยู่หรือไม่ (ER-13) และแอปไม่มี role
**Decision:** ตาราง `app_members` + `is_app_member()` ใน RLS ทุกตาราง **และ** ปิด sign-up
**Consequences:** ป้องกันได้แม้การตั้งค่า Auth ผิดพลาดในอนาคต และรองรับ role (Q-01) โดยไม่ต้องเปลี่ยนโครง แต่ **ความเสี่ยง:** ลืม backfill บัญชีใดจะทำให้บัญชีนั้นเห็นข้อมูลว่าง (gate G6)

## ADR-05 — Aggregate ด้วย RPC + pagination helper
**Context:** query รายปีอาจถูกตัดที่ max rows (ER-02) และ dashboard โหลดข้อมูล 1 ปีทุก realtime event (ER-31)
**Decision:** ยอดรวมทุกชนิดคำนวณใน DB (`dashboard_today`, `daily_series`, `customer_breakdown`, `period_summary`, `debt_summary`) ส่วนรายการแถวผ่าน `fetchAllPages` ที่ตรวจ count
**Consequences:** payload เล็กลง ตัวเลขถูกต้องไม่ว่าข้อมูลกี่แถว แต่ logic การรวมย้ายไป SQL จึงต้องมี test เทียบกับ logic เดิม (ผลต้องเท่ากันกับ fixture เดียวกัน)

## ADR-06 — Asia/Bangkok
**Context:** ER-01, ER-10, ER-11 มาจากการผสม UTC กับ local time ของเครื่อง
**Decision:** `lib/time/bangkok.ts` ใช้ `Intl.DateTimeFormat(..., { timeZone: 'Asia/Bangkok' })` (ไม่เพิ่ม library) และ DB ใช้ `at time zone 'Asia/Bangkok'` ส่วนเวลาที่ส่งไป DB เป็น ISO มี offset `+07:00`
**Consequences:** ผลถูกต้องไม่ว่าเครื่องตั้ง timezone อะไร และต้องมี test ที่ตั้ง `TZ=UTC` และ `TZ=Asia/Bangkok`

## ADR-07 — Idempotency และ concurrency
**Context:** S03-04 #1–#3
**Decision:** (1) `client_request_id uuid` unique (nullable) ต่อการบันทึก 1 ครั้ง (2) update พร้อมเงื่อนไข `updated_at` เดิม แล้ว 0 แถว = `CONFLICT` (3) ส่งเฉพาะ field ที่เปลี่ยน
**Consequences:** กดลองใหม่หลัง timeout ไม่เกิดรายการซ้ำ และการแก้ชนกันถูกตรวจพบ (UI: "รายการนี้ถูกแก้จากเครื่องอื่น โหลดใหม่?")

## ADR-08 — Supabase CLI migrations
**Context:** ไม่มี migration ใน repo [V] และ schema อยู่แต่ใน Dashboard
**Decision:** `supabase/migrations` + `supabase/rollback` + `supabase/tests` โดยใช้ CLI ใน CI/เครื่อง dev (ไม่ใช่ runtime dependency) และ apply staging อัตโนมัติ ส่วน production ต้องอนุมัติ (Step 06)
**Consequences:** ต้องมี baseline (M000) จาก production ก่อน ซึ่งต้องใช้สิทธิ์ (B3)

## ADR-09 — คง `services[]`
**Context:** TD-06 ซึ่งการเปลี่ยนโครงต้อง backfill และกระทบ client เดิม
**Decision:** MVP ใช้ mapper ที่ขอบ data access และย้ายเป็น `car_type`/`car_brand`/`note_text` หลัง v2.0.0 ด้วย expand/contract
**Consequences:** ยัง query ตามยี่ห้อใน DB ไม่ได้ (ไม่มี requirement ใน MVP)

## ADR-10 — เลิก sanitize ตอนบันทึก
**Context:** DOMPurify แปลง `<` เป็น `&lt;` ในข้อมูล (ER-08) และ output ทุกช่องทาง (React, Excel string, PDF text) ไม่ตีความ HTML
**Decision:** บันทึกตามที่ผู้ใช้พิมพ์ (หลัง trim) แล้วป้องกันที่ output ห้าม `dangerouslySetInnerHTML` และ Excel ป้องกัน formula injection แล้วลบ `isomorphic-dompurify`
**Consequences:** ข้อมูลเก่าที่ถูกแปลงไปแล้ว (`&lt;`) ยังคงอยู่ และไม่แก้ย้อนหลังอัตโนมัติ (แสดงตามที่เก็บ)

## ADR-11 — Observability ไม่เพิ่ม dependency
**Context:** ไม่มี monitoring (ER-30) และ Sentry/Analytics เป็น dependency + ค่าบริการ
**Decision:** `reportError` → `POST /api/client-errors` → Vercel runtime logs แบบ JSON (ไม่มี PII) ส่วน alerting ใช้ฟีเจอร์ของ Vercel ตาม plan [U]
**Alternatives:** Sentry (ดีกว่าเรื่อง grouping และ alert) ต้องอนุมัติ dependency + data processing
**Consequences:** เห็น error ได้ แต่ grouping และการแจ้งเตือนจำกัด จึงทบทวนหลัง 1 เดือน (SM-08)

## ADR-12 — Environment guard
**Context:** Preview อาจชี้ production DB (Step 00 R01)
**Decision:** `NEXT_PUBLIC_APP_ENV` + `PRODUCTION_SUPABASE_PROJECT_REF` แล้ว build fail ถ้า non-production ชี้ production ref และแสดงแถบ environment บน non-production (`security-design.md` §6)
**Consequences:** ต้องตั้ง env ให้ครบทุก scope ก่อน build แรกหลังเปลี่ยน (checklist Step 06)

## ADR-13 — Route groups + server guard
**Context:** proxy/middleware เคยมี advisory bypass (ER-09) และทุกหน้าเป็น client component ทำให้ตั้ง `<title>` ต่อหน้าไม่ได้
**Decision:** `app/(app)/layout.tsx` (server) เรียก `getUser()` แล้ว redirect · `page.tsx` เป็น server shell ที่ export `metadata` · proxy ใช้ refresh session + redirect เพื่อ UX
**Consequences:** server เรียก Auth 2 ครั้งต่อ page request (proxy + layout) ซึ่งยอมรับได้ (ผู้ใช้น้อย) และควรตั้ง function region ใกล้ Supabase

## ADR-14 — Dependency policy
**Decision:**
- **Runtime เพิ่ม:** ไม่มี (ไอคอนและ dialog ใช้ทางเลือกที่ไม่ต้องเพิ่มตาม S04-01 ค่าเริ่มต้น ยกเว้นเจ้าของอนุมัติ)
- **Runtime ลบ:** `isomorphic-dompurify` (ADR-10)
- **Runtime upgrade:** `next` + `eslint-config-next` → 16.4.x และ `@supabase/ssr` → 0.10.x ล่าสุด (patch)
- **Dev tools:** Supabase CLI (ใช้ผ่าน CI action หรือ binary ไม่จำเป็นต้องอยู่ใน `package.json`) ส่วน E2E/a11y tooling ตัดสินใน Step 08
**Consequences:** bundle ไม่โตขึ้น และงาน UI ต้องเขียน focus trap ของ `<dialog>` เอง (มี test)
