'use client'

import type { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/Toast'
import { useGlobalErrorReporting } from '@/hooks/useGlobalErrorReporting'

// App-wide client providers
export function Providers({ children }: { children: ReactNode }) {
  // Send uncaught browser errors to the server log (ADR-11)
  useGlobalErrorReporting()

  return <ToastProvider>{children}</ToastProvider>
}
