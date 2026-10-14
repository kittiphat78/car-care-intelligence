import { useEffect } from 'react'
import { reportError } from '@/lib/observability'

// Browser noise that is not an app bug
const IGNORED_MESSAGES = [/ResizeObserver loop/i, /^Script error\.?$/i]

/** Report uncaught errors and unhandled promise rejections (ADR-11). */
export function useGlobalErrorReporting() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (event.filename && !event.filename.startsWith(window.location.origin)) return
      if (IGNORED_MESSAGES.some(pattern => pattern.test(event.message))) return
      reportError(event.error ?? event.message)
    }
    const onRejection = (event: PromiseRejectionEvent) => {
      reportError(event.reason)
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
}
