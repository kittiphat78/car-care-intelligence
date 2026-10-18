import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

// component-specifications.md §1.11 — placeholder the same size as the real content.
// The shimmer stops with reduced motion. Wrap a group in <SkeletonGroup> so screen
// readers hear "กำลังโหลด…" once instead of a list of empty boxes.

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('rounded-sm bg-surface-2 animate-shimmer motion-reduce:animate-none', className)} />
}

export function SkeletonGroup({ children, label = 'กำลังโหลด…', className }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <div aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

/** One line of body text (or several) */
export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full')} />
      ))}
    </div>
  )
}

/** A money figure (display size) */
export function SkeletonMoney({ className }: { className?: string }) {
  return <Skeleton className={cn('h-12 w-48', className)} />
}

/**
 * One RecordRow, line for line (plate + badge on the left, price + time on the right;
 * each bar one line of the same text style), so a list does not grow when rows arrive
 * (Step 09 O-10)
 */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 py-3', className)}>
      <Skeleton className="size-10 shrink-0 rounded-md" />
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-0.5">
        <div className="text-subheading">
          <Skeleton className="h-[1lh] w-2/5" />
        </div>
        <Skeleton className="h-6 w-14" />
      </div>
      <div className="grid grid-cols-1 justify-items-end gap-0.5">
        <div className="text-subheading">
          <Skeleton className="h-[1lh] w-16" />
        </div>
        <div className="text-caption">
          <Skeleton className="h-[1lh] w-10" />
        </div>
      </div>
    </div>
  )
}

/** A card of the given height */
export function SkeletonCard({ className }: { className?: string }) {
  return <Skeleton className={cn('h-32 w-full rounded-lg', className)} />
}
