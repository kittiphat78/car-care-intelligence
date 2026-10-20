'use client'

import { useCallback, useRef, type MouseEvent } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// ── URL state without a server request ───────────────────────────────────────
// Dialogs, tabs, filters and the sort order live in the URL (back button, links), but
// change it with the browser's own history API: Next.js keeps useSearchParams in step
// and sends no request. router.push/replace would wait for the server to render the page
// again first, so the screen would only change after a round trip. The customer search
// also never reaches a server log this way (ADR-23).

type Patch = Readonly<Record<string, string | null>>

/** Adds a history entry (back undoes it) */
export function pushUrl(url: string): void {
  window.history.pushState(null, '', url)
}

/** Changes the current history entry */
export function replaceUrl(url: string): void {
  window.history.replaceState(null, '', url)
}

/** The current URL with some search params set (or removed with null / '') */
export function useUrlWith() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return useCallback(
    (patch: Patch) => {
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
    (next: string, also: Patch = {}) => {
      openedHere.current = true
      if (Object.keys(also).length) replaceUrl(urlWith(also))
      pushUrl(urlWith({ ...also, [key]: next }))
    },
    [key, urlWith],
  )

  const close = useCallback(() => {
    if (openedHere.current) {
      openedHere.current = false
      window.history.back()
    } else {
      // Opened from a link or a reload: there is no entry of ours to go back to
      replaceUrl(urlWith({ [key]: null }))
    }
  }, [key, urlWith])

  /** True when open() added the history entry the dialog is on */
  const openedByUs = useCallback(() => openedHere.current, [])

  return { value, open, close, openedByUs }
}

/**
 * onClick for a link that only changes search params of this page (e.g. ?logout=1): a
 * plain click pushes the URL in the browser; Ctrl/⌘-click and the like keep the link's
 * normal behaviour (new tab).
 */
export function pushOnPlainClick(e: MouseEvent<HTMLAnchorElement>): void {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  pushUrl(e.currentTarget.getAttribute('href') ?? '')
}
