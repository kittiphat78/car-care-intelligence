import { RouteLoading, SkeletonCard } from '@/components/patterns/RouteLoading'

export default function MoreLoading() {
  return (
    <RouteLoading title="เพิ่มเติม" label="กำลังเปิดหน้าเพิ่มเติม…" className="mx-auto w-full max-w-140">
      <SkeletonCard className="h-18" />
      <SkeletonCard className="h-24" />
      <SkeletonCard className="h-40" />
    </RouteLoading>
  )
}
