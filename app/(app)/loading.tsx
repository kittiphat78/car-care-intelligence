import { RouteLoading, SkeletonCard, SkeletonRowsCard } from '@/components/patterns/RouteLoading'

export default function DashboardLoading() {
  return (
    <RouteLoading title="ภาพรวมวันนี้" label="กำลังโหลดภาพรวมวันนี้…">
      <SkeletonCard className="h-40" />
      <SkeletonCard className="h-28" />
      <SkeletonRowsCard rows={3} />
    </RouteLoading>
  )
}
