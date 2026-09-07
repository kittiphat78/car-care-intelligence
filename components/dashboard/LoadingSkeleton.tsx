import { memo } from 'react'

export const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="min-h-dvh px-4 pt-6 space-y-5" aria-busy="true" aria-label="กำลังโหลดข้อมูล">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div><div className="skeleton h-4 w-16 mb-2" /><div className="skeleton h-7 w-28" /></div>
        <div className="skeleton h-10 w-24 rounded-xl" />
      </div>
      {/* Weather skeleton */}
      <div className="skeleton h-36 rounded-[var(--radius-xl)]" />
      {/* Hero skeleton */}
      <div className="skeleton h-40 rounded-[var(--radius-xl)]" />
      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-[var(--radius-lg)]" />)}
      </div>
      {/* Records skeleton */}
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-[76px] rounded-[var(--radius-lg)]" />)}
      </div>
    </div>
  )
})
