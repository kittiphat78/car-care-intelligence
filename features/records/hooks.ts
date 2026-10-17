'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { LOCAL_DRAFT_PREFIX } from '@/features/auth/drafts'
import { countVisitsByPlate } from './api'

// ── Draft (UF-REC-05) ────────────────────────────────────────────────────────
// Kept in this tab's sessionStorage, per account and per form, so a reload or
// pull-to-refresh does not lose what was typed. Cleared on save, "ล้างฟอร์ม" and sign-out.

export const draftKey = (userId: string, form: string) => `${LOCAL_DRAFT_PREFIX}${userId}:${form}`

function readDraft<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function useDraft<T extends object>(key: string, empty: T, isDirty: (value: T) => boolean) {
  const [value, setValue] = useState<T>(empty)
  const [restored, setRestored] = useState(false)
  const loaded = useRef(false)

  // Read once after mount: storage does not exist during server rendering
  useEffect(() => {
    const saved = readDraft<T>(key)
    if (saved && isDirty({ ...empty, ...saved })) {
      setValue({ ...empty, ...saved })
      setRestored(true)
    }
    loaded.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    if (!loaded.current) return
    try {
      if (isDirty(value)) sessionStorage.setItem(key, JSON.stringify(value))
      else sessionStorage.removeItem(key)
    } catch {
      // Storage full or blocked: the form still works, only the draft is not kept
    }
  }, [key, value, isDirty])

  const reset = useCallback(
    (next: T = empty) => {
      setValue(next)
      setRestored(false)
    },
    [empty],
  )

  return { value, setValue, restored, reset }
}

// ── Recent customers (AC-09-1) ───────────────────────────────────────────────
// Same localStorage key as v1, so names already on the device stay.

const RECENT_KEY = 'recentCustomers'
const RECENT_LIMIT = 30

export function useRecentCustomers() {
  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(stored)) setNames(stored.filter((n): n is string => typeof n === 'string'))
    } catch {
      // Unreadable list: start empty
    }
  }, [])

  const remember = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setNames((prev) => {
      const next = [trimmed, ...prev.filter((n) => n !== trimmed)].slice(0, RECENT_LIMIT)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        // Not saved for next time; nothing else depends on it
      }
      return next
    })
  }, [])

  return { names, remember }
}

// ── Visits of a plate (AC-08-1) ──────────────────────────────────────────────

export const VISIT_LOOKUP_DELAY_MS = 600

/** Earlier visits of this plate; 0 while typing, for short plates, or if the lookup fails */
export function usePlateVisits(plate: string): number {
  const [result, setResult] = useState<{ plate: string; count: number }>({ plate: '', count: 0 })
  const key = plate.trim().toUpperCase()

  useEffect(() => {
    if (key.length < 3) return
    let cancelled = false
    const timer = setTimeout(async () => {
      const visits = await countVisitsByPlate(key)
      if (!cancelled) setResult({ plate: key, count: visits.ok ? visits.data : 0 })
    }, VISIT_LOOKUP_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [key])

  return key.length >= 3 && result.plate === key ? result.count : 0
}

// ── One request id per save (M004) ───────────────────────────────────────────
// Pressing save again, or retrying after an error, with the same data reuses the id,
// so the database cannot store the record twice (AC-06-1).

export function useRequestId() {
  const pending = useRef<{ key: string; id: string } | null>(null)
  const idFor = useCallback((payload: unknown) => {
    const key = JSON.stringify(payload)
    if (pending.current?.key !== key) pending.current = { key, id: crypto.randomUUID() }
    return pending.current.id
  }, [])
  const clear = useCallback(() => {
    pending.current = null
  }, [])
  return { idFor, clear }
}
