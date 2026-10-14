# Design-to-Code Map — Step 04

> วันที่: 2026-10-14 · ใช้เป็นแผนที่สำหรับ Step 07 (implement) **ไม่มีการแก้โค้ดใน Step นี้**
> Stack ที่ตรวจแล้ว: Next.js 16 App Router, React 19, Tailwind CSS v4 (`@tailwindcss/postcss`), TypeScript strict ([V] `package.json`)
> โครงสร้างโฟลเดอร์และ library ที่มีเครื่องหมาย ⓢ ต้องยืนยันใน **Step 05** (architecture)

## 1. Token → CSS → Tailwind

### 1.1 วิธีวาง token
1. `app/styles/tokens.css` ⓢ: primitive + semantic เป็น CSS variables บน `:root` (theme มืด) และ `[data-theme="light"]`
2. `app/globals.css`: `@import "tailwindcss";` + `@import "./styles/tokens.css";` + `@theme inline { … }` เพื่อ map semantic → utility
3. Component ใช้ **utility ที่ map แล้วเท่านั้น** เช่น `bg-surface text-text-secondary border-border-strong` และห้ามใช้ `bg-[var(--…)]` หรือ hex

### 1.2 ตัวอย่าง mapping (Tailwind v4 `@theme inline`)

```css
/* app/globals.css — ตัวอย่างโครง (ยังไม่ implement) */
@theme inline {
  --color-bg: var(--color-bg);
  --color-surface: var(--color-surface);
  --color-surface-2: var(--color-surface-2);
  --color-text: var(--color-text);
  --color-text-secondary: var(--color-text-secondary);
  --color-text-tertiary: var(--color-text-tertiary);
  --color-border: var(--color-border);
  --color-border-strong: var(--color-border-strong);
  --color-primary: var(--color-action-primary);
  --color-primary-hover: var(--color-action-primary-hover);
  --color-primary-subtle: var(--color-action-primary-subtle);
  --color-link: var(--color-text-link);
  --color-success: var(--color-success);
  /* … ครบทุก semantic ใน design-tokens.md §3 … */
  --font-sans: var(--font-sarabun), "Sarabun", system-ui, sans-serif;
  --breakpoint-md: 600px;
  --breakpoint-lg: 1024px;
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-xl: 20px;
}
```

> ⚠ ชื่อ variable ซ้ำระหว่าง token กับ `@theme` ต้องตรวจว่า Tailwind v4 ไม่วน reference (ใช้ prefix `--cc-` ใน tokens.css ถ้าชน) → ทดสอบใน spike ของ Step 07 (S04-04)

### 1.3 ตาราง utility หลัก

| Token | Utility | Token | Utility |
|---|---|---|---|
| `--color-bg` | `bg-bg` | `--color-income` | `text-income` |
| `--color-surface` | `bg-surface` | `--color-expense` | `text-expense` |
| `--color-surface-2` | `bg-surface-2` | `--color-unpaid` | `text-unpaid` |
| `--color-text` | `text-text` | `--color-job-wash` | `text-wash`, `border-wash` |
| `--color-text-secondary` | `text-text-secondary` | `--color-job-polish` | `text-polish`, `border-polish` |
| `--color-border-strong` | `border-border-strong` | `--space-*` | `p-4`, `gap-3` … (scale เดียวกับ Tailwind 4px) |
| `--color-action-primary` | `bg-primary` | `--text-body` | `text-base` (16px) |
| `--color-focus-ring` | `ring-focus` / `outline-focus` | `--text-caption` | `text-sm` (14px) |

ห้ามใช้ utility `text-xs` (12px) และ `text-[10px|11px|12px]` โดยจะเพิ่ม lint rule ใน Step 07 (S04-05)

## 2. Theme Switching
- คง attribute `data-theme` บน `<html>` และ localStorage key `car-care-theme` เดิม (ผู้ใช้ไม่เสียค่าที่ตั้งไว้)
- คง inline script กัน theme กะพริบใน `app/layout.tsx` แต่ลบการตั้งซ้ำใน `ClientLayout` (TD-12)
- `<meta name="theme-color">` อัปเดตตาม theme (#0B111A / #F4F6F9)

## 3. Component → File

### 3.1 โครงสร้างโฟลเดอร์ที่เสนอ ⓢ

```
components/
  ui/          primitives (Button, Dialog, …)
  patterns/    FormField, ActionBar, BottomNav, SideNav, …
features/
  dashboard/components/   MoneyHero, DebtSummaryCard, ChartCard, CustomerBreakdownCard, WeatherStrip
  debts/components/       DebtCustomerCard
  records/components/     RecordRow, RecordEditor, AuditInfo
  history/components/     PeriodSummary, FilterPanel, DayGroupHeader, ExportForm, RecordTable
  auth/components/        LoginForm
```

### 3.2 Mapping: ของใหม่ ← ของเดิม

| Component ใหม่ | ไฟล์ที่เสนอ ⓢ | แทนที่ของเดิม | หมายเหตุ |
|---|---|---|---|
| Button, IconButton | `components/ui/Button.tsx` | `.btn*` ใน `globals.css`, ปุ่ม inline ทุกไฟล์ | |
| TextInput | `components/ui/TextInput.tsx` | `.input` | |
| ChoiceGroup / Chip | `components/ui/ChoiceGroup.tsx` | `ServiceTypeButton.tsx`, ปุ่มเลือกใน `IncomeForm.tsx`, `ExpenseForm.tsx`, `EditModal.tsx`, `FilterSection.tsx` | รวม 5 ที่ (TD-08) |
| SegmentedControl / Tabs | `components/ui/Tabs.tsx` | `.segmented-control`, `ModeToggle.tsx`, `TabToggle.tsx` | |
| Card | `components/ui/Card.tsx` | `.card`, `.card-elevated`, `.card-dark`, `.card-gradient`, `add/Shared.tsx#Card` | |
| Badge | `components/ui/Badge.tsx` | `.badge*` | |
| Dialog, ConfirmDialog | `components/ui/Dialog.tsx`, `components/patterns/ConfirmDialog.tsx` | modal ใน `EditModal.tsx`, `UnpaidModal.tsx`, `ExportModal.tsx`, `window.confirm` | ⓢ `<dialog>` native หรือ headless library (S04-01) |
| Toast | `components/ui/Toast.tsx` + provider | `hooks/useToast.tsx`, `.toast*` | แยก role ตาม tone |
| Banner | `components/ui/Banner.tsx` | `components/ui/ErrorBanner.tsx`, `add/Banners.tsx` | |
| Skeleton | `components/ui/Skeleton.tsx` | `.skeleton`, `dashboard/LoadingSkeleton.tsx` | skeleton รายส่วน |
| Icon | `components/ui/Icon.tsx` | `icons/DashboardIcons.tsx`, `add/Icons.tsx`, SVG inline ทุกไฟล์ | ⓢ Lucide (S04-01) |
| Checkbox, Switch | `components/ui/Checkbox.tsx`, `Switch.tsx` | checkbox ใน login, `.theme-toggle` | |
| FormField, FormErrorSummary | `components/patterns/FormField.tsx` | `add/Shared.tsx#SectionLabel` | ER-24 |
| PlateField, MoneyField, DateField, TimeField, SearchField, CustomerField, BrandPicker, MonthYearPicker | `components/patterns/fields/*` | `add/DatePicker.tsx`, ช่องใน `IncomeForm.tsx`, `ExpenseForm.tsx`, `EditModal.tsx`, `history/Header.tsx`, `FilterSection.tsx`, `ExportModal.tsx` | |
| ActionBar | `components/patterns/ActionBar.tsx` | `add/ActionButtons.tsx` | |
| EmptyState, ErrorState | `components/patterns/EmptyState.tsx` | `.empty-state*` | |
| StatusBar | `components/patterns/StatusBar.tsx` | — (ใหม่) | A-08, offline |
| PageHeader | `components/patterns/PageHeader.tsx` | `dashboard/Header.tsx`, `history/Header.tsx`, header ใน `app/add/page.tsx` | |
| BottomNav, SideNav, AppShell | `components/patterns/nav/*` | `BottomNav.tsx`, `ClientLayout.tsx` | ลบ `useKioskMode` |
| ChartCard | `features/dashboard/components/ChartCard.tsx` | `dashboard/ChartsSection.tsx` | สีจาก tokens |
| DataTable | `components/patterns/DataTable.tsx` | — (ใหม่) | Expanded history |
| MoneyHero, StatItem | `features/dashboard/components/*` | `NetProfitHero.tsx`, `StatsRow.tsx` | D-13 |
| DebtSummaryCard | `features/dashboard/components/` | `UnpaidAlert.tsx` | |
| CustomerBreakdownCard | `features/dashboard/components/` | `CustomerBreakdownSection.tsx` | logic merge ย้ายไป pure function (TD-22) |
| WeatherStrip, WeatherDetail, RainAlert | `features/dashboard/components/` | `WeatherWidget.tsx` | |
| DebtCustomerCard | `features/debts/components/` | ส่วนการ์ดใน `UnpaidModal.tsx` | |
| RecordRow | `features/records/components/` | `RecordCard.tsx`, รายการรายจ่ายใน `HistoryList.tsx` | |
| RecordEditor, AuditInfo | `features/records/components/` | `IncomeForm.tsx`, `ExpenseForm.tsx`, `EditModal.tsx` | ฟอร์มชุดเดียว (DP-5) |
| PeriodSummary, FilterPanel, DayGroupHeader, ExportForm | `features/history/components/` | `SummaryCard.tsx`, `FilterSection.tsx`, `HistoryList.tsx`, `ExportModal.tsx` | |
| LoginForm | `features/auth/components/` | ฟอร์มใน `app/login/page.tsx` | |

## 4. Route → Page File

| Route | ไฟล์ | สถานะ |
|---|---|---|
| `/login` | `app/login/page.tsx` | แก้ |
| `/` | `app/page.tsx` | แก้ |
| `/debts` | `app/debts/page.tsx` | **ใหม่** ⓢ (route group สำหรับ shell เช่น `app/(app)/…` ตัดสิน Step 05) |
| `/add` | `app/add/page.tsx` | แก้ |
| `/history` | `app/history/page.tsx` | แก้ |
| `/more` | `app/more/page.tsx` | **ใหม่** |
| not-found / error | `app/not-found.tsx`, `app/error.tsx` | แก้ |
| Route guard | `middleware.ts` → `proxy.ts` (TD-27) | แก้ และเพิ่ม `/debts`, `/more` ใน protected routes + `next` param |
| Dialog URL state | `?edit`, `?settle`, `?export`, `?logout` ผ่าน `useSearchParams` ⓢ | ใหม่ |

## 5. CSS เดิมที่จะลบ (หลัง migrate ครบทุกหน้า)

`globals.css` เดิม 581 บรรทัด: ลบ class ต่อไปนี้เมื่อไม่มีการอ้างถึงแล้ว (ตรวจด้วย grep ก่อนลบทุกครั้ง)

`.card`, `.card-elevated`, `.card-dark`, `.card-gradient`, `.btn*`, `.input`, `.label`, `.badge*`, `.segmented-control*`, `.skeleton`, `.toast*`, `.theme-toggle`, `.empty-state*`, `.section-header*`, `.stat-value`, `.glass`, `.content-with-nav`, `.no-scrollbar`, animation classes (`.fade-up`, `.delay-*`, `.slide-up-spring`, `.bounce-in`, `.float-soft`, `.pulse-urgent`, `.toast-in/out`) และ token เดิมใน `design-tokens.md` §13

ลำดับ: ทำ tokens ใหม่คู่ขนานกับของเดิมก่อน (ชื่อไม่ชน) แล้วย้ายทีละหน้าตาม release slice (R2 Add → R3 Dashboard/Debts → R4 History → R5 ที่เหลือ) และลบของเดิมใน R5 (CR-09, D-11)

## 6. Assets
- ฟอนต์ Sarabun: `next/font/google` (หน้าจอ) + `public/fonts/Sarabun-*.ttf` (PDF) โดยลดน้ำหนักจาก 5 เหลือ 4 (เลิก 800)
- Manifest: `theme_color`/`background_color` → `#0B111A` และ shortcuts ตาม `sitemap.md` §3
- ไอคอน PWA: คงเดิม (ไม่อยู่ใน scope ของการออกแบบใหม่)

## 7. Dependencies ที่อาจเพิ่ม (ต้องอนุมัติใน Step 05)

| Package | เหตุผล | ทางเลือกที่ไม่ต้องเพิ่ม |
|---|---|---|
| `lucide-react` | ชุดไอคอนเดียวทั้งระบบ, tree-shake และ MIT | เขียน SVG เองเหมือนเดิม (ดูแลยาก) |
| Headless dialog (เช่น Radix Dialog) | focus trap และ a11y ที่ทดสอบแล้ว | `<dialog>` native + polyfill focus trap เอง |
| `@axe-core/playwright` (dev) | a11y test ใน CI | ตรวจมือ |
