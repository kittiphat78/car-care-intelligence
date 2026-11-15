// The data the signed-in screens share, kept in this tab's memory (ADR-29).
//
// - A screen shows what is kept at once and asks for a fresh copy behind it.
// - Screens (or a prefetch and a screen) asking for the same key at the same time share
//   one request: /debts opened while the dashboard is loading the unpaid list waits for
//   that request instead of sending its own.
// - Never written to storage (ADR-26). Sign-out forgets everything: the next person on a
//   shared phone must not see it. A save, edit, delete or settle forgets every copy made
//   from the records (keys starting with "records:"), so no screen shows a list without
//   the change.
//
// Keys say what the data is made from: "records:…" (income and expenses) or "customers:…".

interface Entry {
  value?: unknown
  /** The request this key is waiting for, shared by everyone who asks meanwhile */
  pending?: Promise<unknown>
  /** Which request may write the value: only the latest one started for this key */
  request: number
}

const entries = new Map<string, Entry>()
let requests = 0

/** What is kept for `key`, if anything */
export function peek<T>(key: string): T | undefined {
  return entries.get(key)?.value as T | undefined
}

export interface LoadOptions<T> {
  /** Whether a result is worth showing next time (a failure is not) */
  keep?: (value: T) => boolean
  /**
   * A new request even when one is running: the data changed after that one started
   * (a realtime change, ⟳, a reload after an edit)
   */
  fresh?: boolean
}

/**
 * Ask for `key`. Joins the request already running for it unless `fresh`. The answer is
 * kept only if no newer request was started and the key was not forgotten meanwhile, so a
 * slow, older answer never replaces a newer one.
 */
export function load<T>(key: string, fetcher: () => Promise<T>, { keep = () => true, fresh = false }: LoadOptions<T> = {}): Promise<T> {
  const entry = entries.get(key)
  if (entry?.pending && !fresh) return entry.pending as Promise<T>
  const request = ++requests
  const settle = (value?: { value: T }) => {
    const current = entries.get(key)
    if (current?.request !== request) return
    if (value && keep(value.value)) entries.set(key, { value: value.value, request })
    else entries.set(key, { ...current, pending: undefined })
  }
  const pending = fetcher().then(
    (value) => {
      settle({ value })
      return value
    },
    (error: unknown) => {
      settle()
      throw error
    },
  )
  entries.set(key, { value: entry?.value, pending, request })
  return pending
}

/** Replace what is kept (e.g. a customer deleted from the kept list). A request running for it no longer writes. */
export function put<T>(key: string, value: T): void {
  entries.set(key, { value, request: ++requests })
}

/** Forget the keys starting with `prefix`, or everything (sign-out). Answers still on their way are not kept. */
export function forget(prefix = ''): void {
  for (const key of [...entries.keys()]) if (key.startsWith(prefix)) entries.delete(key)
}

/** A Result worth keeping */
export const isOk = (result: { ok: boolean }) => result.ok

// ── Keys ──
/** Prefix of everything made from income and expense rows */
export const RECORDS = 'records:'
export const UNPAID_KEY = 'records:unpaid'
export const DASHBOARD_KEY = 'records:dashboard'
export const historyKey = (year: number, month: number) => `records:history:${year}:${month}`
export const CUSTOMERS_KEY = 'customers:list'
