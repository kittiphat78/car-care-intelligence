import { RouteLoading, SkeletonCard, SkeletonText } from '@/components/patterns/RouteLoading'

// No title: the customer's name is the page's heading
export default function CustomerLoading() {
  return (
    <RouteLoading label="กำลังโหลดข้อมูลลูกค้า…" className="pt-6">
      <SkeletonText className="h-8 w-56" />
      <SkeletonCard className="h-40" />
      <SkeletonCard className="h-32" />
    </RouteLoading>
  )
}
