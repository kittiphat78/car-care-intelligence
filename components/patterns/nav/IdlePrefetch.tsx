'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { warmOtherPagesData } from '@/lib/prefetch-data'

/** Long enough for the open page's own data to go first */
export const IDLE_PREFETCH_DELAY_MS = 2000

/**
 * When the device is idle after a page opens, start loading what the other tabs show
 * first, if it is not kept yet (speed work 3c). Not with Data Saver on, nor offline.
 */
export function IdlePrefetch() {
  const pathname = usePathname()
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (!navigator.onLine || connection?.saveData) return
    const run = () => warmOtherPagesData(pathname)
    let idle: number | undefined
    let fallback: ReturnType<typeof setTimeout> | undefined
    const timer = setTimeout(() => {
      // Safari has no requestIdleCallback
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(run, { timeout: 5000 })
      else fallback = setTimeout(run, 0)
    }, IDLE_PREFETCH_DELAY_MS)
    return () => {
      clearTimeout(timer)
      clearTimeout(fallback)
      if (idle !== undefined) window.cancelIdleCallback(idle)
    }
  }, [pathname])
  return null
}
