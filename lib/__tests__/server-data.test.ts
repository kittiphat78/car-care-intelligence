// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

const server = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => server)

import { fromServer } from '@/lib/server-data'
import { peek, seed } from '@/lib/data-store'

describe('fromServer (ADR-31)', () => {
  it('loads with the request’s client and says when', async () => {
    const client = { name: 'request client' }
    server.createSupabaseServerClient.mockResolvedValue(client)
    const before = Date.now()
    const result = await fromServer(async (c) => (c === (client as never) ? 'rows' : 'wrong client'))
    expect(result?.value).toBe('rows')
    expect(result!.takenAt).toBeGreaterThanOrEqual(before)
  })

  it('gives null when it fails, so the screen loads in the browser', async () => {
    server.createSupabaseServerClient.mockResolvedValue({})
    expect(await fromServer(async () => Promise.reject(new Error('down')))).toBeNull()
  })

  it('never keeps anything in the store on the server (it is shared by every request)', () => {
    seed('customers:list', { ok: true, data: ['someone'] }, Date.now())
    expect(peek('customers:list')).toBeUndefined()
  })
})
