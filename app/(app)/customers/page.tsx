import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getSessionUser } from '@/lib/auth/session'
import { fromServer } from '@/lib/server-data'
import { listCustomers } from '@/features/customers/api'
import { CustomersScreen } from '@/features/customers/components/CustomersScreen'

export const metadata: Metadata = { title: 'ลูกค้า · คาร์แคร์' }

export default async function CustomersPage() {
  // The (app) layout already redirected signed-out visitors; cache() shares its lookup.
  // The id only names the new-customer draft of this account (sessionStorage). The
  // directory comes with the page (3e, ADR-31); the screen loads it itself if this fails.
  const [user, initial] = await Promise.all([getSessionUser(), fromServer((client) => listCustomers(client))])
  return (
    <Suspense fallback={null}>
      <CustomersScreen userId={user?.id ?? ''} initial={initial} />
    </Suspense>
  )
}
