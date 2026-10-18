import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DebtsScreen } from '@/features/debts/components/DebtsScreen'

export const metadata: Metadata = { title: 'ค้างชำระ · คาร์แคร์' }

export default function DebtsPage() {
  return (
    <Suspense fallback={null}>
      <DebtsScreen />
    </Suspense>
  )
}
