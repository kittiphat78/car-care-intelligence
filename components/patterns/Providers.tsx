'use client'

import type { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/Toast'
import { ToastProvider as LegacyToastProvider } from '@/hooks/useToast'
import { useGlobalErrorReporting } from '@/hooks/useGlobalErrorReporting'

// App-wide client providers. The v1 toast stays until the old pages move to the new one
// (C3–C7); both can be on screen without clashing.
export function Providers({ children }: { children: ReactNode }) {
  // Send uncaught browser errors to the server log (ADR-11)
  useGlobalErrorReporting()

  return (
    <ToastProvider>
      <LegacyToastProvider>{children}</LegacyToastProvider>
    </ToastProvider>
  )
}
