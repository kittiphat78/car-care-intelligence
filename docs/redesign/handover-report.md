# Project Handover Report — Redesign 2026 (Step 00–12)

> 2026-10-20 · สรุปส่งมอบโปรเจกต์ redesign ของ Car Care Intelligence · ป้าย: **[V]** Verified · **[I]** Inferred · **[U]** Unknown
> สำหรับเจ้าของและนักพัฒนาที่รับงานต่อ · รายละเอียดอยู่ในเอกสารที่อ้างถึงแต่ละหัวข้อ

## 1. สรุปสั้น

- **ระบบเดิม `v1.0.0`** (2026-09-28): แอปฝั่ง client ล้วน · ฐานข้อมูลยังไม่จำกัดสิทธิ์ · ไม่มี CI, migration หรือ staging · ยอดเงินผิดได้เมื่อข้อมูลเกิน 1,000 แถว และวันที่เลื่อนช่วงเช้ามืด
- **ปัจจุบัน `v2.1.0`** (production ตั้งแต่ 2026-10-19 23:21):
  - หน้าตาใหม่ทั้งแอป และใช้ได้ทั้งมือถือ, tablet และ PC
  - กฎและสิทธิ์บังคับที่ฐานข้อมูล
  - มี staging, CI 9 checks และ E2E
  - ทำ release ผ่าน RC บน Preview
- งานใน `develop` ที่ยังไม่ขึ้น production: **D-08** (ข้อความที่พิมพ์ก่อนหน้าพร้อมไม่หาย) และเอกสาร Step 11–12

## 2. สิ่งที่เปลี่ยนจากระบบเดิม

| เรื่อง | v1.0.0 (เดิม) | v2.1.0 (ปัจจุบัน) |
|---|---|---|
| สิทธิ์ข้อมูล | ตารางยังไม่จำกัดให้เฉพาะคนในร้าน (incident 2026-10-14, Critical) | RLS เฉพาะสมาชิกใน `app_members` · anon ถูกปฏิเสธ · คนนอกที่ login เห็นผลว่าง |
| กฎข้อมูล | อยู่ใน browser (เลขลำดับ, ชื่อผู้บันทึก, การตรวจค่า) | trigger และ constraint ในฐานข้อมูล · client ตรวจซ้ำเพื่อแสดงข้อความไทย |
| ยอดเงิน | รวมใน browser จากข้อมูลทั้งปี · ถูกตัดที่ 1,000 แถว (ER-02) | RPC ในฐานข้อมูล + ดึงข้อมูลครบทุกหน้า |
| เวลา | ผสม UTC กับเวลาเครื่อง: วันที่เลื่อน (ER-01) | Asia/Bangkok ทั้ง client และฐานข้อมูล |
| เคลียร์ยอด | update ตามชื่อลูกค้า (พลาดชื่อว่าง/ช่องว่าง, ER-03) | `settle_records(ids)` เฉพาะรายการที่เห็นและยืนยัน |
| บันทึกซ้ำ / แก้ชนกัน | ไม่มีการป้องกัน | `client_request_id` + ตรวจ `updated_at` |
| โครงโค้ด | query กระจายใน 6 ไฟล์ · hook 310 บรรทัด | แยก `features/*` (api / logic / components) · `Result<T>` · test pure logic ตรง |
| Environment | dev และ Preview น่าจะชี้ฐานข้อมูลจริง | Local/Preview = staging หรือในเครื่อง · build ล้มถ้าชี้ production ผิด environment |
| Release | merge ในเครื่องเข้า `main` · ไม่มี CI | `develop` → `release/*` (RC บน Preview + staging) → `main` · ruleset + 9 checks |
| ความปลอดภัยของเว็บ | CSP มี `unsafe-eval` · dependency มีช่องโหว่ระดับ critical/high | CSP ไม่มี `unsafe-eval` · production audit High/Critical = 0 · ตรวจว่า bundle ไม่มี server key |
| Observability | ไม่มี | รายงาน error จากเบราว์เซอร์ → Vercel logs (ไม่มีข้อมูลส่วนตัว) |

## 3. ฟีเจอร์

**รักษาไว้ (ทำใหม่บน UI ใหม่):** login อีเมล/รหัสผ่าน + จำอีเมล · ยอดวันนี้และเทียบเมื่อวาน · สภาพอากาศ/โอกาสฝน/คุณภาพอากาศ (Open-Meteo) · รายการวันนี้และแก้ไข · ค้างชำระ + เคลียร์ยอด · บิล PDF · บันทึกรายรับ (ล้าง/ขัดสี, ประเภทรถ, ยี่ห้อ, ลูกค้า, หมายเหตุ) และรายจ่าย (ปุ่มลัด) · นับลูกค้าประจำจากทะเบียน · ประวัติ ค้นหา กรอง แก้ไข ลบ · ส่งออก Excel · ธีมมืด/สว่าง · ติดตั้งเป็นแอป (manifest) (`feature-inventory.md`, `release-2.0.0.md`)

**เพิ่มใหม่:**
- หน้าค้างชำระแยก: ค้างกี่วัน และป้าย "เร่งด่วน" ≥ 14 วัน
- หน้าเพิ่มเติม
- เมนูล่างบนมือถือ และเมนูซ้ายบน PC
- "บันทึกแล้วทำต่อ"
- ข้อมูลที่กรอกค้างไม่หายเมื่อรีเฟรช (draft)
- เตือนเมื่อค้างชำระแต่ไม่ใส่ชื่อลูกค้า
- กราฟพร้อมประโยคสรุปและตาราง
- กล่องเซสชันหมดอายุ
- ทางลัดเมื่อกดค้างที่ไอคอนแอป
- หน้า error/404
- ออกจากระบบเฉพาะเครื่องนี้ (D-03)
- การ์ด "ไม่มียอดค้าง" (D-09)
- กราฟโหลดไม่ได้หน้าก็ไม่พัง (D-11)
- รองรับ screen reader และสั่งด้วยเสียง (WCAG 2.2 AA ตามที่ทดสอบอัตโนมัติ)

**เลิกใช้หรือแทนที่:**
- Kiosk mode (รีเฟรชแล้วกลับหน้าแรก) → draft + อยู่หน้าเดิม
- `/api/insights` (Gemini ไม่มีผู้เรียก) และ `/api/export-excel` (stub) → ลบ
- sanitize ตอนบันทึก → ป้องกันตอนแสดงผล
- Realtime: โค้ดยังฟังอยู่ แต่ publication บน production ปิด จึงไม่มีผล [V] (v1 เปิดหรือไม่ [U])

## 4. Architecture และ Database

- สถาปัตยกรรมปัจจุบัน: `architecture.md` · เหตุผล: `architecture-decisions.md` (ADR-01..20)
- ฐานข้อมูล: migrations M001–M009 บน production ตั้งแต่ 2026-10-15 (v1.2.0) · **ไม่มี migration ตั้งแต่นั้น**
  - M001–M002 สมาชิก + RLS
  - M003 index
  - M004 `client_request_id`
  - M005 audit trigger
  - M006 RPC หน้าแรก
  - M007 `settle_records`
  - M008 กฎข้อมูล 7 ข้อ
  - M009 เลขลำดับต่อวัน
- รายละเอียดอยู่ที่ `database-migrations.md`
- ทุก migration เป็นแบบ expand: แอปทุกเวอร์ชันตั้งแต่ v1.0.1 ใช้กับ schema ปัจจุบันได้ [I จากการออกแบบ + ทดสอบตอน v1.2.0]

## 5. Version และ Release

| Tag | วันที่ | commit | เนื้อหา |
|---|---|---|---|
| `v1.0.0` | 2026-09-28 | `7f58eec` | baseline ก่อน redesign |
| `v1.0.1` | 2026-10-14 | `d748ac6` | hotfix: วันที่เลื่อนตอนแก้รายการเช้ามืด (ER-01) · Next 16.2.1 → 16.3.8 (ช่องโหว่) |
| `v1.2.0` | 2026-10-16 | `b5213db` | Phase A: CI, env guard, migrations M001–M009, RLS, ยอดใน DB, เคลียร์ยอดตาม id (บน UI เดิม) · `release-1.2.0.md` |
| `v2.0.0-rc.1` → `v2.0.0` | 2026-10-18 | `28be954` → `99b7311` | Phase B: UI ใหม่ทั้งแอป · UAT เจ้าของผ่าน · `release-2.0.0.md` |
| `v2.1.0-rc.4` → `v2.1.0` | 2026-10-19 | `20a66eb` → `8465548` | Step 08–10: test/QA, D-01..D-11, ประสิทธิภาพ/a11y, ความปลอดภัย · `release-notes-draft.md`, `release-record.md` |

ระหว่าง v2.0.0 → v2.1.0 มี PR #42–#47 ขึ้น production ตรงจาก `main` ก่อนมี RC (S10-01) จึงเปลี่ยนเป็นวิธี `develop` + release (ADR-15)

## 6. Tests ที่รันจริง

| ชุด | ผลล่าสุด | เมื่อ |
|---|---|---|
| Unit/component (Vitest) | 404/404 บน `v2.1.0` · 407/407 บน `develop` | 2026-10-19 · 2026-10-20 (clone ใหม่) [V] |
| SQL tests + down scripts | 5/5 + 9/9 | ทุก PR ใน CI · 2026-10-20 ในเครื่อง [V] |
| E2E Chromium มือถือ + PC | 55 ผ่าน บน rc.4 · 57 ผ่าน บน `develop` | 2026-10-19 · 2026-10-20 (clone ใหม่) [V] |
| E2E WebKit | 44/11 บน rc.4 (ล้มเป็น D-08 + ข้อจำกัด WebKit) · 54/3 หลัง D-08 | 2026-10-19 [V] |
| Preview + staging (`e2e-preview`) | มือถือ 3/3 · PC 6/6 · iPhone 3/3 บน rc.4 · PC 6/6, มือถือ 3/3 บน commit เลขเวอร์ชัน | 2026-10-19 [V] |
| axe WCAG 2.2 + Label in Name, 320 px | ไม่มี serious/critical (Chromium) | ทุก PR ใน CI [V] |
| Production smoke (อ่านอย่างเดียว) | ผ่าน 2 รอบ · เจ้าของ login ตรวจผ่าน · เฝ้าระวัง 26 รอบปกติ | 2026-10-19–20 [V] |
| Lighthouse (lab) | `performance-audit.md` | Step 09 [V] |
| ทำตามเอกสารบน clone ใหม่ | ผ่านทุกขั้นที่ทดลอง (`development-guide.md` §8) | 2026-10-20 [V] |

ยังไม่เคยทดสอบ:
- iPhone จริง (บิล PDF, คีย์บอร์ด)
- Vercel Instant Rollback
- รัน migration ผ่าน CLI ไป staging/production

## 7. Security และ Performance

| ID | เรื่อง | ระดับ | ผล |
|---|---|---|---|
| Incident 2026-10-14 | ตารางยังไม่จำกัดสิทธิ์ | Critical | แก้ทันที + ถาวรด้วย M001–M002 (`docs/incidents/2026-10-14-summary.md`) |
| D-07 | ฟอร์ม login ส่งก่อนหน้าพร้อม รหัสผ่านอาจอยู่ใน URL (05:05–20:12 ของ 2026-10-19) | High | แก้แล้ว (PR #47) · ตรวจ log ย้อนหลังไม่ได้ · **แนะนำเปลี่ยนรหัสผ่าน** (`incident-report.md`) |
| D-04 | dependency มีช่องโหว่ | High | production High 4 → 0 · dev Critical 2 → 0 · เหลือ Moderate 2 (`exceljs` → `uuid`) |
| D-05 | CSP มี `unsafe-eval` | Medium | เอาออกจาก production |
| D-03, D-06 | ออกจากระบบทุกเครื่อง / ออกไม่ได้ตอนเน็ตหลุด | Medium | ออกเฉพาะเครื่องนี้ · ออกได้แม้ไม่มีเน็ต |
| — | server key ใน bundle | — | ไม่มี · CI ตรวจทุก PR |

**Performance (Step 09, lab: CPU ช้า 4 เท่า + slow 4G):**
- CLS หน้าภาพรวม 0.545 → 0.002 · หน้า login 0.141 → 0
- LCP หน้า login 2.9 → 1.1 s
- TBT หน้าประวัติลดลงครึ่งหนึ่ง
- **ยังไม่ผ่าน:** LCP หน้าประวัติ 5.2 s และหน้าค้างชำระ 3.0 s (เป้า 2.5 s)
- ที่มา: `performance-audit.md`, `optimization-log.md`

## 8. Production

| | |
|---|---|
| เวอร์ชัน | `v2.1.0` · commit `8465548` · Vercel deployment `7178871333` success 2026-10-19 23:21:39 [V] |
| ตรวจแล้ว | headers, redirect, API 401, JavaScript ชี้ฐานข้อมูล production และไม่มี server key, 4 อุปกรณ์ไม่มี error · เจ้าของ login ตรวจทุกหน้า · Vercel logs ไม่มี error (`smoke-test-results.md`, `monitoring-report.md`) |
| ฐานข้อมูล | M000–M009 · ไม่มีการเปลี่ยนใน v2.x |
| Rollback ที่พร้อม | `4162c44` (ก่อน v2.1.0) · `99b7311` (v2.0.0) · `rollback-plan.md` |
| ถัดไป | release ใหม่จาก `develop` (มี D-08) ตาม `git-workflow.md` §4 |

## 9. Known Issues (สำคัญที่สุด)

ทั้งหมดใน `known-issues.md`:

1. **K-11 D-07:** แนะนำเปลี่ยนรหัสผ่านบัญชีที่ login ช่วง 2026-10-19 05:05–20:12
2. **K-01 D-08:** แก้แล้วใน `develop` แต่ production ยังมีจนกว่าจะ release
3. **K-03:** หน้าประวัติและหน้าค้างชำระช้าบนเน็ตช้า
4. **K-12:** เฝ้าระวังได้จำกัด (Vercel Hobby log 30 นาที ไม่มี alert)
5. **K-08:** ลบแล้วกู้ในแอปไม่ได้
6. **K-02, K-06:** ยังไม่ได้ทดสอบบน iPhone จริง
7. **K-17:** `develop` ยังไม่มี ruleset

## 10. พัฒนาต่อและ Rollback

- เริ่มต้น: `README.md` → `development-guide.md` → `environment-setup.md` → `testing-guide.md`
- งานใหม่: branch จาก `develop` → PR เข้า `develop` (squash) · ห้าม PR ตรงเข้า `main` ยกเว้น hotfix ที่เจ้าของอนุมัติ
- Release: `git-workflow.md` §4: ตั้งเวอร์ชันจริง**ก่อน**เปิด release PR · ยืนยัน deployment ก่อน tag
- ฐานข้อมูล: `database-migrations.md`: expand-only, down script, SQL test, backup ก่อน, เจ้าของรันบน production ก่อน merge
- มีปัญหาบน production: `rollback-plan.md`: Vercel Instant Rollback ย้อนแค่โค้ด ไม่ย้อนข้อมูลหรือฐานข้อมูล
- แนะนำลำดับงานถัดไป:
  1. release D-08
  2. ตั้ง ruleset `develop`
  3. R-P1 (ประวัติโหลดเฉพาะเดือน)
  4. ซ้อม rollback
  5. ตัดสินเรื่อง soft delete และ realtime
