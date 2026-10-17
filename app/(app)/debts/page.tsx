import type { Metadata } from 'next'
import Link from 'next/link'
import { Banner } from '@/components/ui/Banner'
import { buttonClassName } from '@/components/ui/Button'
import { PageHeader } from '@/components/patterns/PageHeader'

export const metadata: Metadata = { title: 'ค้างชำระ · คาร์แคร์' }

// Placeholder so the new navigation has somewhere to go on develop. The real page
// (DebtCustomerCard, settle dialog, bill) arrives in C5; nothing here reaches
// production before v2.0.0.
export default function DebtsPage() {
  return (
    <div className="grid gap-4">
      <PageHeader title="ค้างชำระ" />
      <Banner tone="info" title="หน้านี้กำลังทำ (C5)">
        ระหว่างนี้ดูและเคลียร์ยอดค้างชำระได้จากการ์ดค้างชำระในหน้าภาพรวม
      </Banner>
      <Link href="/" className={buttonClassName({ variant: 'secondary' })}>
        ไปหน้าภาพรวม
      </Link>
    </div>
  )
}
