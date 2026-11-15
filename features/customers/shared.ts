import { CUSTOMERS_KEY, isOk, load } from '@/lib/data-store'
import { listCustomers } from './api'

/** The whole directory through the shared store: every page that shows it and a prefetch share it */
export function loadDirectory({ fresh = false } = {}) {
  return load(CUSTOMERS_KEY, listCustomers, { keep: isOk, fresh })
}
