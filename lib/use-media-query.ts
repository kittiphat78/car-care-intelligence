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

/** The `lg` breakpoint of the design tokens (app/styles/tokens.css --breakpoint-lg) */
export const WIDE_SCREEN = '(min-width: 1024px)'
