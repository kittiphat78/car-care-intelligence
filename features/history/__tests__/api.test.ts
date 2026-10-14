import { describe, it, expect, vi, beforeEach } from 'vitest'
import { appError } from '@/lib/errors'
import { err, ok } from '@/lib/result'

const listBetween = vi.hoisted(() => vi.fn())
vi.mock('@/features/records/api', () => ({ listBetween }))

import { loadExportRange, loadYear } from '@/features/history/api'

describe('history api', () => {
  beforeEach(() => {
    listBetween.mockReset()
  })

  it('exports whole Bangkok months, oldest first', async () => {
    listBetween.mockResolvedValue(ok([]))
    await loadExportRange(2026, 1, 2026, 3)
    for (const table of ['records', 'expenses']) {
      expect(listBetween).toHaveBeenCalledWith(
        table,
        new Date('2025-12-31T17:00:00.000Z'),
        new Date('2026-03-31T17:00:00.000Z'),
        { ascending: true },
      )
    }
  })

  it('fails the export as a whole when one side fails (ER-07)', async () => {
    const failure = appError('ROW_LIMIT')
    listBetween.mockImplementation(async (table: string) => (table === 'expenses' ? err(failure) : ok([{ id: 'r1' }])))
    const result = await loadExportRange(2026, 1, 2026, 1)
    expect(result).toEqual({ ok: false, error: failure })
  })

  it('returns both sides when the export loads', async () => {
    listBetween.mockImplementation(async (table: string) => ok([{ id: table }]))
    expect(await loadExportRange(2026, 10, 2026, 10)).toEqual({
      ok: true,
      data: { records: [{ id: 'records' }], expenses: [{ id: 'expenses' }] },
    })
  })

  it('loads a Bangkok calendar year newest first and keeps each side separate', async () => {
    const failure = appError('NETWORK')
    listBetween.mockImplementation(async (table: string) => (table === 'records' ? ok([{ id: 'r1' }]) : err(failure)))
    const result = await loadYear(2026)
    expect(listBetween).toHaveBeenCalledWith(
      'records',
      new Date('2025-12-31T17:00:00.000Z'),
      new Date('2026-12-31T17:00:00.000Z'),
      { ascending: false },
    )
    expect(result.records).toEqual({ ok: true, data: [{ id: 'r1' }] })
    expect(result.expenses).toEqual({ ok: false, error: failure })
  })
})
