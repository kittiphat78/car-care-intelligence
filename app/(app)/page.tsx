import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getSessionUser } from '@/lib/auth/session'
import { DashboardScreen } from '@/features/dashboard/components/DashboardScreen'

export const metadata: Metadata = { title: 'ภาพรวมวันนี้ · คาร์แคร์' }

export default async function DashboardPage() {
  // Same request as the (app) layout, so cache() makes this free
  const user = await getSessionUser()
  return (
    <Suspense fallback={null}>
      <DashboardScreen email={user?.email ?? ''} />
    </Suspense>
  )
}
