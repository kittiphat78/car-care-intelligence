import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/history' }))

import { IDLE_PREFETCH_DELAY_MS, IdlePrefetch } from '../nav/IdlePrefetch'
import { warmOtherPagesData } from '@/lib/prefetch-data'

const setConnection = (value: unknown) => Object.defineProperty(navigator, 'connection', { value, configurable: true })

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(warmOtherPagesData).mockClear()
})

afterEach(() => {
  vi.useRealTimers()
  setConnection(undefined)
})

describe('IdlePrefetch (speed work 3c)', () => {
  it('warms the other tabs once the open page has had its turn', () => {
    render(<IdlePrefetch />)
    act(() => vi.advanceTimersByTime(IDLE_PREFETCH_DELAY_MS - 1))
    expect(warmOtherPagesData).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    act(() => vi.runOnlyPendingTimers())
    expect(warmOtherPagesData).toHaveBeenCalledWith('/history')
  })

  it('loads nothing extra with Data Saver on', () => {
    setConnection({ saveData: true })
    render(<IdlePrefetch />)
    act(() => vi.runAllTimers())
    expect(warmOtherPagesData).not.toHaveBeenCalled()
  })

  it('loads nothing when the page is left before the device is idle', () => {
    const { unmount } = render(<IdlePrefetch />)
    unmount()
    act(() => vi.runAllTimers())
    expect(warmOtherPagesData).not.toHaveBeenCalled()
  })
})
