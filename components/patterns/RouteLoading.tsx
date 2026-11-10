import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/Card'
import { SkeletonCard, SkeletonGroup, SkeletonRow, SkeletonText } from '@/components/ui/Skeleton'

// What a page shows the moment its tab is tapped, while the server answers (the
// loading.tsx of each route). Next.js prefetches it with the links in the nav, so it
// needs no request. Same frame as the page: title, then grey blocks where data goes.

export function RouteLoading({ title, label, className, children }: { title?: string; label: string; className?: string; children: ReactNode }) {
  return (
    <div data-route-loading="" className={cn('grid grid-cols-1 gap-4 pb-4', className)}>
      {title && (
        <header className="pt-6 pb-0">
          <h1 className="text-title text-text">{title}</h1>
        </header>
      )}
      <SkeletonGroup label={label} className="grid grid-cols-1 gap-4">
        {children}
      </SkeletonGroup>
    </div>
  )
}

/** A card of list rows, like the record and customer lists */
export function SkeletonRowsCard({ rows = 6 }: { rows?: number }) {
  return (
    <Card>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </Card>
  )
}

/** A control the height of a text field, tab bar or search box */
export function SkeletonField() {
  return <SkeletonCard className="h-12 rounded-md" />
}

export { SkeletonCard, SkeletonText }
