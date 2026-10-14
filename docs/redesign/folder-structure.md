# Folder Structure — Step 05

> วันที่: 2026-10-14 · ยืนยันโครงจาก `design-to-code-map.md` §3 (ⓢ ของ Step 04) และปรับตาม ADR
> หลัก: แยกตาม **feature** (domain) โดย UI กลางแยกเป็น `components/` และ route group ไม่เปลี่ยน URL

## 1. Target Tree

```
.
├── app/
│   ├── layout.tsx                    Server: font, metadata, theme script
│   ├── globals.css                   @import tailwind + tokens + @theme
│   ├── styles/tokens.css             design tokens (Step 04)
│   ├── error.tsx  not-found.tsx
│   ├── (auth)/login/page.tsx         Server shell → LoginForm
│   ├── (app)/layout.tsx              Server: getUser() guard → <AppShell>
│   ├── (app)/page.tsx                ภาพรวม  → <DashboardScreen>
│   ├── (app)/debts/page.tsx          ค้างชำระ → <DebtsScreen>        (ใหม่)
│   ├── (app)/add/page.tsx            บันทึก   → <AddScreen>
│   ├── (app)/history/page.tsx        ประวัติ  → <HistoryScreen>
│   ├── (app)/more/page.tsx           เพิ่มเติม → <MoreScreen>          (ใหม่)
│   └── api/client-errors/route.ts    POST error log
├── proxy.ts                          (เดิม middleware.ts) session refresh + redirect
├── components/
│   ├── ui/                           primitives: Button, Dialog, Toast, Chip, …
│   └── patterns/                     FormField, fields/*, ActionBar, nav/*, DataTable, …
├── features/
│   ├── auth/      components/ api.ts
│   ├── dashboard/ components/ hooks/ api.ts logic.ts __tests__/
│   ├── debts/     components/ hooks/ api.ts logic.ts bill.ts __tests__/
│   ├── records/   components/ hooks/ api.ts schema.ts mappers.ts catalog.ts types.ts __tests__/
│   ├── history/   components/ hooks/ api.ts export.ts __tests__/
│   └── weather/   hooks/ api.ts logic.ts __tests__/
├── lib/
│   ├── supabase/browser.ts           createBrowserClient (singleton)
│   ├── supabase/server.ts            createServerClient (cookies getAll/setAll) — ใช้ใน server เท่านั้น
│   ├── env.ts                        Zod env + environment guard (ADR-12)
│   ├── errors.ts  result.ts          AppError, Result, toUserMessage
│   ├── fetch-all-pages.ts            pagination helper
│   ├── time/bangkok.ts               วัน/เวลาไทยด้วย Intl (แทน lib/dateUtils.ts)
│   ├── money.ts                      format ฿
│   └── observability.ts              reportError (sendBeacon)
├── config/shop.ts                    ข้อมูลร้านบนบิล (Q-09 ค่าเริ่มต้น)
├── types/database.ts                 generated (supabase gen types)
├── supabase/
│   ├── config.toml                   Supabase CLI
│   ├── migrations/*.sql              M000…
│   ├── rollback/*.down.sql
│   ├── tests/*.sql                   RLS/constraint tests
│   └── seed.sql                      ข้อมูลสมมติสำหรับ staging/local (ไม่มีข้อมูลจริง)
├── tests/e2e/                        (Step 08 เลือกเครื่องมือ)
├── public/                           manifest, icons, fonts (ลบ SVG boilerplate 5 ไฟล์)
└── docs/redesign/                    เอกสาร Step 00–12
```

## 2. Module Responsibilities & Import Rules

| Module | รับผิดชอบ | Import ได้จาก | ห้าม import |
|---|---|---|---|
| `app/**` | routing, server guard, metadata, ประกอบหน้าจอ | `features/*/components`, `components/*`, `lib/*` | `supabase` client ตรง (ยกเว้น `lib/supabase/server.ts` ใน layout/route handler) |
| `components/ui` | primitive ไม่รู้ domain | `lib/*` (utils) | `features/*`, `lib/supabase/*` |
| `components/patterns` | ประกอบ primitive | `components/ui`, `lib/*` | `features/*`, supabase |
| `features/<x>/components` | UI ของ domain | `components/*`, `features/<x>/hooks`, `features/<x>/logic`, `features/records` (shared domain) | `lib/supabase/*` ตรง |
| `features/<x>/hooks` | state + เรียก api | `features/<x>/api`, `logic` | — |
| `features/<x>/api.ts` | data access เท่านั้น | `lib/supabase/browser`, `lib/result`, `lib/errors`, `types/database` | React |
| `features/<x>/logic.ts` | pure functions | `lib/time`, `lib/money`, types | React, supabase, `Date.now()` ตรง (รับ `now` เป็น parameter เพื่อ test ได้) |
| `lib/supabase/server.ts` | server client | `next/headers` | ห้ามถูก import จาก client component (ตรวจด้วย ESLint `no-restricted-imports` แทนแพ็กเกจ `server-only` เพื่อไม่เพิ่ม dependency) |

บังคับด้วย ESLint `no-restricted-imports` (patterns) ใน Step 07

## 3. Mapping จากโครงเดิม

| เดิม [V] | ใหม่ |
|---|---|
| `app/page.tsx`, `app/add/page.tsx`, `app/history/page.tsx`, `app/login/page.tsx` | ย้ายเข้า `(app)/` และ `(auth)/` (URL เดิม) โดยเนื้อหาไปอยู่ใน `features/*/components/*Screen.tsx` |
| `components/dashboard/*` | `features/dashboard/components/*` |
| `components/add/*`, `components/EditModal.tsx`, `components/RecordCard.tsx` | `features/records/components/RecordEditor`, `RecordRow` |
| `components/history/*` | `features/history/components/*` |
| `components/BottomNav.tsx`, `ClientLayout.tsx` | `components/patterns/nav/*` (AppShell) |
| `components/ui/ErrorBanner.tsx` | `components/ui/Banner.tsx` |
| `hooks/useDashboard.ts` | แยกเป็น `features/dashboard/{api,logic,hooks}` |
| `hooks/useHistoryData.ts` | `features/history/{api,hooks}` |
| `hooks/useAddRecord.ts` | `features/records/hooks` |
| `hooks/useWeather.ts` | `features/weather/*` (แยก mapping/theme/message เป็น logic.ts TD-03/M3) |
| `hooks/useToast.tsx`, `useTheme.ts` | `components/ui/Toast`, `components/patterns/theme` |
| `hooks/useKioskMode.ts` | **ลบ** (F-07 Replace) |
| `lib/supabase.ts` | `lib/supabase/browser.ts` |
| `lib/serverAuth.ts` | `lib/supabase/server.ts` |
| `lib/dateUtils.ts` | `lib/time/bangkok.ts` (แก้ ER-01, ER-11) |
| `lib/export.ts` | `features/history/export.ts` |
| `lib/generateBill.ts` | `features/debts/bill.ts` + `config/shop.ts` |
| `types/index.ts` | `features/records/{types,catalog}.ts` + `types/database.ts` |
| `middleware.ts` | `proxy.ts` |
| `tests/*.test.ts` (ซ้ำ TD-15) | รวมเข้า `features/*/__tests__` และ `lib/**/__tests__` แล้ว test pure logic ของจริง (TD-22) |
| `app/api/insights`, `app/api/export-excel` | ลบ (Q-12) |

การย้ายทำ **ทีละ release slice** ไม่ย้ายทั้งหมดใน PR เดียว (`implementation-roadmap.md`, Step 06)
