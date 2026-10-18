import { describe, expect, it } from 'vitest'
import type { Record as AppRecord } from '@/types'
import { chartSummary, greeting, newestFirst, toDebtSummary, topCustomers, type CustomerBreakdownItem } from '../logic'

const rec = (over: Partial<AppRecord>): AppRecord =>
  ({ id: 'x', created_at: '2026-10-15T03:00:00Z', type: 'wash', plate: 'ก', services: [], price: 100, seq_number: 1, payment_status: 'unpaid', job_status: 'done', ...over }) as AppRecord

describe('toDebtSummary', () => {
  it('adds up unpaid jobs and counts all unnamed ones as one customer', () => {
    const debt = toDebtSummary([
      rec({ price: 150, customer_name: 'เต็นท์ A' }),
      rec({ price: 200, customer_name: ' เต็นท์ A ' }),
      rec({ price: 100, customer_name: '' }),
      rec({ price: 50 }),
    ])
    expect(debt).toEqual({ total: 500, customers: 2, cars: 4 })
  })
})

describe('newestFirst', () => {
  it('puts the latest record on top', () => {
    const list = newestFirst([rec({ id: 'a', created_at: '2026-10-15T01:00:00Z' }), rec({ id: 'b', created_at: '2026-10-15T05:00:00Z' })])
    expect(list.map((r) => r.id)).toEqual(['b', 'a'])
  })
})

describe('chartSummary and greeting', () => {
  it('totals the chart in words', () => {
    expect(chartSummary([{ income: 100, expense: 30 }, { income: 50, expense: 0 }])).toEqual({ income: 150, expense: 30 })
  })

  it('greets by Bangkok hour', () => {
    expect(greeting(8)).toBe('สวัสดีตอนเช้า')
    expect(greeting(13)).toBe('สวัสดีตอนบ่าย')
    expect(greeting(19)).toBe('สวัสดีตอนเย็น')
  })
})

describe('topCustomers (D-04)', () => {
  const period = (total: number) => ({ washCount: 1, washAmount: total, polishCount: 0, polishAmount: 0, total })
  const item = (name: string, month: number): CustomerBreakdownItem => ({ customerName: name, week: period(0), month: period(month), year: period(month) })

  it('shows the top named customers plus the general customer, with shares', () => {
    const rows = topCustomers(
      [item('A', 100), item('B', 400), item('ลูกค้าทั่วไป', 300), item('C', 200), item('D', 0)],
      'month',
      2,
    )
    // Total 1,000: the two biggest named customers, then the general customer last
    expect(rows.map((r) => [r.name, r.percent])).toEqual([
      ['B', 40],
      ['C', 20],
      ['ลูกค้าทั่วไป', 30],
    ])
  })

  it('leaves out customers with nothing in the period', () => {
    expect(topCustomers([item('A', 100)], 'week')).toEqual([])
  })
})
