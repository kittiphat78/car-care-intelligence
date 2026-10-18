import { supabase } from '@/lib/supabase'
import { ok, type Result } from '@/lib/result'
import { listBetween, run } from '@/features/records/api'
import { listUnpaid } from '@/features/debts/api'
import { addDays, startOfBangkokDay } from '@/lib/time/bangkok'
import { EMPTY_TODAY, type CustomerTimePeriod, type CustomerTotals, type DayTotal, type TodayTotals } from '@/features/dashboard/logic'
import type { Record as AppRecord } from '@/types'

export interface DashboardData {
  /** Today's income records (from 00:00 Bangkok), oldest first */
  todayRecords: Result<AppRecord[]>
  /** Today's totals and yesterday's income (dashboard_today) */
  today: Result<TodayTotals>
  /** Income and expense per day for the last 30 days (daily_series) */
  series: Result<DayTotal[]>
  /** Income per customer this week / month / year (customer_breakdown) */
  customers: Result<CustomerTotals[]>
  /** All unpaid income, oldest first */
  unpaidRecords: Result<AppRecord[]>
}

/** Bigint columns arrive as numbers or, if ever beyond 2^53, as strings */
const num = (value: unknown) => Number(value ?? 0)

interface TodayRow {
  total_income: number; paid_income: number; unpaid_income: number; expense: number
  wash_count: number; polish_count: number; yesterday_income: number
}
interface SeriesRow { day: string; income: number; expense: number }
type BreakdownRow = { customer_key: string } & { [column: string]: number | string }

const period = (row: BreakdownRow, prefix: 'week' | 'month' | 'year'): CustomerTimePeriod => {
  const washAmount = num(row[`${prefix}_wash_amount`])
  const polishAmount = num(row[`${prefix}_polish_amount`])
  return {
    washCount: num(row[`${prefix}_wash_count`]),
    washAmount,
    polishCount: num(row[`${prefix}_polish_count`]),
    polishAmount,
    total: washAmount + polishAmount,
  }
}

const map = <T, U>(result: Result<T>, fn: (data: T) => U): Result<U> => (result.ok ? ok(fn(result.data)) : result)

/** Everything the dashboard shows. Each part can fail on its own so the rest still renders. */
export async function loadDashboard(today: string): Promise<DashboardData> {
  const [todayRecords, todayRows, seriesRows, breakdownRows, unpaidRecords] = await Promise.all([
    listBetween<AppRecord>('records', startOfBangkokDay(today), null, { ascending: true }),
    run(supabase.rpc('dashboard_today', { p_day: today })),
    run(supabase.rpc('daily_series', { p_from: addDays(today, -29), p_to: today })),
    run(supabase.rpc('customer_breakdown', { p_day: today })),
    listUnpaid(),
  ])

  return {
    todayRecords,
    today: map(todayRows, rows => {
      const row = (rows as TodayRow[] | null)?.[0]
      if (!row) return EMPTY_TODAY
      return {
        totalIncome: num(row.total_income),
        paidIncome: num(row.paid_income),
        unpaidIncome: num(row.unpaid_income),
        expense: num(row.expense),
        washCount: num(row.wash_count),
        polishCount: num(row.polish_count),
        yesterdayIncome: num(row.yesterday_income),
      }
    }),
    series: map(seriesRows, rows =>
      ((rows as SeriesRow[] | null) ?? []).map(r => ({ day: r.day, income: num(r.income), expense: num(r.expense) }))),
    customers: map(breakdownRows, rows =>
      ((rows as BreakdownRow[] | null) ?? []).map(r => ({
        key: r.customer_key,
        week: period(r, 'week'),
        month: period(r, 'month'),
        year: period(r, 'year'),
      }))),
    unpaidRecords,
  }
}
