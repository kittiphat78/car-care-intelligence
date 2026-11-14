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
  const buttonId = useId()
  return (
    <div className={cn('flex min-h-12 items-center gap-4', className)}>
      <div className="min-w-0 flex-1">
        {/* A tap on the label switches too (a bigger target than the track) */}
        <label id={labelId} htmlFor={buttonId} className="block cursor-pointer text-body text-text">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-caption text-text-tertiary">
            {description}
          </p>
        )}
      </div>
      {/* The button is 44px tall (touch target, responsive-guidelines.md §4); the track
          inside stays 32px */}
      <button
        id={buttonId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="focus-ring group inline-flex h-11 w-13 shrink-0 items-center rounded-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          aria-hidden="true"
          className={cn(
            'relative inline-flex h-8 w-13 items-center rounded-full border-2 transition-colors duration-150',
            checked ? 'border-primary bg-primary' : 'border-border-strong bg-surface-2',
          )}
        >
          <span
            className={cn(
              'inline-block size-6 rounded-full bg-surface shadow-elevation-2 transition-transform duration-150',
              checked ? 'translate-x-5.5' : 'translate-x-0.5',
            )}
          />
        </span>
      </button>
    </div>
  )
}
