'use client'

import { useId } from 'react'
import { cn } from '@/lib/cn'

// On/off setting that applies at once (e.g. ธีมมืด). role="switch" with a visible label.

export interface SwitchProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  description?: string
  disabled?: boolean
  className?: string
}

export function Switch({ label, checked, onChange, description, disabled, className }: SwitchProps) {
  const labelId = useId()
  const descriptionId = useId()
  return (
    <div className={cn('flex min-h-12 items-center gap-4', className)}>
      <div className="min-w-0 flex-1">
        <p id={labelId} className="text-body text-text">
          {label}
        </p>
        {description && (
          <p id={descriptionId} className="text-caption text-text-tertiary">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'focus-ring relative inline-flex h-8 w-13 shrink-0 items-center rounded-full border-2 transition-colors duration-150',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'border-primary bg-primary' : 'border-border-strong bg-surface-2',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block size-6 rounded-full bg-surface shadow-elevation-2 transition-transform duration-150',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}
