import { beforeEach, describe, expect, it, vi } from 'vitest'

// vitest.setup.ts replaces this module for screen tests; here it is the real one
vi.unmock('@/lib/prefetch-data')
const pageData = vi.hoisted(() => ({ warmPage: vi.fn(), warmOtherPages: vi.fn() }))
vi.mock('@/features/page-data', () => pageData)

import { warmOtherPagesData, warmPageData, warmablePath } from '@/lib/prefetch-data'

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  pageData.warmPage.mockReset()
  pageData.warmOtherPages.mockReset()
  window.history.replaceState(null, '', '/')
})

describe('prefetch-data', () => {
  it('warms only pages that load data first, and history only for the month it opens on', () => {
    expect(warmablePath('/debts')).toBe('/debts')
    expect(warmablePath('/debts?sort=age')).toBe('/debts')
    expect(warmablePath('/history')).toBe('/history')
    expect(warmablePath('/history?y=2025&m=3')).toBeNull()
    expect(warmablePath('/add')).toBeNull()
    expect(warmablePath('/more')).toBeNull()
    expect(warmablePath('/customers/0b0c7c1e-0000-4000-8000-000000000001')).toBeNull()
  })

  it('starts the data of the page a link opens, not of the page already open', async () => {
    warmPageData('/debts')
    warmPageData('/')
    warmPageData('/add')
    await settle()
    expect(pageData.warmPage.mock.calls).toEqual([['/debts']])
  })

  it('warms the other tabs when idle', async () => {
    warmOtherPagesData('/history')
    await settle()
    expect(pageData.warmOtherPages).toHaveBeenCalledWith('/history')
  })
})
