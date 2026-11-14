'use client'

import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from './Icon'

// component-specifications.md §1.4 — one radiogroup for job type, car type, brand,
// payment status, expense shortcuts and filters (replaces 5 hand-made versions, TD-08).

export type ChoiceTone = 'primary' | 'wash' | 'polish' | 'success' | 'warning' | 'danger'

export interface ChoiceOption<V extends string> {
  value: V
  label: ReactNode
  /** Second line, tile variant only */
  description?: ReactNode
  icon?: IconName
  disabled?: boolean
  /** Overrides the group's tone for this option (e.g. ล้างรถ = wash, ขัดสี = polish) */
  tone?: ChoiceTone
}

// Selected = subtle background + 2px border in the tone colour + ✓ (never colour alone)
const SELECTED: Record<ChoiceTone, string> = {
  primary: 'aria-checked:bg-primary-subtle aria-checked:border-primary aria-checked:text-link',
  wash: 'aria-checked:bg-wash-subtle aria-checked:border-wash aria-checked:text-wash',
  polish: 'aria-checked:bg-polish-subtle aria-checked:border-polish aria-checked:text-polish',
  success: 'aria-checked:bg-success-subtle aria-checked:border-success aria-checked:text-success-text',
  warning: 'aria-checked:bg-warning-subtle aria-checked:border-warning aria-checked:text-warning-text',
  danger: 'aria-checked:bg-danger-subtle aria-checked:border-danger aria-checked:text-danger-text',
}

// Tile with an icon: the icon sits in a rounded square of the tone (ADR-28), left of the text,
// so the tile is no taller than before
const ICON_TILE: Record<ChoiceTone, string> = {
  primary: 'bg-primary-subtle text-link',
  wash: 'bg-wash-subtle text-wash',
  polish: 'bg-polish-subtle text-polish',
  success: 'bg-success-subtle text-success-text',
  warning: 'bg-warning-subtle text-warning-text',
  danger: 'bg-danger-subtle text-danger-text',
}

const GRID_COLUMNS: Record<number, string> = {
  2: 'grid grid-cols-2',
  3: 'grid grid-cols-3',
  4: 'grid grid-cols-2 md:grid-cols-4',
}

export interface ChoiceGroupProps<V extends string> {
  /** Accessible name of the group; use labelledBy when a visible label exists */
  label?: string
  labelledBy?: string
  describedBy?: string
  options: ReadonlyArray<ChoiceOption<V>>
  value: V | null
  onChange: (value: V | null) => void
  variant?: 'chip' | 'tile'
  tone?: ChoiceTone
  /** Pressing the selected option again clears it (car type, brand) */
  clearable?: boolean
  /** Grid with N columns instead of wrapping */
  columns?: 2 | 3 | 4
  invalid?: boolean
  className?: string
}

export function ChoiceGroup<V extends string>({
  label,
  labelledBy,
  describedBy,
  options,
  value,
  onChange,
  variant = 'chip',
  tone = 'primary',
  clearable = false,
  columns,
  invalid = false,
  className,
}: ChoiceGroupProps<V>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0)
  const selectedIndex = options.findIndex((o) => o.value === value)
  // Roving tabindex: Tab enters on the selected option, or the first one
  const tabStop = selectedIndex >= 0 && !options[selectedIndex].disabled ? selectedIndex : enabled[0]

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    let next: number | undefined
    if (step !== undefined) {
      const at = enabled.indexOf(index)
      next = enabled[(at + step + enabled.length) % enabled.length]
    } else if (e.key === 'Home') next = enabled[0]
    else if (e.key === 'End') next = enabled[enabled.length - 1]
    if (next === undefined) return
    e.preventDefault()
    refs.current[next]?.focus()
    onChange(options[next].value)
  }

  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={cn(columns ? GRID_COLUMNS[columns] : 'flex flex-wrap', 'gap-2', className)}
    >
      {options.map((option, index) => {
        const checked = option.value === value
        const iconTile = variant === 'tile' && !!option.icon
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={option.disabled}
            tabIndex={index === tabStop ? 0 : -1}
            data-state={checked ? 'selected' : undefined}
            onClick={() => onChange(checked && clearable ? null : option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'press focus-ring inline-flex items-center justify-center rounded-md border bg-surface text-text',
              'hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50',
              'aria-checked:border-2 aria-checked:font-semibold',
              invalid && !value ? 'border-2 border-danger-text' : 'border-border-strong',
              variant === 'chip'
                ? 'min-h-11 gap-1.5 px-3.5 text-body font-medium'
                : iconTile
                  ? 'min-h-18 justify-start gap-2.5 p-2 px-3 text-left text-body font-medium'
                  : 'min-h-18 flex-col gap-0.5 p-2 text-body font-medium',
              SELECTED[option.tone ?? tone],
            )}
          >
            {iconTile && (
              <span aria-hidden="true" className={cn('grid size-10 shrink-0 place-items-center rounded-md', ICON_TILE[option.tone ?? tone])}>
                <Icon name={option.icon!} size="lg" />
              </span>
            )}
            <span className={cn('grid min-w-0', iconTile ? 'justify-items-start' : 'justify-items-center')}>
              <span className="inline-flex items-center gap-1.5">
                {checked && <Icon name="check" size="sm" data-testid="choice-check" />}
                {option.icon && !iconTile && <Icon name={option.icon} size="md" />}
                <span>{option.label}</span>
              </span>
              {variant === 'tile' && option.description && (
                <span className="text-caption font-normal text-text-tertiary">{option.description}</span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
