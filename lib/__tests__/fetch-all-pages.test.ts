import { describe, it, expect, vi } from 'vitest'
import { fetchAllPages, type PageQuery } from '@/lib/fetch-all-pages'

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }))

/** Fake table of `total` rows whose server returns at most `serverCap` rows per request. */
function fakeTable(total: number, { serverCap = Infinity, withCount = true } = {}) {
  const all = rows(total)
  const fetchPage = vi.fn<PageQuery<{ id: number }>>(async (from, to) => ({
    data: all.slice(from, Math.min(to + 1, from + serverCap)),
    error: null,
    count: withCount ? total : null,
  }))
  return fetchPage
}

describe('fetchAllPages', () => {
  it('returns a single short page', async () => {
    const fetchPage = fakeTable(3)
    const result = await fetchAllPages(fetchPage)
    expect(result).toEqual({ ok: true, data: rows(3) })
    expect(fetchPage).toHaveBeenCalledWith(0, 999)
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('loads every page beyond 1,000 rows (ER-02)', async () => {
    const fetchPage = fakeTable(2500)
    const result = await fetchAllPages(fetchPage)
    expect(result.ok && result.data.length).toBe(2500)
    expect(fetchPage.mock.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
  })

  it('keeps going when the server caps pages below the page size', async () => {
    const fetchPage = fakeTable(1200, { serverCap: 500 })
    const result = await fetchAllPages(fetchPage)
    expect(result.ok && result.data).toEqual(rows(1200))
    expect(fetchPage.mock.calls.map(c => c[0])).toEqual([0, 500, 1000])
  })

  it('handles an exact multiple of the page size', async () => {
    const result = await fetchAllPages(fakeTable(2000))
    expect(result.ok && result.data.length).toBe(2000)
  })

  it('stops on a short page when the query has no count', async () => {
    const fetchPage = fakeTable(1500, { withCount: false })
    const result = await fetchAllPages(fetchPage)
    expect(result.ok && result.data.length).toBe(1500)
  })

  it('returns ROW_LIMIT instead of a partial list when rows run out before the count', async () => {
    const fetchPage = vi.fn<PageQuery<{ id: number }>>(async (from) => ({
      data: from === 0 ? rows(1000) : [],
      error: null,
      count: 1500,
    }))
    const result = await fetchAllPages(fetchPage)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.code).toBe('ROW_LIMIT')
  })

  it('returns ROW_LIMIT when the table is larger than maxRows', async () => {
    const result = await fetchAllPages(fakeTable(3000), { maxRows: 2000 })
    expect(!result.ok && result.error.code).toBe('ROW_LIMIT')
  })

  it('returns the error of a failing page', async () => {
    const fetchPage = vi.fn<PageQuery<{ id: number }>>(async (from) =>
      from === 0
        ? { data: rows(1000), error: null, count: 2000 }
        : { data: null, error: { code: '42501', message: 'permission denied' }, count: null },
    )
    const result = await fetchAllPages(fetchPage)
    expect(!result.ok && result.error.code).toBe('FORBIDDEN')
  })

  it('turns a thrown error into a Result', async () => {
    const result = await fetchAllPages<{ id: number }>(async () => { throw new TypeError('Failed to fetch') })
    expect(!result.ok && result.error.code).toBe('NETWORK')
  })
})
