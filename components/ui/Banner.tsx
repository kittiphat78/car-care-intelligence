import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from './Icon'

// component-specifications.md §1.10 — message for a form or a section of the page.
// danger is role="alert" (announced at once); the other tones are role="status".

export type BannerTone = 'info' | 'success' | 'warning' | 'danger'

const TONES: Record<BannerTone, { box: string; icon: IconName }> = {
  info: { box: 'bg-info-subtle text-info-text border-info-text', icon: 'info' },
  success: { box: 'bg-success-subtle text-success-text border-success', icon: 'check-circle' },
  warning: { box: 'bg-warning-subtle text-warning-text border-warning', icon: 'alert' },
  danger: { box: 'bg-danger-subtle text-danger-text border-danger', icon: 'alert' },
}

export interface BannerProps {
  tone?: BannerTone
  title: ReactNode
  children?: ReactNode
  /** A ghost button or link, e.g. "ลองอีกครั้ง" */
  action?: ReactNode
  /** Short reference for server errors (createErrorRef), shown so it can be reported */
  errorRef?: string
  className?: string
  /** Lets a form move focus to its error summary (tabIndex -1) */
  id?: string
  tabIndex?: number
}

export function Banner({ tone = 'info', title, children, action, errorRef, className, id, tabIndex }: BannerProps) {
  const { box, icon } = TONES[tone]
  return (
    <div
      id={id}
      tabIndex={tabIndex}
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('focus-ring flex items-start gap-3 rounded-md border px-4 py-3', box, className)}
    >
      <Icon name={icon} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">{title}</p>
        {children && <div className="mt-0.5 text-body text-text">{children}</div>}
        {errorRef && <p className="mt-1 text-caption text-text-secondary">รหัสอ้างอิง {errorRef}</p>}
      </div>
      {action && <div className="-my-1 shrink-0">{action}</div>}
    </div>
  )
}
