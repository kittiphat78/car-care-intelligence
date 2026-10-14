export const LOGIN_PATH = '/login'
export const NEXT_PARAM = 'next'

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
