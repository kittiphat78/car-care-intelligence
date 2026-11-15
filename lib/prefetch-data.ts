// Starts loading a page's data a moment before it opens (speed work 3c, ADR-29): on a tap
// on a link (with AppLink's page prefetch) and when the device is idle (IdlePrefetch).
// The loaders live in their own chunk (features/page-data.ts), so the shell every page
// downloads does not grow; it is fetched the first time it is needed.

/** Pages with data worth starting early (features/page-data.ts) */
const WARM_PATHS = new Set(['/', '/debts', '/history', '/customers'])

const pageData = () => import('@/features/page-data')

/** The page a link opens, if its data is worth starting now */
export function warmablePath(href: string): string | null {
  const url = new URL(href, 'http://app.local')
  // /history?y=…&m=… opens another month than the one warmed
  if (url.pathname === '/history' && url.search) return null
  return WARM_PATHS.has(url.pathname) ? url.pathname : null
}

/** A link is about to be followed (finger down, pointer over it, keyboard focus) */
export function warmPageData(href: string): void {
  const path = warmablePath(href)
  // The page already open loads its own data
  if (!path || path === window.location.pathname) return
  pageData()
    .then((m) => m.warmPage(path))
    .catch(() => {
      // Offline or a new deployment: the page loads its data when it opens
    })
}

/** The device is idle: what the other tabs show first, if not kept yet */
export function warmOtherPagesData(current: string): void {
  pageData()
    .then((m) => m.warmOtherPages(current))
    .catch(() => {})
}
