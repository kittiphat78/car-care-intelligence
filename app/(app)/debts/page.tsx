import type { Metadata } from 'next'
import { Suspense } from 'react'
import { fromServer } from '@/lib/server-data'
import { listUnpaid } from '@/features/debts/api'
import { DebtsScreen } from '@/features/debts/components/DebtsScreen'

export const metadata: Metadata = { title: 'ค้างชำระ · คาร์แคร์' }

export default async function DebtsPage() {
  // The unpaid list comes with the page (3e, ADR-31); the screen loads it itself if this fails
  const initial = await fromServer((client) => listUnpaid(client))
  return (
    <Suspense fallback={null}>
      <DebtsScreen initial={initial} />
    </Suspense>
  )
}
