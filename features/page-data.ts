import { CUSTOMERS_KEY, DASHBOARD_KEY, UNPAID_KEY, historyKey, known } from '@/lib/data-store'
import { bangkokParts } from '@/lib/time/bangkok'
import { loadTodayDashboard } from '@/features/dashboard/hooks'
import { loadUnpaidShared } from '@/features/debts/shared'
import { loadHistoryPeriod } from '@/features/history/shared'
import { loadDirectory } from '@/features/customers/shared'

// What each page asks for first, so a tap on a link or an idle moment can start it before
// the page is there (speed work 3c, ADR-29). Every part goes through the shared store, so
// the page joins the request already running, or uses its answer if it arrived a moment
// ago, instead of asking again. Loaded on demand by lib/prefetch-data.ts.

interface Part {
  key: () => string
  load: () => Promise<unknown>
}

const thisMonth = () => bangkokParts()
const dashboard: Part = { key: () => DASHBOARD_KEY, load: () => loadTodayDashboard() }
const unpaid: Part = { key: () => UNPAID_KEY, load: () => loadUnpaidShared() }
const directory: Part = { key: () => CUSTOMERS_KEY, load: () => loadDirectory() }
const history: Part = {
  key: () => historyKey(thisMonth().year, thisMonth().month),
  load: () => loadHistoryPeriod(thisMonth().year, thisMonth().month),
}

/** The pages worth warming; /add and /more show nothing to load first */
export const PAGE_PARTS: Readonly<Record<string, readonly Part[]>> = {
  '/': [dashboard],
  '/debts': [unpaid, directory],
  // The month the page opens on; the rest of the year follows once it is open
  '/history': [history],
  '/customers': [directory],
}

/** Start loading `path`'s data. `onlyMissing`: leave alone what is kept or already on its way. */
export function warmPage(path: string, { onlyMissing = false } = {}): void {
  for (const part of PAGE_PARTS[path] ?? []) {
    if (onlyMissing && known(part.key())) continue
    part.load().catch(() => {
      // The page asks again when it opens and shows the error there
    })
  }
}

/** An idle moment: what the other tabs show first, if not kept yet */
export function warmOtherPages(current: string): void {
  for (const path of Object.keys(PAGE_PARTS)) if (path !== current) warmPage(path, { onlyMissing: true })
}
