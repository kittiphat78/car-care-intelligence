import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Icon, type IconName } from '@/components/ui/Icon'

// component-specifications.md §2.5–2.6

export function EmptyState({
  icon = 'info',
  title,
  children,
  action,
  className,
}: {
  icon?: IconName
  title: string
  children?: ReactNode
  /** A button or link */
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-1 justify-items-center gap-2 px-4 py-8 text-center', className)}>
      <Icon name={icon} className="size-10 text-text-tertiary" />
      <p className="text-subheading text-text">{title}</p>
      {children && <p className="max-w-80 text-body text-text-secondary">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** A part of the page failed to load. Never shows ฿0 in its place (MoneyHero rule). */
export function ErrorState({
  title = 'โหลดข้อมูลไม่สำเร็จ',
  message,
  onRetry,
  className,
}: {
  title?: string
  /** Thai message with reference code (toUserMessage) */
  message?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div role="alert" className={cn('grid grid-cols-1 justify-items-center gap-2 px-4 py-6 text-center', className)}>
      <Icon name="alert" className="size-10 text-danger-text" />
      <p className="text-subheading text-text">{title}</p>
      {message && <p className="max-w-80 text-caption text-text-secondary">{message}</p>}
      {onRetry && (
        <Button variant="secondary" leadingIcon="refresh" onClick={onRetry} className="mt-2">
          ลองอีกครั้ง
        </Button>
      )}
    </div>
  )
}
