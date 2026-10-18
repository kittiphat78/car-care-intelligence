import { describe, it, expect, vi, beforeEach } from 'vitest'

type Call = [method: string, ...args: unknown[]]

/** Chainable stand-in for a Supabase query that records every call and resolves to `response`. */
const fake = vi.hoisted(() => {
  const state = { queue: [] as { data: unknown; error: unknown; count: number | null }[], calls: [] as [string, ...unknown[]][], response: { data: [] as unknown, error: null as unknown, count: 0 as number | null } }
  const builder: Record<string, unknown> = {}
  for (const method of ['from', 'select', 'insert', 'update', 'delete', 'eq', 'is', 'gte', 'lt', 'order', 'range', 'overrideTypes']) {
    builder[method] = (...args: unknown[]) => {
      state.calls.push([method, ...args])
      return builder
    }
  }
  builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(state.queue.shift() ?? state.response).then(resolve, reject)
  return { state, builder }
})

vi.mock('@/lib/supabase', () => ({ supabase: { from: (table: string) => (fake.builder.from as (t: string) => unknown)(table) } }))

import { countVisitsByPlate, createIncome, deleteEntry, listBetween, run, updateEntry, type IncomeInsert } from '@/features/records/api'

const methods = () => fake.state.calls.map(c => c[0])
const callOf = (method: string): Call | undefined => fake.state.calls.find(c => c[0] === method) as Call | undefined

describe('records api', () => {
  beforeEach(() => {
    fake.state.calls = []
    fake.state.queue = []
    fake.state.response = { data: [], error: null, count: 0 }
  })

  it('run() returns data or a classified error and never throws', async () => {
    expect(await run(Promise.resolve({ data: 1, error: null }))).toEqual({ ok: true, data: 1 })
    const failed = await run(Promise.resolve({ data: null, error: { code: '42501', message: 'denied' } }))
    expect(!failed.ok && failed.error.code).toBe('FORBIDDEN')
    const thrown = await run(Promise.reject(new TypeError('Failed to fetch')))
    expect(!thrown.ok && thrown.error.code).toBe('NETWORK')
  })

  it('counts earlier visits of a plate', async () => {
    fake.state.response = { data: null, error: null, count: 2 }
    expect(await countVisitsByPlate('กข 1234')).toEqual({ ok: true, data: 2 })
    expect(callOf('eq')).toEqual(['eq', 'plate', 'กข 1234'])
  })

  it('lists a range in a stable order through pagination', async () => {
    fake.state.response = { data: [{ id: 'a' }], error: null, count: 1 }
    const result = await listBetween('records', new Date('2026-01-01T00:00:00Z'), new Date('2026-02-01T00:00:00Z'), { ascending: false })
    expect(result).toEqual({ ok: true, data: [{ id: 'a' }] })
    expect(callOf('select')).toEqual(['select', '*', { count: 'exact' }])
    expect(fake.state.calls.filter(c => c[0] === 'order')).toEqual([
      ['order', 'created_at', { ascending: false }],
      ['order', 'id', { ascending: false }],
    ])
    expect(callOf('range')).toEqual(['range', 0, 999])
  })

  it('leaves the range open-ended when there is no end', async () => {
    await listBetween('expenses', new Date('2026-01-01T00:00:00Z'), null, { ascending: true })
    expect(methods()).not.toContain('lt')
  })

  it('updates only when updated_at still matches what was loaded', async () => {
    fake.state.queue = [{ data: [{ id: 'id-1' }], error: null, count: null }]
    expect(await updateEntry('records', 'id-1', { price: 300 }, '2026-10-14T05:00:00.123456+00:00')).toEqual({ ok: true, data: undefined })
    expect(callOf('update')).toEqual(['update', { price: 300 }])
    expect(fake.state.calls.filter(c => c[0] === 'eq')).toEqual([['eq', 'id', 'id-1'], ['eq', 'updated_at', '2026-10-14T05:00:00.123456+00:00']])

    fake.state.calls = []
    fake.state.queue = [{ data: [{ id: 'id-1' }], error: null, count: null }]
    await updateEntry('records', 'id-1', { price: 300 }, null)
    expect(callOf('is')).toEqual(['is', 'updated_at', null])
  })

  it('reports CONFLICT when someone else changed the row and NOT_FOUND when it is gone', async () => {
    fake.state.queue = [{ data: [], error: null, count: null }, { data: [{ id: 'id-1' }], error: null, count: null }]
    const conflict = await updateEntry('records', 'id-1', { price: 300 }, null)
    expect(!conflict.ok && conflict.error.code).toBe('CONFLICT')

    fake.state.queue = [{ data: [], error: null, count: null }, { data: [], error: null, count: null }]
    const gone = await updateEntry('records', 'id-1', { price: 300 }, null)
    expect(!gone.ok && gone.error.code).toBe('NOT_FOUND')
  })

  it('treats a retried save that already reached the database as saved', async () => {
    const row = { client_request_id: 'req-1' } as IncomeInsert
    fake.state.response = { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "records_client_request_id_key"' }, count: null }
    expect(await createIncome(row)).toEqual({ ok: true, data: undefined })
    expect(callOf('insert')).toEqual(['insert', row])

    fake.state.response = { data: null, error: { code: '23514', message: 'check' }, count: null }
    expect((await createIncome(row)).ok).toBe(false)
  })

  it('deletes by id and reports failures as Results', async () => {
    fake.state.response = { data: null, error: { code: '23514', message: 'check' }, count: null }
    const result = await deleteEntry('expenses', 'id-2')
    expect(!result.ok && result.error.code).toBe('VALIDATION')
  })
})
