# Project Structure — Step 01

> วันที่: 2026-10-14 · ตรวจจาก tree ที่ commit `7f58eec` (branch `docs/redesign-step-00-baseline`)
> ป้ายกำกับ: **[V]** Verified · **[I]** Inferred · **[U]** Unknown

## 1. Tree และหน้าที่ของแต่ละโมดูล [V]

จำนวนไฟล์ที่ track: 91 ไฟล์ (`git ls-files`) ตัวเลขในวงเล็บคือจำนวนบรรทัดที่ไม่ว่าง

```
car-care-intelligence/
├── app/                         Next.js App Router (ทุก page เป็น Client Component)
│   ├── layout.tsx        (70)   Root layout: font Sarabun, metadata/PWA, inline theme script, <ClientLayout>
│   ├── page.tsx          (43)   "/" Dashboard → useDashboard + useWeather + components/dashboard/*
│   ├── add/page.tsx     (181)   "/add" ฟอร์มรายรับ/รายจ่าย: validation (zod) + DOMPurify + Supabase insert
│   ├── history/page.tsx (133)   "/history" ประวัติ, filter, summary, Excel export (Supabase query ในหน้า)
│   ├── login/page.tsx   (146)   "/login" signInWithPassword + remember email
│   ├── error.tsx         (48)   Error boundary ระดับ route
│   ├── not-found.tsx     (29)   404
│   ├── globals.css      (581)   Design tokens (CSS custom properties) + utility classes + animations
│   └── api/
│       ├── insights/route.ts      (141) POST → Gemini (ไม่มีหน้าใดเรียกใช้)
│       └── export-excel/route.ts   (57) GET stub คืน JSON จำลอง (ไม่มีหน้าใดเรียกใช้)
├── components/
│   ├── ClientLayout.tsx  (30)   ToastProvider + <main> + BottomNav + useKioskMode + theme init
│   ├── BottomNav.tsx    (125)   Nav 3 แท็บ: ภาพรวม / เพิ่มงาน / ประวัติ
│   ├── EditModal.tsx    (263)   แก้ไข/ลบ record หรือ expense (ใช้เฉพาะหน้า history)
│   ├── RecordCard.tsx    (59)   การ์ดรายรับ (ใช้ทั้ง dashboard และ history)
│   ├── add/        (9 files)    IncomeForm (271), ExpenseForm, DatePicker, ModeToggle, ActionButtons, ...
│   ├── dashboard/ (10 files)    Header, WeatherWidget, NetProfitHero, StatsRow, ChartsSection,
│   │                            CustomerBreakdownSection (244), RecordListSection, UnpaidAlert, UnpaidModal (180), LoadingSkeleton
│   ├── history/    (7 files)    Header, TabToggle, SummaryCard, FilterSection, HistoryList, ExportModal, constants
│   ├── icons/DashboardIcons.tsx SVG icons
│   └── ui/ErrorBanner.tsx       Error banner 3 variants
├── hooks/
│   ├── useDashboard.ts  (310)   fetch 4 queries + realtime + derived stats/chart/unpaid/customer breakdown + mark-paid
│   ├── useHistoryData.ts (76)   fetch รายปี + update + delete
│   ├── useAddRecord.ts   (56)   useAuthUser, useRecentCustomers (localStorage), useCustomerVisitCount (query)
│   ├── useWeather.ts    (340)   Open-Meteo weather + AQI, cache sessionStorage 30 นาที, retry
│   ├── useToast.tsx      (65)   Toast context
│   ├── useTheme.ts       (29)   dark/light ผ่าน localStorage + useSyncExternalStore
│   ├── useKioskMode.ts   (26)   reload บนหน้าอื่นแล้ว redirect กลับ "/"
│   └── __tests__/               dashboardComputation.test.ts, useWeatherCache.test.ts
├── lib/
│   ├── supabase.ts       (12)   Browser client (createBrowserClient) singleton
│   ├── serverAuth.ts     (36)   authenticateRequest() สำหรับ API routes
│   ├── env.ts            (67)   zod validation ของ env (fail-fast ตอน import)
│   ├── dateUtils.ts      (74)   date boundaries + split/merge datetime
│   ├── export.ts        (338)   Excel export (exceljs + file-saver) 2 โหมด: bank / internal
│   ├── generateBill.ts  (317)   PDF บิลเงินสด (jsPDF + font Sarabun จาก /public/fonts)
│   └── __tests__/               dateUtils.test.ts, env.test.ts
├── types/index.ts        (71)   Record, Expense, enums, CAR_TYPES (6), CAR_BRANDS (24), ชื่อลูกค้า default
├── tests/                       dateUtils.test.ts, useDashboard.test.ts  ← ซ้ำซ้อนกับ __tests__ (ดู technical-debt.md)
├── public/                      manifest.json, icons/, fonts/Sarabun-*.ttf, SVG boilerplate 5 ไฟล์ (ไม่ได้ใช้)
├── middleware.ts         (59)   Auth guard ของหน้า (ไม่ครอบ /api)
├── next.config.ts        (65)   Security headers + CSP
├── eslint.config.mjs, postcss.config.mjs, tsconfig.json, vitest.config.mts, vitest.setup.ts
├── .npmrc                       legacy-peer-deps=true
├── PROJECT_AUDIT.md             ⚠️ ล้าสมัย (ตรวจที่ 07095eb)
└── README.md                    ⚠️ ข้อมูลบางส่วนผิด (อ้าง WAQI API แต่โค้ดใช้ Open-Meteo AQI, clone URL เป็น placeholder)
```

## 2. Dependency Graph (ระดับโมดูล) [V]

```
app/page.tsx ──► hooks/useDashboard ──► lib/supabase ──► lib/env
            └──► hooks/useWeather          ▲
app/add/page.tsx ──► lib/supabase ─────────┘   (query + insert อยู่ในหน้าโดยตรง)
            └──► hooks/useAddRecord ──► lib/supabase
app/history/page.tsx ──► hooks/useHistoryData ──► lib/supabase
            ├──► lib/supabase (query สำหรับ export อยู่ในหน้า)
            ├──► components/EditModal ──► lib/supabase (auth.getUser)
            └──► (dynamic) lib/export
components/dashboard/UnpaidModal ──► (dynamic) lib/generateBill
components/dashboard/{ChartsSection,RecordListSection} ──► type ของ useDashboard (ReturnType<typeof useDashboard>)
app/api/* ──► lib/serverAuth ──► lib/env
```

ข้อสังเกตด้าน coupling (รายละเอียดใน `technical-debt.md`):
- การเรียก Supabase กระจายอยู่ 6 ไฟล์ (2 pages, 3 hooks, 1 component) ไม่มี data-access layer
- Component ของ dashboard รับ `dash: ReturnType<typeof useDashboard>` ทั้งก้อน ทำให้ component ผูกกับ hook

## 3. Toolchain [V]

| เครื่องมือ | เวอร์ชันที่ติดตั้งจริง (`npm ls`) | ระบุใน package.json |
|---|---|---|
| next | 16.2.1 | `16.2.1` (pinned) |
| react / react-dom | 19.2.4 | `19.2.4` (pinned) |
| typescript | 5.9.3 | `^5` |
| @supabase/supabase-js | 2.101.0 | `^2.101.0` |
| @supabase/ssr | 0.10.0 | `^0.10.0` |
| zod | 4.4.3 | `^4.4.3` |
| tailwindcss / @tailwindcss/postcss | 4.2.2 | `^4` |
| recharts | 3.8.1 | `^3.8.1` |
| exceljs | 4.4.0 | `^4.4.0` |
| jspdf | 4.2.1 | `^4.2.1` |
| isomorphic-dompurify | 3.12.0 | `^3.12.0` |
| file-saver | 2.0.5 | `^2.0.5` |
| vitest | 2.1.9 | `^2.1.9` |
| eslint / eslint-config-next | 9.39.4 / 16.2.1 | `^9` / `16.2.1` |

- Lockfile: `package-lock.json` ตรงกับ `node_modules` [V] (`npm ls` ไม่มี missing/invalid มีแค่ 5 แพ็กเกจ `@emnapi/*`, `@napi-rs/wasm-runtime`, `@tybys/wasm-util` เป็น extraneous ในเครื่องนี้ ซึ่งไม่กระทบ Vercel ที่ติดตั้งจาก lockfile)
- ไม่มี `engines` และ `packageManager` ใน `package.json` [V]
- TypeScript `strict: true`, `allowJs: true`, path alias `@/*` → root [V]
- ESLint ใช้ `next/core-web-vitals` + `next/typescript` [V]
