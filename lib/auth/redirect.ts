export const LOGIN_PATH = '/login'
export const NEXT_PARAM = 'next'

/** Request header proxy.ts sets to the path being opened, so a server layout (which is
 *  not told its URL) can build the same `/login?next=` link (ADR-13). */
export const APP_PATH_HEADER = 'x-app-path'

/** Pages that need a signed-in member. proxy.ts and the (app) layout both use this. */
export const PROTECTED_ROUTES = ['/', '/debts', '/add', '/history', '/customers', '/more']

export const isProtectedPath = (path: string) =>
  PROTECTED_ROUTES.some(route => (route === '/' ? path === '/' : path === route || path.startsWith(`${route}/`)))

const BASE = 'http://app.invalid'

/**
 * Where to go after signing in. Only a path on this site is accepted, so the
 * `next` parameter cannot send the user to another website (open redirect);
 * anything else, including /login itself, falls back to the dashboard.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  try {
    const url = new URL(value, BASE)
    if (url.origin !== BASE || url.pathname.startsWith(LOGIN_PATH)) return '/'
    return `${url.pathname}${url.search}`
  } catch {
    return '/'
  }
}

/** Login URL that returns to `pathWithSearch` after signing in (plain /login for the dashboard). */
export function loginPathFor(pathWithSearch: string): string {
  const next = safeNextPath(pathWithSearch)
  return next === '/' ? LOGIN_PATH : `${LOGIN_PATH}?${NEXT_PARAM}=${encodeURIComponent(next)}`
}
