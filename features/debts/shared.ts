import { UNPAID_KEY, isOk, load } from '@/lib/data-store'
import { listUnpaid } from './api'

/** The unpaid list through the shared store (lib/data-store.ts): the dashboard, /debts and a prefetch share it */
export function loadUnpaidShared({ fresh = false } = {}) {
  return load(UNPAID_KEY, listUnpaid, { keep: isOk, fresh })
}
