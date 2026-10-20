import { RouteLoading, SkeletonCard } from '@/components/patterns/RouteLoading'

export default function DebtsLoading() {
  return (
    <RouteLoading title="ค้างชำระ" label="กำลังโหลดรายการค้างชำระ…">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-64" />
      </div>
    </RouteLoading>
  )
}
