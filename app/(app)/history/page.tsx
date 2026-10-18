import type { Metadata } from 'next'
import { Suspense } from 'react'
import { HistoryScreen } from '@/features/history/components/HistoryScreen'

export const metadata: Metadata = { title: 'ประวัติ · คาร์แคร์' }

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryScreen />
    </Suspense>
  )
}
