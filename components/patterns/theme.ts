'use client'

import { useCallback, useSyncExternalStore } from 'react'

// Theme switching (design-to-code-map.md §2). Same attribute and storage key as v1 so
// people keep the theme they chose. The inline script in app/layout.tsx applies it
// before the first paint; this module only changes it afterwards.

import { THEME_COLOR, THEME_STORAGE_KEY, type Theme } from './theme-constants'

export { THEME_COLOR, THEME_STORAGE_KEY, type Theme }

const CHANGE_EVENT = 'car-care-theme-change'

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function subscribe(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) callback()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(CHANGE_EVENT, callback)
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'dark' as Theme)

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Private mode: the theme still changes for this visit
    }
    applyTheme(next)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  const toggle = useCallback(() => setTheme(readTheme() === 'dark' ? 'light' : 'dark'), [setTheme])

  return { theme, setTheme, toggle }
}
