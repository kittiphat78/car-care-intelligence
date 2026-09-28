/**
 * Tests for the pure computational logic used inside useDashboard.
 * We test the same algorithms (stats aggregation, chart bucketing,
 * unpaid grouping, customer breakdown) without Supabase or React deps.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseDateMs, getStartOfDay, getStartOfYesterday, getDaysAgo, getStartOfWeek, getStartOfMonth, getStartOfYear } from '@/lib/dateUtils'
import type { Record as AppRecord, Expense } from '@/types'
import { DEFAULT_CUSTOMER_NAME, DEFAULT_CUSTOMER_NAME_UNPAID } from '@/types'

// ─── Helper: create mock records ────────────────────────────────────────────

function makeRecord(overrides: Partial<AppRecord> & { created_at: string; price: number }): AppRecord {
  return {
    id: crypto.randomUUID(),
    type: 'wash',
    plate: 'กข 1234',
    services: ['ล้าง'],
    seq_number: 1,
    payment_status: 'paid',
    job_status: 'done',
    ...overrides,
  }
}

function makeExpense(overrides: Partial<Expense> & { created_at: string; amount: number }): Expense {
  return {
    id: crypto.randomUUID(),
    title: 'ค่าน้ำ',
    note: null,
    ...overrides,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

// ─── Stats Computation (mirrors useDashboard.stats useMemo) ─────────────────

function computeStats(allRecords: AppRecord[], expenses: Expense[]) {
  const todayStartMs = getStartOfDay().getTime()
  const yesterdayStartMs = getStartOfYesterday().getTime()

  const todayRecords: AppRecord[] = []
  let yesterdayIncome = 0

  for (let i = allRecords.length - 1; i >= 0; i--) {
    const r = allRecords[i]
    const t = parseDateMs(r.created_at)
    if (t >= todayStartMs) {
      todayRecords.push(r)
    } else if (t >= yesterdayStartMs) {
      yesterdayIncome += r.price
    } else {
      break
    }
  }

  let todayTotalIncome = 0
  let todayPaid = 0
  let todayUnpaid = 0
  let washCount = 0
  let polishCount = 0

  for (const r of todayRecords) {
    todayTotalIncome += r.price
    if (r.payment_status === 'paid') todayPaid += r.price
    if (r.payment_status === 'unpaid') todayUnpaid += r.price
    if (r.type === 'wash') washCount++
    if (r.type === 'polish') polishCount++
  }

  const todayExpense = expenses
    .filter(e => parseDateMs(e.created_at) >= todayStartMs)
    .reduce((s, e) => s + e.amount, 0)

  const diffAmount = todayTotalIncome - yesterdayIncome

  return {
    todayTotalIncome,
    todayPaid,
    todayUnpaid,
    todayExpense,
    netProfit: todayPaid - todayExpense,
    washCount,
    polishCount,
    diffAmount,
    diffPct: yesterdayIncome > 0 ? Math.round((diffAmount / yesterdayIncome) * 100) : 0,
    isUp: diffAmount >= 0,
  }
}

describe('Dashboard stats computation', () => {
  it('computes totals correctly for a set of today records', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 200, type: 'wash', payment_status: 'paid' }),
      makeRecord({ created_at: '2026-09-28T09:00:00', price: 350, type: 'polish', payment_status: 'paid' }),
      makeRecord({ created_at: '2026-09-28T10:00:00', price: 150, type: 'wash', payment_status: 'unpaid' }),
    ]

    const stats = computeStats(records, [])

    expect(stats.todayTotalIncome).toBe(700)
    expect(stats.todayPaid).toBe(550)
    expect(stats.todayUnpaid).toBe(150)
    expect(stats.washCount).toBe(2)
    expect(stats.polishCount).toBe(1)
    expect(stats.netProfit).toBe(550) // paid - expense(0)
  })

  it('calculates net profit as paid minus expenses', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 500, payment_status: 'paid' }),
    ]
    const expenses: Expense[] = [
      makeExpense({ created_at: '2026-09-28T07:00:00', amount: 120 }),
      makeExpense({ created_at: '2026-09-28T12:00:00', amount: 80 }),
    ]

    const stats = computeStats(records, expenses)

    expect(stats.todayExpense).toBe(200)
    expect(stats.netProfit).toBe(300) // 500 - 200
  })

  it('computes day-over-day difference correctly', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    // Yesterday: 1000 income
    // Today: 1200 income → diff = +200, pct = +20%
    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-27T10:00:00', price: 600 }),
      makeRecord({ created_at: '2026-09-27T14:00:00', price: 400 }),
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 700 }),
      makeRecord({ created_at: '2026-09-28T11:00:00', price: 500 }),
    ]

    const stats = computeStats(records, [])

    expect(stats.todayTotalIncome).toBe(1200)
    expect(stats.diffAmount).toBe(200)
    expect(stats.diffPct).toBe(20)
    expect(stats.isUp).toBe(true)
  })

  it('handles negative day-over-day difference', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    // Yesterday: 1000, Today: 600 → diff = -400, pct = -40%
    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-27T10:00:00', price: 1000 }),
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 600 }),
    ]

    const stats = computeStats(records, [])

    expect(stats.diffAmount).toBe(-400)
    expect(stats.diffPct).toBe(-40)
    expect(stats.isUp).toBe(false)
  })

  it('returns diffPct of 0 when yesterday income is 0', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 500 }),
    ]

    const stats = computeStats(records, [])

    expect(stats.diffPct).toBe(0)
    expect(stats.isUp).toBe(true)
  })

  it('returns all zeros for empty data', () => {
    const stats = computeStats([], [])
    expect(stats.todayTotalIncome).toBe(0)
    expect(stats.todayPaid).toBe(0)
    expect(stats.todayUnpaid).toBe(0)
    expect(stats.todayExpense).toBe(0)
    expect(stats.netProfit).toBe(0)
    expect(stats.washCount).toBe(0)
    expect(stats.polishCount).toBe(0)
  })

  it('excludes expenses from before today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const expenses: Expense[] = [
      makeExpense({ created_at: '2026-09-27T23:59:59', amount: 9999 }), // yesterday
      makeExpense({ created_at: '2026-09-28T10:00:00', amount: 100 }),  // today
    ]

    const stats = computeStats([], expenses)
    expect(stats.todayExpense).toBe(100) // only today's expense
  })
})

// ─── Chart Bucket Computation (mirrors useDashboard.chartData useMemo) ──────

function computeChartBuckets(
  allRecords: AppRecord[],
  expenses: Expense[],
  chartMode: 'week' | 'month'
) {
  const days = chartMode === 'week' ? 7 : 30

  const now = new Date()
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + 1)
  endDate.setHours(0, 0, 0, 0)

  const startDate = getDaysAgo(days - 1)
  const startMs = startDate.getTime()
  const endMs = endDate.getTime()
  const dayMs = 24 * 60 * 60 * 1000

  const buckets = Array.from({ length: days }, () => ({ income: 0, expense: 0 }))

  for (const r of allRecords) {
    const t = parseDateMs(r.created_at)
    if (t >= startMs && t < endMs) {
      const idx = Math.floor((t - startMs) / dayMs)
      if (idx >= 0 && idx < days) buckets[idx].income += r.price
    }
  }
  for (const e of expenses) {
    const t = parseDateMs(e.created_at)
    if (t >= startMs && t < endMs) {
      const idx = Math.floor((t - startMs) / dayMs)
      if (idx >= 0 && idx < days) buckets[idx].expense += e.amount
    }
  }

  return buckets
}

describe('Dashboard chart data computation', () => {
  it('creates 7 buckets for week mode', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const buckets = computeChartBuckets([], [], 'week')
    expect(buckets).toHaveLength(7)
  })

  it('creates 30 buckets for month mode', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const buckets = computeChartBuckets([], [], 'month')
    expect(buckets).toHaveLength(30)
  })

  it('assigns income to correct day bucket', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    // Last bucket (today = index 6 for week mode, days-1)
    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 300 }),
    ]

    const buckets = computeChartBuckets(records, [], 'week')
    expect(buckets[6].income).toBe(300)
  })

  it('assigns expense to correct day bucket', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const expenses: Expense[] = [
      makeExpense({ created_at: '2026-09-28T10:00:00', amount: 100 }),
    ]

    const buckets = computeChartBuckets([], expenses, 'week')
    expect(buckets[6].expense).toBe(100)
  })

  it('excludes records outside the range', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    // Record from 2 weeks ago — outside 7-day range
    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-14T10:00:00', price: 999 }),
    ]

    const buckets = computeChartBuckets(records, [], 'week')
    const totalIncome = buckets.reduce((sum, b) => sum + b.income, 0)
    expect(totalIncome).toBe(0)
  })

  it('aggregates multiple records in the same day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 200 }),
      makeRecord({ created_at: '2026-09-28T12:00:00', price: 300 }),
    ]

    const buckets = computeChartBuckets(records, [], 'week')
    expect(buckets[6].income).toBe(500)
  })
})

// ─── Grouped Unpaid (mirrors useDashboard.groupedUnpaid useMemo) ────────────

function computeGroupedUnpaid(unpaidRecords: AppRecord[]) {
  const grouped = unpaidRecords.reduce((acc, r) => {
    const name = (r.customer_name || '').trim() || DEFAULT_CUSTOMER_NAME_UNPAID
    if (!acc[name]) acc[name] = []
    acc[name].push(r)
    return acc
  }, {} as globalThis.Record<string, AppRecord[]>)

  return Object.entries(grouped)
    .map(([name, items]) => ({
      customerName: name,
      items: items.sort((a, b) => parseDateMs(a.created_at) - parseDateMs(b.created_at)),
      total: items.reduce((s, r) => s + r.price, 0),
    }))
    .sort((a, b) => b.total - a.total)
}

describe('Dashboard grouped unpaid computation', () => {
  it('groups records by customer name', () => {
    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 200, customer_name: 'เต็นท์ A', payment_status: 'unpaid' }),
      makeRecord({ created_at: '2026-09-28T09:00:00', price: 300, customer_name: 'เต็นท์ A', payment_status: 'unpaid' }),
      makeRecord({ created_at: '2026-09-28T10:00:00', price: 150, customer_name: 'เต็นท์ B', payment_status: 'unpaid' }),
    ]

    const grouped = computeGroupedUnpaid(records)

    expect(grouped).toHaveLength(2)
    expect(grouped[0].customerName).toBe('เต็นท์ A')
    expect(grouped[0].total).toBe(500)
    expect(grouped[0].items).toHaveLength(2)
    expect(grouped[1].customerName).toBe('เต็นท์ B')
    expect(grouped[1].total).toBe(150)
  })

  it('assigns default name for records without customer_name', () => {
    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 200, customer_name: '', payment_status: 'unpaid' }),
      makeRecord({ created_at: '2026-09-28T09:00:00', price: 100, payment_status: 'unpaid' }),
    ]

    const grouped = computeGroupedUnpaid(records)
    expect(grouped).toHaveLength(1)
    expect(grouped[0].customerName).toBe(DEFAULT_CUSTOMER_NAME_UNPAID)
    expect(grouped[0].total).toBe(300)
  })

  it('sorts groups by total amount (descending)', () => {
    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 100, customer_name: 'น้อย', payment_status: 'unpaid' }),
      makeRecord({ created_at: '2026-09-28T09:00:00', price: 999, customer_name: 'เยอะ', payment_status: 'unpaid' }),
    ]

    const grouped = computeGroupedUnpaid(records)
    expect(grouped[0].customerName).toBe('เยอะ')
    expect(grouped[1].customerName).toBe('น้อย')
  })

  it('sorts items within each group by created_at (ascending)', () => {
    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-28T14:00:00', price: 100, customer_name: 'ทดสอบ', payment_status: 'unpaid' }),
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 200, customer_name: 'ทดสอบ', payment_status: 'unpaid' }),
      makeRecord({ created_at: '2026-09-28T11:00:00', price: 150, customer_name: 'ทดสอบ', payment_status: 'unpaid' }),
    ]

    const grouped = computeGroupedUnpaid(records)
    expect(grouped[0].items[0].price).toBe(200)  // earliest
    expect(grouped[0].items[1].price).toBe(150)
    expect(grouped[0].items[2].price).toBe(100)  // latest
  })

  it('returns empty array for no unpaid records', () => {
    const grouped = computeGroupedUnpaid([])
    expect(grouped).toHaveLength(0)
  })

  it('trims whitespace in customer names', () => {
    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 100, customer_name: '  ลูกค้า  ', payment_status: 'unpaid' }),
      makeRecord({ created_at: '2026-09-28T09:00:00', price: 200, customer_name: 'ลูกค้า', payment_status: 'unpaid' }),
    ]

    const grouped = computeGroupedUnpaid(records)
    expect(grouped).toHaveLength(1)
    expect(grouped[0].total).toBe(300)
  })
})

// ─── Customer Breakdown (mirrors useDashboard.customerBreakdown useMemo) ────

interface CustomerTimePeriod {
  washCount: number
  washAmount: number
  polishCount: number
  polishAmount: number
  total: number
}

function computeCustomerBreakdown(yearRecords: AppRecord[]) {
  const weekMs = getStartOfWeek().getTime()
  const monthMs = getStartOfMonth().getTime()
  const yearMs = getStartOfYear().getTime()

  const emptyPeriod = (): CustomerTimePeriod => ({
    washCount: 0, washAmount: 0, polishCount: 0, polishAmount: 0, total: 0,
  })

  const grouped: globalThis.Record<string, { week: CustomerTimePeriod; month: CustomerTimePeriod; year: CustomerTimePeriod }> = {}

  for (const r of yearRecords) {
    const name = (r.customer_name || '').trim() || DEFAULT_CUSTOMER_NAME
    const t = parseDateMs(r.created_at)
    if (t < yearMs) continue

    if (!grouped[name]) grouped[name] = { week: emptyPeriod(), month: emptyPeriod(), year: emptyPeriod() }
    const g = grouped[name]

    const periods: CustomerTimePeriod[] = [g.year]
    if (t >= monthMs) periods.push(g.month)
    if (t >= weekMs) periods.push(g.week)

    for (const p of periods) {
      if (r.type === 'wash') {
        p.washCount++
        p.washAmount += r.price
      } else {
        p.polishCount++
        p.polishAmount += r.price
      }
      p.total += r.price
    }
  }

  return Object.entries(grouped)
    .map(([customerName, v]) => ({ customerName, ...v }))
    .sort((a, b) => b.month.total - a.month.total)
}

describe('Dashboard customer breakdown computation', () => {
  it('separates wash and polish counts and amounts', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 200, type: 'wash', customer_name: 'ลูกค้า A' }),
      makeRecord({ created_at: '2026-09-28T09:00:00', price: 350, type: 'polish', customer_name: 'ลูกค้า A' }),
      makeRecord({ created_at: '2026-09-28T10:00:00', price: 180, type: 'wash', customer_name: 'ลูกค้า A' }),
    ]

    const breakdown = computeCustomerBreakdown(records)

    expect(breakdown).toHaveLength(1)
    const customer = breakdown[0]
    expect(customer.customerName).toBe('ลูกค้า A')
    expect(customer.year.washCount).toBe(2)
    expect(customer.year.washAmount).toBe(380)
    expect(customer.year.polishCount).toBe(1)
    expect(customer.year.polishAmount).toBe(350)
    expect(customer.year.total).toBe(730)
  })

  it('includes records in all applicable time periods', () => {
    vi.useFakeTimers()
    // Wednesday Sept 30, 2026
    vi.setSystemTime(new Date('2026-09-30T15:00:00'))

    // This record is this week + this month + this year
    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-30T08:00:00', price: 200, customer_name: 'ทดสอบ' }),
    ]

    const breakdown = computeCustomerBreakdown(records)
    const customer = breakdown[0]

    expect(customer.week.total).toBe(200)
    expect(customer.month.total).toBe(200)
    expect(customer.year.total).toBe(200)
  })

  it('excludes records older than 1 year', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records: AppRecord[] = [
      // This record is from last year — before Jan 1 2026
      makeRecord({ created_at: '2025-12-01T10:00:00', price: 999, customer_name: 'เก่ามาก' }),
    ]

    const breakdown = computeCustomerBreakdown(records)
    expect(breakdown).toHaveLength(0)
  })

  it('uses default customer name for unnamed records', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 200, customer_name: '' }),
    ]

    const breakdown = computeCustomerBreakdown(records)
    expect(breakdown[0].customerName).toBe(DEFAULT_CUSTOMER_NAME)
  })

  it('sorts customers by month total (descending)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 100, customer_name: 'น้อย' }),
      makeRecord({ created_at: '2026-09-28T09:00:00', price: 500, customer_name: 'เยอะ' }),
      makeRecord({ created_at: '2026-09-28T10:00:00', price: 300, customer_name: 'กลาง' }),
    ]

    const breakdown = computeCustomerBreakdown(records)
    expect(breakdown[0].customerName).toBe('เยอะ')
    expect(breakdown[1].customerName).toBe('กลาง')
    expect(breakdown[2].customerName).toBe('น้อย')
  })

  it('returns empty array for no records', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const breakdown = computeCustomerBreakdown([])
    expect(breakdown).toHaveLength(0)
  })

  it('handles multiple customers across different time periods', () => {
    vi.useFakeTimers()
    // Wednesday Sept 30, 2026
    vi.setSystemTime(new Date('2026-09-30T15:00:00'))

    const records: AppRecord[] = [
      // This week (Sept 28+)
      makeRecord({ created_at: '2026-09-30T08:00:00', price: 200, customer_name: 'A' }),
      // This month but not this week (before Sept 28)
      makeRecord({ created_at: '2026-09-15T08:00:00', price: 300, customer_name: 'A' }),
      // Earlier this year but not this month
      makeRecord({ created_at: '2026-03-01T08:00:00', price: 400, customer_name: 'A' }),
    ]

    const breakdown = computeCustomerBreakdown(records)
    const customer = breakdown[0]

    expect(customer.week.total).toBe(200)
    expect(customer.month.total).toBe(500)  // 200 + 300
    expect(customer.year.total).toBe(900)   // 200 + 300 + 400
  })
})

// ─── Total Unpaid Amount (mirrors useDashboard.totalUnpaidAmount useMemo) ───

describe('Dashboard total unpaid amount', () => {
  it('sums up all unpaid record prices', () => {
    const records: AppRecord[] = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 200, payment_status: 'unpaid' }),
      makeRecord({ created_at: '2026-09-27T08:00:00', price: 350, payment_status: 'unpaid' }),
      makeRecord({ created_at: '2026-09-26T08:00:00', price: 150, payment_status: 'unpaid' }),
    ]

    const total = records.reduce((s, r) => s + r.price, 0)
    expect(total).toBe(700)
  })

  it('returns 0 for empty unpaid records', () => {
    const total = ([] as AppRecord[]).reduce((s, r) => s + r.price, 0)
    expect(total).toBe(0)
  })
})
