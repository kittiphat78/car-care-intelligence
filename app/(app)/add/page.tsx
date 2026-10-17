import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getSessionUser } from '@/lib/auth/session'
import { AddScreen } from '@/features/records/components/AddScreen'

export const metadata: Metadata = { title: 'บันทึกรายการ · คาร์แคร์' }

export default async function AddPage() {
  // The (app) layout already redirected signed-out visitors; cache() shares its lookup
  const user = await getSessionUser()
  return (
    <Suspense fallback={null}>
      <AddScreen userId={user?.id ?? ''} email={user?.email ?? ''} />
    </Suspense>
  )
}
