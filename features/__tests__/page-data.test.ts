import { beforeEach, describe, expect, it, vi } from 'vitest'

const loaders = vi.hoisted(() => ({
  loadTodayDashboard: vi.fn(),
  loadUnpaidShared: vi.fn(),
  loadHistoryPeriod: vi.fn(),
  loadDirectory: vi.fn(),
}))
vi.mock('@/features/dashboard/hooks', () => ({ loadTodayDashboard: loaders.loadTodayDashboard }))
vi.mock('@/features/debts/shared', () => ({ loadUnpaidShared: loaders.loadUnpaidShared }))
vi.mock('@/features/history/shared', () => ({ loadHistoryPeriod: loaders.loadHistoryPeriod }))
vi.mock('@/features/customers/shared', () => ({ loadDirectory: loaders.loadDirectory }))

import { CUSTOMERS_KEY, put } from '@/lib/data-store'
import { bangkokParts } from '@/lib/time/bangkok'
import { warmOtherPages, warmPage } from '@/features/page-data'

beforeEach(() => {
  for (const fn of Object.values(loaders)) fn.mockReset().mockResolvedValue({ ok: true, data: [] })
})

describe('page data (speed work 3c)', () => {
  it('a tap on ค้างชำระ starts the unpaid list and the directory (for the call buttons)', () => {
    warmPage('/debts')
    expect(loaders.loadUnpaidShared).toHaveBeenCalledOnce()
    expect(loaders.loadDirectory).toHaveBeenCalledOnce()
    expect(loaders.loadTodayDashboard).not.toHaveBeenCalled()
  })

  it('history starts the month it opens on', () => {
    warmPage('/history')
    const { year, month } = bangkokParts()
    expect(loaders.loadHistoryPeriod).toHaveBeenCalledWith(year, month)
  })

  it('an idle moment loads the other tabs, leaving the open one and what is kept', () => {
    put(CUSTOMERS_KEY, { ok: true, data: [] })
    warmOtherPages('/debts')
    expect(loaders.loadTodayDashboard).toHaveBeenCalledOnce()
    expect(loaders.loadHistoryPeriod).toHaveBeenCalledOnce()
    expect(loaders.loadUnpaidShared).not.toHaveBeenCalled()
    expect(loaders.loadDirectory).not.toHaveBeenCalled()
  })

  it('a failed load is left for the page to show', async () => {
    loaders.loadTodayDashboard.mockRejectedValue(new Error('offline'))
    expect(() => warmPage('/')).not.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
})
