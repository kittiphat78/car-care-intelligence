import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getSessionUser } from '@/lib/auth/session'
import { CustomersScreen } from '@/features/customers/components/CustomersScreen'

export const metadata: Metadata = { title: 'ลูกค้า · คาร์แคร์' }

export default async function CustomersPage() {
  // The (app) layout already redirected signed-out visitors; cache() shares its lookup.
  // The id only names the new-customer draft of this account (sessionStorage).
  const user = await getSessionUser()
  return (
    <Suspense fallback={null}>
      <CustomersScreen userId={user?.id ?? ''} />
    </Suspense>
  )
}
