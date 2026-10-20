import { RouteLoading, SkeletonCard, SkeletonField } from '@/components/patterns/RouteLoading'

export default function AddLoading() {
  return (
    <RouteLoading title="บันทึกรายการ" label="กำลังเปิดหน้าบันทึกรายการ…">
      <SkeletonField />
      <SkeletonCard className="h-72" />
    </RouteLoading>
  )
}
