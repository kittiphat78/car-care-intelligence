# Car Care Intelligence

ระบบบันทึกรายรับ รายจ่าย และยอดค้างชำระของร้านคาร์แคร์ (ล้างรถ / ขัดสี) ใช้บนมือถือ tablet และ PC โดยคนในร้าน ออกแบบให้กดน้อย ตัวอักษรใหญ่ และอ่านง่ายสำหรับผู้ใช้ทุกวัย

**เวอร์ชันปัจจุบัน:** `v2.1.0` · ขึ้น production 2026-10-19 · ประวัติ release ดู [`docs/redesign/git-workflow.md`](docs/redesign/git-workflow.md) §9 และ [`docs/redesign/release-record.md`](docs/redesign/release-record.md)

## หน้าจอและฟีเจอร์

| หน้า | ทำอะไรได้ |
|---|---|
| **ภาพรวม** `/` | เงินสดสุทธิวันนี้ · รายรับ/รายจ่าย เทียบเมื่อวาน · การ์ดค้างชำระ (หรือ "ไม่มียอดค้าง") · รายการวันนี้ กดเพื่อแก้ไข · กราฟ 7/30 วันพร้อมตาราง · รายรับตามลูกค้า · สภาพอากาศและคุณภาพอากาศ |
| **บันทึก** `/add` | รายรับ (ล้างรถ/ขัดสี, ทะเบียน, ประเภทรถ, ราคา, ชำระแล้ว/ค้างชำระ, ลูกค้า, ยี่ห้อ, หมายเหตุ) และรายจ่าย (ปุ่มลัดรายการที่ใช้บ่อย) · "บันทึกแล้วทำต่อ" · บอกลูกค้าประจำจากทะเบียน · ข้อมูลที่กรอกค้างไม่หายเมื่อรีเฟรช · กันบันทึกซ้ำ |
| **ค้างชำระ** `/debts` | รายลูกค้า ค้างกี่วัน ยอดเท่าไร · สร้างบิล PDF · เคลียร์ยอดพร้อมยืนยันจำนวนรายการและยอด |
| **ประวัติ** `/history` | เลือกเดือน/ปี · ค้นหาทะเบียน/ลูกค้า/หมายเหตุ · กรองวันที่และประเภท · แก้ไข/ลบ · ส่งออก Excel |
| **เพิ่มเติม** `/more` | บัญชี · ธีมมืด/สว่าง · เวอร์ชัน · ออกจากระบบ (เฉพาะเครื่องนี้) |

ข้อมูลเห็นได้เฉพาะบัญชีที่เป็นสมาชิกร้าน (บังคับที่ฐานข้อมูลด้วย Row Level Security) · ติดตั้งเป็นแอปบนหน้าจอโฮมได้ (PWA manifest)

## Tech stack

- **Next.js 16** (App Router, `proxy.ts`) · **React 19** · **Tailwind CSS 4** (design tokens) · TypeScript
- **Supabase**: Postgres (RLS, constraints, triggers, RPC) + Auth (อีเมล/รหัสผ่าน)
- **Vercel**: hosting (`main` = production, branch อื่น = Preview ที่ใช้ฐานข้อมูล staging)
- `recharts` (กราฟ), `exceljs` (Excel), `jspdf` (บิล PDF), `zod` (ตรวจข้อมูล) · Open-Meteo (อากาศ ไม่ต้องใช้ key)
- Test: Vitest + Testing Library · Playwright + axe-core · SQL tests ด้วย Supabase CLI · GitHub Actions 9 checks

## เริ่มต้น (นักพัฒนา)

ต้องมี Node 22, Docker Desktop และ Supabase CLI 2.118.0 · ขั้นตอนเต็มใน [`docs/redesign/development-guide.md`](docs/redesign/development-guide.md)

```bash
git clone https://github.com/kittiphat78/car-care-intelligence.git
cd car-care-intelligence && git switch develop
npm ci
supabase start -x realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
# สร้าง .env.local ตาม docs/redesign/environment-setup.md §4.1 (ฐานข้อมูลในเครื่อง ไม่ใช่ production)
npm run dev                       # http://localhost:3000
```

| คำสั่ง | |
|---|---|
| `npm run validate` | lint + type-check + unit test + build (รันก่อน push) |
| `npm test` | unit / component tests |
| `npm run test:e2e` | E2E กับ Supabase ในเครื่อง ([`testing-guide.md`](docs/redesign/testing-guide.md)) |

**ห้าม** ชี้ `.env.local` ไปฐานข้อมูล production และห้าม commit ไฟล์ `.env*` (ยกเว้น `.env.example`)

## เอกสาร

| เรื่อง | ไฟล์ |
|---|---|
| สถาปัตยกรรม, auth, สิทธิ์, data flow | [`architecture.md`](docs/redesign/architecture.md) |
| เหตุผลของการตัดสินใจ | [`architecture-decisions.md`](docs/redesign/architecture-decisions.md) |
| เตรียมเครื่อง, โครงโฟลเดอร์, วิธีเพิ่มฟีเจอร์ | [`development-guide.md`](docs/redesign/development-guide.md) |
| ตัวแปร environment (placeholder) | [`environment-setup.md`](docs/redesign/environment-setup.md) |
| ฐานข้อมูลและ migration | [`database-migrations.md`](docs/redesign/database-migrations.md), [`database-schema.md`](docs/redesign/database-schema.md) |
| การทดสอบ | [`testing-guide.md`](docs/redesign/testing-guide.md) |
| Branch และ release | [`git-workflow.md`](docs/redesign/git-workflow.md), [`release-checklist.md`](docs/redesign/release-checklist.md) |
| Deploy บน Vercel | [`deployment-guide.md`](docs/redesign/deployment-guide.md) |
| ย้อนกลับเมื่อมีปัญหา | [`rollback-plan.md`](docs/redesign/rollback-plan.md) |
| ปัญหาที่รู้และหนี้ทางเทคนิค | [`known-issues.md`](docs/redesign/known-issues.md) |
| สรุปส่งมอบโปรเจกต์ redesign | [`handover-report.md`](docs/redesign/handover-report.md) |

เอกสารอื่นใน `docs/redesign/` เป็นบันทึกของแต่ละ Step (00–12) ของการ redesign ปี 2026 · `PROJECT_AUDIT.md` เป็นการตรวจเดิมก่อน redesign (ล้าสมัย)

## ความปลอดภัย

พบช่องโหว่หรือข้อมูลรั่ว แจ้งเจ้าของ repo โดยตรง (ไม่เปิด issue สาธารณะ) · การจัดการ key ที่รั่ว: [`environment-setup.md`](docs/redesign/environment-setup.md) §7
