import { createErrorRef, type AppError, type AppErrorCode } from '@/lib/errors'

export const CLIENT_ERRORS_ENDPOINT = '/api/client-errors'
export const MAX_REPORT_BYTES = 4096
const MAX_MESSAGE_LENGTH = 300
const MAX_REPORTS_PER_PAGE = 10

export interface ErrorReport {
  code: AppErrorCode
  ref: string
  route: string
  message: string
  appVersion: string
  userAgent?: string
  at: string
}

export interface ReportContext {
  code?: AppErrorCode
  ref?: string
  route?: string
}

/**
 * Remove data that could identify a customer or user before a message leaves the device:
 * e-mail addresses and runs of 3+ digits (plates, phone numbers, amounts).
 */
export function scrubMessage(text: string): string {
  return text
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]')
    .replace(/\d{3,}/g, '#')
    .slice(0, MAX_MESSAGE_LENGTH)
}

// SQLSTATE (e.g. 42501) or PostgREST (e.g. PGRST301) codes: kept as-is because they carry no user data
const DB_ERROR_CODE = /^(?:[0-9A-Z]{5}|PGRST\d{3})$/

function describe(error: unknown): string {
  if (error instanceof Error) return scrubMessage(`${error.name}: ${error.message}`)
  if (typeof error === 'string') return scrubMessage(error)
  // Supabase returns plain objects such as { code, message }
  const { code, message } = (error ?? {}) as { code?: unknown; message?: unknown }
  if (typeof message === 'string') {
    return typeof code === 'string' && DB_ERROR_CODE.test(code)
      ? `${code}: ${scrubMessage(message)}`.slice(0, MAX_MESSAGE_LENGTH)
      : scrubMessage(message)
  }
  return 'Non-error value thrown'
}

export function buildErrorReport(error: unknown, context: ReportContext = {}): ErrorReport {
  const hasWindow = typeof window !== 'undefined'
  return {
    code: context.code ?? 'UNKNOWN',
    ref: context.ref ?? createErrorRef(),
    route: (context.route ?? (hasWindow ? window.location.pathname : '')).slice(0, 100),
    message: describe(error),
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
    userAgent: hasWindow ? navigator.userAgent.slice(0, 200) : undefined,
    at: new Date().toISOString(),
  }
}

let reportsSent = 0

/** Test hook: reset the per-page report counter. */
export function resetReportBudget() {
  reportsSent = 0
}

/**
 * Send an error to the server log (Vercel runtime logs) without blocking the UI.
 * Never throws. Returns the reference so the caller can show it to the user.
 */
export function reportError(error: unknown, context: ReportContext = {}): string {
  const report = buildErrorReport(error, context)
  if (typeof window === 'undefined' || reportsSent >= MAX_REPORTS_PER_PAGE) return report.ref
  reportsSent++

  try {
    const body = JSON.stringify(report)
    if (new TextEncoder().encode(body).length > MAX_REPORT_BYTES) return report.ref
    const blob = new Blob([body], { type: 'application/json' })
    const queued = typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(CLIENT_ERRORS_ENDPOINT, blob)
    if (!queued) {
      void fetch(CLIENT_ERRORS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => {})
    }
  } catch {
    // Reporting must never break the page
  }
  return report.ref
}

// Expected failures (offline, validation, expired session) are not bugs and are not reported
const REPORTED_CODES: ReadonlySet<AppErrorCode> = new Set(['SERVER', 'UNKNOWN', 'ROW_LIMIT'])

/** Report a data-access failure that points to a bug or a server problem, keeping its reference. */
export function reportAppError(error: AppError): void {
  if (REPORTED_CODES.has(error.code)) reportError(error.cause ?? error.code, { code: error.code, ref: error.ref })
}
