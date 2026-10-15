import { describe, it, expect } from 'vitest'
import { toChartData, toCustomerBreakdown, toStats, type CustomerTimePeriod } from '@/features/dashboard/logic'

const p = (washCount: number, washAmount: number, polishCount = 0, polishAmount = 0): CustomerTimePeriod =>
  ({ washCount, washAmount, polishCount, polishAmount, total: washAmount + polishAmount })

describe('toStats', () => {
  it('derives net cash and the change against yesterday (same formulas as before)', () => {
    const stats = toStats({ totalIncome: 2050, paidIncome: 550, unpaidIncome: 1500, expense: 75, washCount: 3, polishCount: 1, yesterdayIncome: 2100 })
    expect(stats).toEqual({
      todayTotalIncome: 2050, todayPaid: 550, todayUnpaid: 1500, todayExpense: 75,
      netProfit: 475, washCount: 3, polishCount: 1, diffAmount: -50, diffPct: -2, isUp: false,
    })
  })

  it('shows 0% when there was no income yesterday', () => {
    expect(toStats({ totalIncome: 600, paidIncome: 0, unpaidIncome: 600, expense: 350, washCount: 3, polishCount: 0, yesterdayIncome: 0 }))
      .toMatchObject({ netProfit: -350, diffPct: 0, isUp: true })
  })
})

describe('toChartData', () => {
  const series = [
    { day: '2026-10-08', income: 0, expense: 11 },
    { day: '2026-10-13', income: 2100, expense: 40 },
    { day: '2026-10-14', income: 2000, expense: 70 },
  ]

  it('has one bar per day ending today, oldest first, with missing days as 0', () => {
    const week = toChartData(series, 'week', '2026-10-14')
    expect(week).toHaveLength(7)
    expect(week.map(d => [d.income, d.expense])).toEqual([[0, 11], [0, 0], [0, 0], [0, 0], [0, 0], [2100, 40], [2000, 70]])
    expect(toChartData(series, 'month', '2026-10-14')).toHaveLength(30)
  })

  it('labels week bars with Thai weekdays and month bars with the day number', () => {
    expect(toChartData([], 'week', '2026-10-14').at(-1)?.label).toBe(new Date('2026-10-14T00:00:00+07:00').toLocaleDateString('th-TH', { weekday: 'short', timeZone: 'Asia/Bangkok' }))
    expect(toChartData([], 'month', '2026-10-14').at(-1)?.label).toBe('14')
  })
})

describe('toCustomerBreakdown', () => {
  it('names the unnamed customer, merges it with a customer literally called that, and sorts by this month', () => {
    const items = toCustomerBreakdown([
      { key: 'ก', week: p(2, 450, 1, 1500), month: p(3, 570, 1, 1500), year: p(3, 570, 1, 1500) },
      { key: '', week: p(3, 350), month: p(3, 350), year: p(3, 350) },
      { key: 'ลูกค้าทั่วไป', week: p(0, 0), month: p(1, 100), year: p(1, 100) },
      { key: 'ข', week: p(0, 0, 1, 2000), month: p(0, 0, 1, 2000), year: p(0, 0, 2, 3000) },
    ])
    expect(items.map(i => i.customerName)).toEqual(['ก', 'ข', 'ลูกค้าทั่วไป'])
    expect(items[2].month).toEqual(p(4, 450))
  })
})
