'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { reportAppError } from '@/lib/observability'
import { ok, type Result } from '@/lib/result'
import { LOCAL_DRAFT_PREFIX } from '@/features/auth/drafts'
import { listCustomers } from './api'
import { keepList, keptList } from './memory'
import { draftSignature } from './logic'
import type { Customer, CustomerDraft } from './types'

// ── The directory (ADR-23) ───────────────────────────────────────────────────
// Loaded whole and searched in the browser. The last list is kept in memory (memory.ts)
// so going back from a customer to the list shows it at once while a fresh copy loads.

export function useCustomerDirectory() {
  const [result, setResult] = useState<Result<Customer[]> | null>(() => {
    const kept = keptList()
    return kept ? ok(kept) : null
  })
  // False while only the list kept from an earlier visit is shown (it may lack a customer just added)
  const [fresh, setFresh] = useState(false)

  const reload = useCallback(async () => {
    const next = await listCustomers()
    if (next.ok) keepList(next.data)
    else reportAppError(next.error)
    setResult(next)
    setFresh(true)
  }, [])

  useEffect(() => {
    // Load on every visit; the result arrives after this effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
  }, [reload])

  return { result, customers: result?.ok ? result.data : null, fresh, reload }
}

// ── URL state without a server request ───────────────────────────────────────
// Search text and open dialogs live in the URL (back button, AC-02-4, AC-06-3), but are
// changed with the browser's own history API: Next.js keeps useSearchParams in step and
// sends no request, so names and phone numbers typed into the search never reach a
// server log (ADR-23).

export function useUrlWith() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return useCallback(
    (patch: Readonly<Record<string, string | null>>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') params.delete(key)
        else params.set(key, value)
      }
      const query = params.toString()
      return query ? `${pathname}?${query}` : pathname
    },
    [pathname, searchParams],
  )
}

/** A dialog bound to `?key=value`: open adds a history entry, close goes back to the page under it */
export function useUrlDialog(key: string) {
  const searchParams = useSearchParams()
  const urlWith = useUrlWith()
  const openedHere = useRef(false)
  const value = searchParams.get(key)

  /** `also`: other values for the page under the dialog too (e.g. a search still being typed) */
  const open = useCallback(
    (next: string, also: Readonly<Record<string, string | null>> = {}) => {
      openedHere.current = true
      if (Object.keys(also).length) window.history.replaceState(null, '', urlWith(also))
      window.history.pushState(null, '', urlWith({ ...also, [key]: next }))
    },
    [key, urlWith],
  )

  const close = useCallback(() => {
    if (openedHere.current) {
      openedHere.current = false
      window.history.back()
    } else {
      // Opened from a link or a reload: there is no entry of ours to go back to
      window.history.replaceState(null, '', urlWith({ [key]: null }))
    }
  }, [key, urlWith])

  /** True when open() added the history entry the dialog is on */
  const openedByUs = useCallback(() => openedHere.current, [])

  return { value, open, close, openedByUs }
}

// ── Draft of a new customer (AC-01-5) ────────────────────────────────────────
// In this tab's sessionStorage under the per-account draft prefix, which sign-out clears
// (clearLocalDrafts). Only for new customers: an edit always starts from the saved copy,
// so it can never overwrite a newer change made on another device.

export const customerDraftKey = (userId: string) => `${LOCAL_DRAFT_PREFIX}${userId}:customer`

function readDraft(key: string): CustomerDraft | null {
  try {
    const raw = sessionStorage.getItem(key)
    const value = raw ? (JSON.parse(raw) as CustomerDraft) : null
    return value && typeof value.name === 'string' && Array.isArray(value.phones) && Array.isArray(value.vehicles) ? value : null
  } catch {
    return null
  }
}

/**
 * Form state that survives a reload. `start` is what a new form shows (empty, or filled
 * from the search); a saved draft that differs from it comes back with `restored` set.
 */
export function useCustomerDraft(key: string | null, start: CustomerDraft) {
  const [value, setValue] = useState(start)
  const [restored, setRestored] = useState(false)
  const loaded = useRef(false)
  const startSignature = useRef(draftSignature(start))

  // Read once after mount: storage does not exist while rendering on the server
  useEffect(() => {
    if (key) {
      const saved = readDraft(key)
      if (saved && draftSignature(saved) !== startSignature.current) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValue(saved)
        setRestored(true)
      }
    }
    loaded.current = true
  }, [key])

  useEffect(() => {
    if (!key || !loaded.current) return
    try {
      if (draftSignature(value) !== startSignature.current) sessionStorage.setItem(key, JSON.stringify(value))
      else sessionStorage.removeItem(key)
    } catch {
      // Storage full or blocked: the form still works, only the draft is not kept
    }
  }, [key, value])

  /** Forget the draft (saved, or the user chose to throw it away) */
  const discard = useCallback(() => {
    if (!key) return
    try {
      sessionStorage.removeItem(key)
    } catch {
      // Nothing kept
    }
  }, [key])

  /** Back to the empty form */
  const reset = useCallback(
    (next: CustomerDraft) => {
      startSignature.current = draftSignature(next)
      setValue(next)
      setRestored(false)
      discard()
    },
    [discard],
  )

  return { value, setValue, restored, discard, reset }
}
