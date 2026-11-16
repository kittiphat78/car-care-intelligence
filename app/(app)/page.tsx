import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getSessionUser } from '@/lib/auth/session'
import { fromServer } from '@/lib/server-data'
import { bangkokToday } from '@/lib/time/bangkok'
import { loadDashboard } from '@/features/dashboard/api'
import { DashboardScreen } from '@/features/dashboard/components/DashboardScreen'

export const metadata: Metadata = { title: 'ภาพรวมวันนี้ · คาร์แคร์' }

export default async function DashboardPage() {
  // Same request as the (app) layout, so cache() makes the user free. The figures come
  // with the page (3e, ADR-31); the screen loads them itself if this fails.
  const [user, initial] = await Promise.all([
    getSessionUser(),
    fromServer(async (client) => {
      const day = bangkokToday()
      return { day, data: await loadDashboard(day, undefined, client) }
    }),
  ])
  return (
    <Suspense fallback={null}>
      <DashboardScreen email={user?.email ?? ''} initial={initial} />
    </Suspense>
  )
}
