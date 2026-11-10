import { RouteLoading, SkeletonField, SkeletonRowsCard } from '@/components/patterns/RouteLoading'

export default function CustomersLoading() {
  return (
    <RouteLoading title="ลูกค้า" label="กำลังโหลดรายชื่อลูกค้า…">
      <SkeletonField />
      <SkeletonRowsCard />
    </RouteLoading>
  )
}
