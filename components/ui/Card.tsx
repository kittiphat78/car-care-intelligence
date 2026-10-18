import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

// component-specifications.md §1.6. An interactive card is a real <a> or <button>
// wrapped around <Card>, not a div with role="button".

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  tone?: 'default' | 'warning'
  /** Hover elevation for a card that sits inside a link or button */
  interactive?: boolean
  as?: 'div' | 'section' | 'article'
}

export function Card({ children, tone = 'default', interactive = false, as: Tag = 'div', className, ...rest }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-lg border p-(--card-padding)',
        tone === 'warning' ? 'border-warning bg-warning-subtle' : 'border-border bg-surface',
        interactive && 'transition-colors duration-150 hover:border-border-strong hover:shadow-elevation-1',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
