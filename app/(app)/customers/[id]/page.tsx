import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CustomerDetailScreen } from '@/features/customers/components/CustomerDetailScreen'

// The title stays generic: a customer's name would end up in the browser history
export const metadata: Metadata = { title: 'ลูกค้า · คาร์แคร์' }

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={null}>
      <CustomerDetailScreen id={id} />
    </Suspense>
  )
}
