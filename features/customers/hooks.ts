'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { reportAppError } from '@/lib/observability'
import { ok, type Result } from '@/lib/result'
import { LOCAL_DRAFT_PREFIX } from '@/features/auth/drafts'
import { listCustomers } from './api'
import { keepList, keptList } from './memory'
import { customersForTypedPlate, draftSignature, emptyVehicle, plateKey } from './logic'
import type { Customer, CustomerDraft } from './types'

// ── The directory (ADR-23) ───────────────────────────────────────────────────
// Loaded whole and searched in the browser. The last list is kept in memory (memory.ts)
// so going back from a customer to the list shows it at once while a fresh copy loads.

/** `enabled: false` waits (e.g. /add loads the directory only once a plate is being typed) */
export function useCustomerDirectory({ enabled = true }: { enabled?: boolean } = {}) {
  const [result, setResult] = useState<Result<Customer[]> | null>(() => {
    const kept = keptList()
    return kept ? ok(kept) : null
  })
  // False while only the list kept from an earlier visit is shown (it may lack a customer just added)
  const [fresh, setFresh] = useState(false)
  const requested = useRef(false)

  const reload = useCallback(async () => {
    const next = await listCustomers()
    if (next.ok) keepList(next.data)
    else reportAppError(next.error)
    setResult(next)
    setFresh(true)
  }, [])

  useEffect(() => {
    if (!enabled || requested.current) return
    // Load once per visit; the result arrives after this effect
    requested.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
  }, [enabled, reload])

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
    if (!value || typeof value.name !== 'string' || !Array.isArray(value.phones) || !Array.isArray(value.vehicles)) return null
    // A draft kept by an earlier version may lack newer fields (model, M013)
    return { ...value, vehicles: value.vehicles.map((v) => ({ ...emptyVehicle(), ...v })) }
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

// ── Customers of a plate being typed (/add, US-11) ───────────────────────────

export const PLATE_LOOKUP_DELAY_MS = 600

/**
 * Directory customers whose car matches `plate`, once the typing has paused (nothing while
 * typing, nothing for fewer than 3 characters). Never fills anything in by itself.
 */
export function usePlateCustomers(customers: readonly Customer[] | null, plate: string, max = 3): Customer[] {
  const [settled, setSettled] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setSettled(plate), PLATE_LOOKUP_DELAY_MS)
    return () => clearTimeout(timer)
  }, [plate])
  return useMemo(
    () => (customers && settled === plate && plateKey(plate).length >= 3 ? customersForTypedPlate(customers, plate).slice(0, max) : []),
    [customers, settled, plate, max],
  )
}
