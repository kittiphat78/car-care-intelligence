import { DEFAULT_CUSTOMER_NAME, type Record as AppRecord } from '@/types'
import { addDays, formatBangkok, startOfBangkokDay } from '@/lib/time/bangkok'

/** dashboard_today(): today's totals (M006) */
export interface TodayTotals {
  totalIncome: number
  paidIncome: number
  unpaidIncome: number
  expense: number
  washCount: number
  polishCount: number
  yesterdayIncome: number
}

/** One row of daily_series(): a Bangkok day and its totals */
export interface DayTotal {
  day: string
  income: number
  expense: number
}

export interface CustomerTimePeriod {
  washCount: number
  washAmount: number
  polishCount: number
  polishAmount: number
  total: number
}

/** One row of customer_breakdown(); `key` is the trimmed stored name, '' for the general customer */
export interface CustomerTotals {
  key: string
  week: CustomerTimePeriod
  month: CustomerTimePeriod
  year: CustomerTimePeriod
}

export interface CustomerBreakdownItem {
  customerName: string
  week: CustomerTimePeriod
  month: CustomerTimePeriod
  year: CustomerTimePeriod
}

export interface DashboardStats {
  todayTotalIncome: number
  todayPaid: number
  todayUnpaid: number
  todayExpense: number
  netProfit: number
  washCount: number
  polishCount: number
  diffAmount: number
  diffPct: number
  isUp: boolean
}

export type ChartMode = 'week' | 'month'

export const EMPTY_TODAY: TodayTotals = {
  totalIncome: 0, paidIncome: 0, unpaidIncome: 0, expense: 0, washCount: 0, polishCount: 0, yesterdayIncome: 0,
}

/** Hero card and stat row figures (net = cash received today − today's expenses, D-02) */
export function toStats(t: TodayTotals): DashboardStats {
  const diffAmount = t.totalIncome - t.yesterdayIncome
  return {
    todayTotalIncome: t.totalIncome,
    todayPaid: t.paidIncome,
    todayUnpaid: t.unpaidIncome,
    todayExpense: t.expense,
    netProfit: t.paidIncome - t.expense,
    washCount: t.washCount,
    polishCount: t.polishCount,
    diffAmount,
    diffPct: t.yesterdayIncome > 0 ? Math.round((diffAmount / t.yesterdayIncome) * 100) : 0,
    isUp: diffAmount >= 0,
  }
}

/**
 * Chart bars for the last 7 or 30 days ending `today`. Days missing from `series`
 * show as 0, so the chart always has one bar per day.
 */
export function toChartData(series: DayTotal[], mode: ChartMode, today: string) {
  const days = mode === 'week' ? 7 : 30
  const byDay = new Map(series.map(d => [d.day, d]))
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i - (days - 1))
    const start = startOfBangkokDay(day)
    const totals = byDay.get(day)
    return {
      label: mode === 'week' ? formatBangkok(start, { weekday: 'short' }) : formatBangkok(start, { day: 'numeric' }),
      income: totals?.income ?? 0,
      expense: totals?.expense ?? 0,
    }
  })
}

const addPeriod = (a: CustomerTimePeriod, b: CustomerTimePeriod): CustomerTimePeriod => ({
  washCount: a.washCount + b.washCount,
  washAmount: a.washAmount + b.washAmount,
  polishCount: a.polishCount + b.polishCount,
  polishAmount: a.polishAmount + b.polishAmount,
  total: a.total + b.total,
})

/**
 * Customer cards: the unnamed customer is shown as "ลูกค้าทั่วไป" (merged with a
 * customer literally named that, as before), sorted by this month's total.
 */
export function toCustomerBreakdown(rows: CustomerTotals[]): CustomerBreakdownItem[] {
  const byName = new Map<string, CustomerBreakdownItem>()
  for (const row of rows) {
    const customerName = row.key || DEFAULT_CUSTOMER_NAME
    const seen = byName.get(customerName)
    byName.set(customerName, seen
      ? { customerName, week: addPeriod(seen.week, row.week), month: addPeriod(seen.month, row.month), year: addPeriod(seen.year, row.year) }
      : { customerName, week: row.week, month: row.month, year: row.year })
  }
  return [...byName.values()].sort((a, b) => b.month.total - a.month.total || b.year.total - a.year.total)
}

// ── Redesign (C4) ────────────────────────────────────────────────────────────

export interface DebtSummary {
  total: number
  /** Customers with something unpaid; all unnamed jobs count as one ("ลูกค้าทั่วไป") */
  customers: number
  cars: number
}

export function toDebtSummary(unpaid: readonly AppRecord[]): DebtSummary {
  const names = new Set(unpaid.map((r) => (r.customer_name ?? '').trim()))
  return { total: unpaid.reduce((sum, r) => sum + r.price, 0), customers: names.size, cars: unpaid.length }
}

/** Today's list: newest first (S03-03) */
export function newestFirst(records: readonly AppRecord[]): AppRecord[] {
  return [...records].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
}

/** Sentence under the chart, so the numbers do not depend on reading the bars */
export function chartSummary(data: ReadonlyArray<{ income: number; expense: number }>): { income: number; expense: number } {
  return data.reduce((acc, d) => ({ income: acc.income + d.income, expense: acc.expense + d.expense }), { income: 0, expense: 0 })
}

/** Greeting by Bangkok hour */
export function greeting(hour: number): string {
  if (hour < 12) return 'สวัสดีตอนเช้า'
  if (hour < 17) return 'สวัสดีตอนบ่าย'
  return 'สวัสดีตอนเย็น'
}

export type CustomerPeriodKey = 'week' | 'month' | 'year'

export interface CustomerShare {
  name: string
  total: number
  /** 0–100, of the period's total */
  percent: number
  washCount: number
  washAmount: number
  polishCount: number
  polishAmount: number
}

/**
 * Top customers for a period plus the general customer (D-04). Customers with nothing
 * in the period are left out.
 */
export function topCustomers(items: readonly CustomerBreakdownItem[], period: CustomerPeriodKey, top = 4): CustomerShare[] {
  const withSales = items.filter((i) => i[period].total > 0)
  const grand = withSales.reduce((sum, i) => sum + i[period].total, 0)
  const toShare = (i: CustomerBreakdownItem): CustomerShare => ({
    name: i.customerName,
    total: i[period].total,
    percent: grand > 0 ? Math.round((i[period].total / grand) * 100) : 0,
    washCount: i[period].washCount,
    washAmount: i[period].washAmount,
    polishCount: i[period].polishCount,
    polishAmount: i[period].polishAmount,
  })
  const sorted = [...withSales].sort((a, b) => b[period].total - a[period].total)
  const named = sorted.filter((i) => i.customerName !== DEFAULT_CUSTOMER_NAME).slice(0, top)
  const general = sorted.find((i) => i.customerName === DEFAULT_CUSTOMER_NAME)
  return [...named, ...(general ? [general] : [])].map(toShare)
}

// ── Glass home (ADR-28) — only data the dashboard already loads ──────────────

const EMPTY_PERIOD: CustomerTimePeriod = { washCount: 0, washAmount: 0, polishCount: 0, polishAmount: 0, total: 0 }

/** Income of this week (from Monday) and this month, summed over every customer of customer_breakdown() */
export function periodTotals(rows: readonly CustomerTotals[]): { week: CustomerTimePeriod; month: CustomerTimePeriod } {
  return rows.reduce(
    (acc, r) => ({ week: addPeriod(acc.week, r.week), month: addPeriod(acc.month, r.month) }),
    { week: EMPTY_PERIOD, month: EMPTY_PERIOD },
  )
}

/** Named customers with income this month (walk-ins without a name are not counted) */
export function customersThisMonth(rows: readonly CustomerTotals[]): number {
  return new Set(rows.filter((r) => r.key.trim() !== '' && r.key !== DEFAULT_CUSTOMER_NAME && r.month.total > 0).map((r) => r.key.trim())).size
}

/** Share of today's income already received, and of the jobs that were washes (0–100) */
export function todayShares(stats: DashboardStats): { paidPct: number; washPct: number } {
  const jobs = stats.washCount + stats.polishCount
  return {
    paidPct: stats.todayTotalIncome > 0 ? Math.round((stats.todayPaid / stats.todayTotalIncome) * 100) : 0,
    washPct: jobs > 0 ? Math.round((stats.washCount / jobs) * 100) : 0,
  }
}

