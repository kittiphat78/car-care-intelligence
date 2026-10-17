import { describe, it, expect, vi, beforeEach } from 'vitest'

/** Supabase stand-in: every query/RPC resolves to the response registered for it */
const fake = vi.hoisted(() => {
  const state = { rpc: [] as [string, unknown][], responses: {} as Record<string, { data: unknown; error: unknown; count?: number }> }
  const chain = (key: string) => {
    const builder: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'gte', 'lt', 'order', 'range', 'overrideTypes']) builder[m] = () => builder
    builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(state.responses[key] ?? { data: [], error: null, count: 0 }).then(resolve)
    return builder
  }
  return { state, chain }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => fake.chain(`from:${table}`),
    rpc: (name: string, args: unknown) => {
      fake.state.rpc.push([name, args])
      return fake.chain(`rpc:${name}`)
    },
  },
}))

import { loadDashboard } from '@/features/dashboard/api'
import { settleRecords } from '@/features/debts/api'

describe('loadDashboard', () => {
  beforeEach(() => {
    fake.state.rpc = []
    fake.state.responses = {}
  })

  it('asks the database for today, the last 30 days and this year per customer', async () => {
    await loadDashboard('2026-10-14')
    expect(fake.state.rpc).toEqual([
      ['dashboard_today', { p_day: '2026-10-14' }],
      ['daily_series', { p_from: '2026-09-15', p_to: '2026-10-14' }],
      ['customer_breakdown', { p_day: '2026-10-14' }],
    ])
  })

  it('maps RPC rows to numbers (bigint may arrive as text)', async () => {
    fake.state.responses['rpc:dashboard_today'] = { data: [{ total_income: '2050', paid_income: 550, unpaid_income: 1500, expense: 75, wash_count: 3, polish_count: 1, yesterday_income: 2100 }], error: null }
    fake.state.responses['rpc:daily_series'] = { data: [{ day: '2026-10-14', income: '2000', expense: 70 }], error: null }
    fake.state.responses['rpc:customer_breakdown'] = { data: [{
      customer_key: 'ก',
      week_wash_count: 2, week_wash_amount: 450, week_polish_count: 1, week_polish_amount: 1500,
      month_wash_count: 3, month_wash_amount: 570, month_polish_count: 1, month_polish_amount: 1500,
      year_wash_count: 3, year_wash_amount: 570, year_polish_count: 1, year_polish_amount: 1500,
    }], error: null }

    const data = await loadDashboard('2026-10-14')
    expect(data.today).toEqual({ ok: true, data: { totalIncome: 2050, paidIncome: 550, unpaidIncome: 1500, expense: 75, washCount: 3, polishCount: 1, yesterdayIncome: 2100 } })
    expect(data.series).toEqual({ ok: true, data: [{ day: '2026-10-14', income: 2000, expense: 70 }] })
    expect(data.customers.ok && data.customers.data[0]).toEqual({
      key: 'ก',
      week: { washCount: 2, washAmount: 450, polishCount: 1, polishAmount: 1500, total: 1950 },
      month: { washCount: 3, washAmount: 570, polishCount: 1, polishAmount: 1500, total: 2070 },
      year: { washCount: 3, washAmount: 570, polishCount: 1, polishAmount: 1500, total: 2070 },
    })
  })

  it('keeps the other parts when one RPC fails', async () => {
    fake.state.responses['rpc:customer_breakdown'] = { data: null, error: { code: 'XX000', message: 'boom' } }
    const data = await loadDashboard('2026-10-14')
    expect(data.customers.ok).toBe(false)
    expect(data.today.ok && data.series.ok).toBe(true)
  })
})

describe('settleRecords', () => {
  beforeEach(() => {
    fake.state.rpc = []
    fake.state.responses = {}
  })

  it('sends exactly the ids shown and returns how many were cleared', async () => {
    fake.state.responses['rpc:settle_records'] = { data: [{ updated_count: 1, total: '1500' }], error: null }
    const result = await settleRecords(['a', 'b'])
    expect(fake.state.rpc).toEqual([['settle_records', { p_ids: ['a', 'b'] }]])
    expect(result).toEqual({ ok: true, data: { updatedCount: 1, total: 1500 } })
  })

  it('returns a classified error instead of throwing', async () => {
    fake.state.responses['rpc:settle_records'] = { data: null, error: { code: '42501', message: 'denied' } }
    const result = await settleRecords(['a'])
    expect(!result.ok && result.error.code).toBe('FORBIDDEN')
  })
})
