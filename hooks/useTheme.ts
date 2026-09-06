'use client'
import { useCallback, useSyncExternalStore } from 'react'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'car-care-theme'

function getTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark'
}

function subscribe(callback: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'dark' as Theme)

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t)
    document.documentElement.setAttribute('data-theme', t)
    // Trigger re-render by dispatching storage event
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: t }))
  }, [])

  const toggle = useCallback(() => {
    const current = getTheme()
    setTheme(current === 'dark' ? 'light' : 'dark')
  }, [setTheme])

  return { theme, setTheme, toggle }
}
