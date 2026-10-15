import { DEFAULT_CUSTOMER_NAME } from '@/types'
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
