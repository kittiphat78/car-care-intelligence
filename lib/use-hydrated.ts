'use client'

import { useSyncExternalStore } from 'react'

const noSubscription = () => () => {}

/**
 * False in the HTML the server sends and until React has taken over the page, then true.
 * Forms come with the HTML, so they can be seen (and tapped) before the JavaScript has
 * loaded; keep their submit buttons disabled until this is true, so the browser never
 * submits a form by itself (Step 10, D-07).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noSubscription, () => true, () => false)
}
