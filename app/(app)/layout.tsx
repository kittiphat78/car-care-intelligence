import { Suspense } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { APP_PATH_HEADER, loginPathFor } from '@/lib/auth/redirect'
import { AppShell } from '@/components/patterns/nav/AppShell'
import { LogoutDialog } from '@/features/auth/components/LogoutDialog'

// Second sign-in check, on the server (ADR-13). proxy.ts already redirects signed-out
// visitors; this layer still holds if a request reaches a page without going through
// the proxy. RLS in the database remains the real boundary (ADR-04).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()

  if (!user) {
    const path = (await headers()).get(APP_PATH_HEADER) ?? '/'
    redirect(loginPathFor(path))
  }

  const email = user.email ?? ''
  return (
    <AppShell
      email={email}
      dialogs={
        <Suspense fallback={null}>
          <LogoutDialog email={email} />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  )
}
