import { RouteLoading, SkeletonCard, SkeletonField, SkeletonRowsCard } from '@/components/patterns/RouteLoading'

export default function HistoryLoading() {
  return (
    <RouteLoading title="ประวัติ" label="กำลังโหลดประวัติ…">
      <SkeletonField />
      <SkeletonCard className="h-28" />
      <SkeletonRowsCard />
    </RouteLoading>
  )
}
