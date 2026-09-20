export function LoadingSkeleton() {
  return (
    <div className="min-h-dvh px-4 pt-6 space-y-5 content-with-nav">
      {/* Header skeleton */}
      <div className="flex items-center justify-between fade-up">
        <div>
          <div className="skeleton h-4 w-40 mb-2" />
          <div className="skeleton h-7 w-56" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton w-11 h-11 rounded-[var(--radius-md)]" />
          <div className="skeleton w-24 h-11 rounded-[var(--radius-md)]" />
        </div>
      </div>

      {/* Weather skeleton */}
      <div className="skeleton h-44 rounded-[var(--radius-lg)] fade-up delay-1" />

      {/* Net profit hero skeleton */}
      <div className="skeleton h-36 rounded-[var(--radius-xl)] fade-up delay-2" />

      {/* Stats row skeleton */}
      <div className="grid grid-cols-3 gap-3 fade-up delay-3">
        <div className="skeleton h-32 rounded-[var(--radius-lg)]" />
        <div className="skeleton h-32 rounded-[var(--radius-lg)]" />
        <div className="skeleton h-32 rounded-[var(--radius-lg)]" />
      </div>

      {/* Chart skeleton */}
      <div className="fade-up delay-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="skeleton h-5 w-28" />
          <div className="skeleton h-9 w-32 rounded-xl" />
        </div>
        <div className="skeleton h-52 rounded-[var(--radius-lg)]" />
      </div>

      {/* Record list skeleton */}
      <div className="fade-up delay-5">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="skeleton h-5 w-24" />
          <div className="skeleton h-5 w-16" />
        </div>
        <div className="space-y-3">
          <div className="skeleton h-20 rounded-[var(--radius-lg)]" />
          <div className="skeleton h-20 rounded-[var(--radius-lg)]" />
          <div className="skeleton h-20 rounded-[var(--radius-lg)]" />
        </div>
      </div>
    </div>
  )
}
