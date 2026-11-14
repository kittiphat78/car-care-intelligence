'use client'

import { useSyncExternalStore } from 'react'

/**
 * Whether a CSS media query matches, kept up to date. For parts that should exist in
 * only one layout instead of rendering both and hiding one with CSS (optimization-log
 * O-04). Before hydration, and where matchMedia is missing (tests), it answers false,
 * so render the phone layout for false.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  )
}

/**
 * Wide enough for a table (history, customers). From the `lg` breakpoint (1024) the side
 * nav takes 240px, which left the history table 720px for 850px of columns: the edit
 * button was cut off with no way to scroll to it (iPad Pro portrait, Phase A H4). From
 * 1280 the content is 976px wide; narrower screens get the list, like tablets.
 */
export const TABLE_SCREEN = '(min-width: 1280px)'
