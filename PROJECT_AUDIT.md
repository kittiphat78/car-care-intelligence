# PROJECT AUDIT — Car Care Intelligence

> **Audit Date:** 2026-09-13  
> **Auditor:** Senior Software Engineer / AI Assistant  
> **Status:** READ-ONLY AUDIT — NO CODE CHANGES MADE  
> **Branch audited:** `main` (commit `07095eb`)

---

## 1. Project Overview

| Item | Detail |
|------|--------|
| **Name** | Car Care Intelligence (carwash) |
| **Purpose** | Car wash business management system (Thai market) — daily income/expense tracking, customer management, debt tracking, weather alerts, Excel/PDF export |
| **Framework** | Next.js 16.2.1 (App Router) |
| **React** | 19.2.4 |
| **TypeScript** | ^5 (strict mode ON) |
| **Styling** | Tailwind CSS v4 + custom CSS design system (v4) |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (email/password) |
| **Deployment** | Vercel |
| **Target** | Mobile-first, parent-friendly, kiosk mode |
| **Production** | YES — has real users and real data |

---

## 2. Architecture

### 2.1 App Router Structure
```
app/
├── page.tsx          → Dashboard (/) — Client Component
├── login/page.tsx    → Login page — Client Component
├── add/page.tsx      → Add record (income/expense) — Client Component
├── history/page.tsx  → History/records viewer — Client Component
├── layout.tsx        → Root layout (Server Component with Sarabun font)
├── error.tsx         → Global error boundary
├── not-found.tsx     → 404 page
├── globals.css       → Design system v4
└── api/
    ├── export-excel/route.ts  → Rate-limited stub (no real export)
    └── insights/route.ts      → Gemini AI insights endpoint
```

### 2.2 Component Architecture
```
components/
├── ClientLayout.tsx      → Client wrapper (BottomNav + ToastProvider + KioskMode)
├── BottomNav.tsx          → Bottom navigation (3 tabs: Dashboard, Add, History)
├── EditModal.tsx          → Full edit/delete modal for records (280 lines)
├── RecordCard.tsx         → Card display for individual records
├── dashboard/             → 10 dashboard sub-components
├── history/               → 7 history sub-components + constants
├── add/                   → 9 add-record sub-components
├── ui/                    → ErrorBanner
└── icons/                 → DashboardIcons
```

### 2.3 Custom Hooks
```
hooks/
├── useDashboard.ts     → Main dashboard data (406 lines) — fetching, realtime, stats
├── useHistoryData.ts   → History CRUD operations
├── useAddRecord.ts     → Auth user, recent customers, visit count
├── useWeather.ts       → Open-Meteo weather + AQI (315 lines)
├── useToast.tsx        → Toast notification context/provider
├── useKioskMode.ts     → Redirect on page refresh (anti-pattern)
└── useTheme.ts         → Light/dark theme toggle
```

### 2.4 Library Files
```
lib/
├── supabase.ts         → Browser client singleton
├── export.ts           → Excel export (ExcelJS + file-saver, 374 lines)
└── generateBill.ts     → PDF bill generation (jsPDF, 378 lines)
```

---

## 3. Git State

### 3.1 Current Branch & Remote
- **Current:** `main` at `07095eb`
- **Remote:** `origin/main` at `07095eb` ✅ In sync
- **Remote URL:** `https://github.com/kittiphat78/car-care-intelligence.git`
- **Working tree:** Clean

### 3.2 Local Branches (13 total, only `main` tracks remote)

| Branch | Tracking | Status |
|--------|----------|--------|
| `main` | `origin/main` | ✅ Up to date |
| `feature/redesign-cash-bill-pdf` | No tracking | 3 commits ahead of main |
| `fix/input-sanitization-and-api-auth` | No tracking | **CRITICAL — Unmerged security fix** |
| `fix/prevent-duplicate-submit` | No tracking | **CRITICAL — Unmerged bug fix** |
| `refactor/frontend-structure` | No tracking | Already in main |
| `ui/customer-breakdown-redesign` | Tracks remote | Already in main |
| `ui/design-system-v4` | No tracking | Already in main |
| `ui/polish-and-feedback` | No tracking | Already in main |
| `ui/polish-animations` | No tracking | Already in main |
| `ui/redesign-dashboard` | No tracking | Already in main |
| `ui/redesign-forms` | No tracking | Already in main |
| `ui/redesign-history` | No tracking | Already in main |
| `ui/weather-widget-realtime` | Tracks remote | Already in main |

### 3.3 Remote Branches (Many stale)
30+ remote branches, most already merged. Several stale feature branches exist on remote.

---

## 4. Production State

### 4.1 Deployment
- Deployed to **Vercel** (inferred from `.vercel` in gitignore, `.npmrc` with `legacy-peer-deps`)
- HTTPS enforced via HSTS headers
- Security headers configured (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)

### 4.2 Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` ✅ Set
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅ Set (anon key, safe for client)
- `GEMINI_API_KEY` — Not set in `.env.local` (insights API will return graceful fallback)
- `.env.local` is NOT tracked by git ✅
- No service role key exposed ✅

### 4.3 Database (Supabase)
- **Tables used:** `records`, `expenses`
- **RLS:** Cannot verify from code alone — requires Supabase dashboard check
- **Realtime:** Enabled for `records` and `expenses` tables (used in useDashboard)
- **Auth:** Email/password authentication via Supabase Auth

---

## 5. Confirmed Problems

### 🔴 CRITICAL

#### C1: `.gitignore` File Corruption
- **File:** `.gitignore` lines 42-47
- **Problem:** Contains null-byte-encoded Unicode characters (UTF-16 BOM artifact). These lines are garbled and non-functional.
- **Impact:** May cause git to misbehave; entries won't actually ignore anything.
- **Fix:** Clean the file to valid UTF-8.

#### C2: Unmerged Security & Bug Fix Branches
- **Branches:** `fix/input-sanitization-and-api-auth`, `fix/prevent-duplicate-submit`
- **Problem:** These branches contain confirmed security (input sanitization, API auth checks) and bug fixes (duplicate submission prevention) that are NOT in `main` and therefore NOT deployed.
- **Impact:** Production is running without input sanitization on EditModal and without duplicate submission guards.
- **Fix:** Review, test, and merge into main.

---

### 🟠 HIGH

#### H1: `setRecords()` Called Inside `useMemo` 
- **File:** `hooks/useDashboard.ts` line 219
- **Problem:** `setRecords(todayRecords)` is called inside a `useMemo` callback. This is a React anti-pattern — side effects in memos can cause infinite render loops and unpredictable behavior.
- **Impact:** Potential render-loop risk, unpredictable updates.
- **Fix:** Extract to `useEffect` or derive `records` as a computed value.

#### H2: Missing `vitest.setup.ts` File
- **File:** Referenced in `vitest.config.mts` line 10 but does NOT exist
- **Problem:** Running `vitest` will fail immediately because the setup file is missing.
- **Impact:** Test runner completely broken.
- **Fix:** Create the setup file or remove the reference.

#### H3: Empty Test Directories
- **Dirs:** `components/history/__tests__/`, `components/add/__tests__/`, `components/ui/__tests__/`
- **Problem:** Test directories exist but contain zero test files. Zero test coverage.
- **Impact:** No automated testing, any change can introduce regressions undetected.

#### H4: API Routes Not Authenticated
- **File:** `app/api/insights/route.ts`
- **Problem:** POST endpoint accepts requests without any authentication. Anyone can call it.
- **Impact:** Cost exposure (Gemini API calls), potential abuse.
- **File:** `app/api/export-excel/route.ts`
- **Problem:** GET endpoint is a stub that returns mock data. Rate limiting exists but no auth.

#### H5: EditModal Missing Input Validation
- **File:** `components/EditModal.tsx`
- **Problem:** The `handleSave` function (line 99-107) sends data to Supabase without validation or sanitization, unlike the Add page which uses Zod + DOMPurify. This is the exact fix in the unmerged `fix/input-sanitization-and-api-auth` branch.
- **Impact:** Potential XSS if malicious input is stored and rendered elsewhere.

---

### 🟡 MEDIUM

#### M1: Kiosk Mode Anti-Pattern
- **File:** `hooks/useKioskMode.ts`
- **Problem:** Redirects to `/` on any page refresh (except `/` and `/login`). This breaks normal browser behavior and confuses users who refresh.
- **Impact:** Poor UX — users lose their place on page refresh.

#### M2: Hardcoded Geographic Coordinates
- **File:** `hooks/useWeather.ts` lines 203, 211
- **Problem:** Latitude/longitude hardcoded to `19.91/99.84` (Chiang Rai). Not configurable.
- **Impact:** Weather data is only correct for one location.

#### M3: `useWeather` Hook Size (315 lines)
- **Problem:** Weather code mapping, theme generation, and message building are all in one hook. Could be split into separate modules.
- **Impact:** Code maintainability.

#### M4: `useDashboard` Hook Size (406 lines)
- **Problem:** Massive single hook managing auth, data fetching, realtime subscriptions, stats computation, chart data, grouped unpaid, customer breakdown — all in one file.
- **Impact:** Hard to test individually, hard to maintain.

#### M5: Login Page `router.refresh()` Before `router.push()`
- **File:** `app/login/page.tsx` line 39
- **Problem:** `router.refresh()` is called before `router.push('/')`. The refresh may be unnecessary or cause a race condition.

#### M6: Unused `@supabase/auth-helpers-nextjs` Dependency
- **File:** `package.json` line 12
- **Problem:** `@supabase/auth-helpers-nextjs` is listed as a dependency but never imported. The project uses `@supabase/ssr` instead.
- **Impact:** Unnecessary bundle size increase.

#### M7: Bill Number Stored in localStorage
- **File:** `lib/generateBill.ts` line 33
- **Problem:** Sequential bill numbers stored in `localStorage` are per-device and can be reset by clearing browser data. Not reliable for business records.

#### M8: Date/Time Timezone Handling
- **Files:** Multiple hooks
- **Problem:** Mixing `new Date()` local time with `.toISOString()` (UTC) throughout. While functional, this can cause edge-case bugs around midnight (records appearing on wrong day).

---

### 🟢 LOW

#### L1: Unused SVG Assets in `/public`
- `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` — default Next.js boilerplate files never used.

#### L2: Types File Extension `.tsx`
- **File:** `types/index.tsx` — Should be `.ts` since it contains no JSX.

#### L3: Thai Comments Mixed with English
- Consistent within the project but may affect onboarding of non-Thai developers.

#### L4: `RecordCard.tsx` at Root Components Level
- Placed at `components/RecordCard.tsx` instead of inside `components/dashboard/` where it's used.

#### L5: `generateBill.ts` Bill Number Format
- Uses a simple incrementing number, not the date-based format described in the comment (RMyyMMdd-xxx).

#### L6: `ExportModal` Default Year/Month Logic
- When `selectedMonth === 0`, defaults to `new Date().getMonth() + 1` which may not match user intent.

---

## 6. Code Quality Assessment

| Aspect | Score | Notes |
|--------|-------|-------|
| **TypeScript** | ✅ Excellent | Strict mode, zero errors, no `any`, no `@ts-ignore` |
| **ESLint** | ✅ Clean | Zero lint errors |
| **Component Structure** | ✅ Good | Well-decomposed into feature folders |
| **Design System** | ✅ Strong | Custom CSS variables, dual theme, WCAG AA |
| **Error Handling** | ✅ Good | Error boundary, error states, toast notifications |
| **Security Headers** | ✅ Good | HSTS, X-Frame-Options, X-Content-Type-Options |
| **Input Validation (Add)** | ✅ Good | Zod + DOMPurify |
| **Input Validation (Edit)** | ❌ Missing | No validation in EditModal |
| **Testing** | ❌ None | Zero tests, broken vitest setup |
| **RLS Verification** | ⚠️ Unknown | Cannot verify from code, requires Supabase dashboard |
| **API Auth** | ❌ Missing | API routes have no authentication |

---

## 7. Performance Assessment

| Aspect | Assessment |
|--------|------------|
| **Data Fetching** | Good — parallel Promise.all, debounced realtime |
| **Memoization** | Good — useMemo for stats, chart data, customer breakdown |
| **Bundle** | Moderate — ExcelJS + jsPDF are heavy client-side deps |
| **Rendering** | ⚠️ setRecords inside useMemo (H1) |
| **Font** | Good — Google Fonts with `swap` display |
| **Images** | N/A — no user images |
| **CSS** | Good — minimal, custom properties, GPU-accelerated animations |

---

## 8. Recommended Fix Order

| Priority | Item | Estimated Effort |
|----------|------|-----------------|
| 1 | Fix `.gitignore` corruption (C1) | 5 min |
| 2 | Create `vitest.setup.ts` (H2) | 5 min |
| 3 | Merge security/bug fix branches (C2) | 30 min (review + test + merge) |
| 4 | Fix `setRecords` in useMemo (H1) | 15 min |
| 5 | Add auth to API routes (H4) | 20 min |
| 6 | UX/UI Redesign (Step 3) | 4-8 hours |
| 7 | Code quality/performance (Step 4) | 2-4 hours |
| 8 | Testing (Step 5) | 2-4 hours |

---

## 9. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| No tests exist | High | Any change can break production silently |
| RLS not verified | High | Must check Supabase dashboard before making DB changes |
| Unmerged security fixes | Critical | Merge before any other work |
| No staging/preview environment confirmed | Medium | Test in preview deployments before production |

---

> **Status: AUDIT COMPLETE — READY FOR STEP 2**
