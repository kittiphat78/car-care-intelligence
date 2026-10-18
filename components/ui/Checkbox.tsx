'use client'

import { useId } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

// component-specifications.md §3.15 — 24px box inside a 44px tap area, real <input>

export function Checkbox({
  label,
  checked,
  onChange,
  className,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}) {
  const id = useId()
  return (
    <label htmlFor={id} className={cn('flex min-h-11 cursor-pointer items-center gap-3 text-body text-text-secondary select-none', className)}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={cn(
          'grid size-6 shrink-0 place-items-center rounded-sm border-2 transition-colors duration-150',
          'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
          checked ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-surface',
        )}
      >
        {checked && <Icon name="check" size="sm" />}
      </span>
      {label}
    </label>
  )
}
