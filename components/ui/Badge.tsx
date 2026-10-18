import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from './Icon'

// component-specifications.md §1.7 — a status badge always carries text, never colour alone

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'wash' | 'polish' | 'info'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-text-secondary',
  success: 'bg-success-subtle text-success-text',
  warning: 'bg-warning-subtle text-warning-text',
  danger: 'bg-danger-subtle text-danger-text',
  wash: 'bg-wash-subtle text-wash',
  polish: 'bg-polish-subtle text-polish',
  info: 'bg-info-subtle text-info-text',
}

export function Badge({ tone = 'neutral', icon, children, className }: { tone?: BadgeTone; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center gap-1 rounded-sm px-2 text-caption font-medium whitespace-nowrap', TONES[tone], className)}>
      {icon && <Icon name={icon} size="sm" />}
      {children}
    </span>
  )
}
