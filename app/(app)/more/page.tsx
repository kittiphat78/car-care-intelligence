import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getSessionUser } from '@/lib/auth/session'
import { MoreScreen } from '@/features/auth/components/MoreScreen'

export const metadata: Metadata = { title: 'เพิ่มเติม · คาร์แคร์' }

export default async function MorePage() {
  // Same request as the (app) layout, so cache() makes this free
  const user = await getSessionUser()
  return (
    <Suspense fallback={null}>
      <MoreScreen email={user?.email ?? ''} />
    </Suspense>
  )
}
