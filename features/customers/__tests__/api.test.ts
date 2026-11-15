import { describe, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }))

import { CUSTOMERS_KEY, load, peek } from '@/lib/data-store'
import { saveCustomer } from '../api'

const payload = { name: 'ร้านทดสอบ', note: null, phones: [], vehicles: [] }

describe('saveCustomer', () => {
  it.each([
    ['saved', { data: [{ id: 'c1', updated_at: '2026-11-15T00:00:00Z' }], error: null }],
    ['failed', { data: null, error: { message: 'offline' } }],
  ])('forgets the kept directory when %s, so the next page does not use a list from before (ADR-29)', async (_, answer) => {
    await load(CUSTOMERS_KEY, async () => ({ ok: true, data: [] }))
    rpc.mockResolvedValue(answer)
    await saveCustomer(payload as never, { id: null, expectedUpdatedAt: null, moves: [], requestId: 'req-1' })
    expect(peek(CUSTOMERS_KEY)).toBeUndefined()
  })
})
