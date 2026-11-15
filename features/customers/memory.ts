import { CUSTOMERS_KEY, forget, peek, put } from '@/lib/data-store'
import type { Result } from '@/lib/result'
import type { Customer } from './types'

// What the customer pages keep in memory between visits within one tab. The list itself
// is in the shared store (lib/data-store.ts, never written to storage, ADR-26). Kept apart
// from the data code so the sign-out dialog, which is on every page, can clear it without
// loading the rest of the feature.

let openedFromList = false

/** The directory as last loaded in this tab */
export function keptList(): Customer[] | null {
  const kept = peek<Result<Customer[]>>(CUSTOMERS_KEY)
  return kept?.ok ? kept.data : null
}

/** A customer was deleted: the list shown on the way back should not flash it */
export function dropCustomer(id: string): void {
  const list = keptList()
  if (list) put<Result<Customer[]>>(CUSTOMERS_KEY, { ok: true, data: list.filter((c) => c.id !== id) })
}

/** Sign-out: the next person on a shared phone must not see the list */
export function forgetCustomers(): void {
  forget(CUSTOMERS_KEY)
  openedFromList = false
}

// The customer page's "‹ ลูกค้า" goes back (keeping the search, AC-02-4) only when the
// list opened it in this tab; otherwise it is a plain link to /customers.

/** The list calls this when a customer is opened from it (true) and when it shows again (false) */
export function setOpenedFromList(value: boolean): void {
  openedFromList = value
}

export function wasOpenedFromList(): boolean {
  return openedFromList
}
