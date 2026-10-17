import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'

// component-specifications.md §2.1 — label bound to the control (fixes ER-24), required
// marker, hint, error and a counter when 10 or fewer characters are left.

export const hintId = (id: string) => `${id}-hint`
export const errorId = (id: string) => `${id}-error`

/** aria-describedby for the control inside a FormField */
export function describedBy(id: string, { hint, error }: { hint?: unknown; error?: unknown }): string | undefined {
  return [hint ? hintId(id) : null, error ? errorId(id) : null].filter(Boolean).join(' ') || undefined
}

export interface FormFieldProps {
  /** id of the control; the label points at it */
  id: string
  label: ReactNode
  required?: boolean
  hint?: ReactNode
  error?: string | null
  /** Shows "เหลือ N ตัวอักษร" once N ≤ 10 */
  length?: { value: number; max: number }
  /** For a group of buttons (ChoiceGroup): render a plain heading the group points at */
  asGroup?: boolean
  /** Extra content on the label row (e.g. a Badge) */
  aside?: ReactNode
  children: ReactNode
  className?: string
}

export const labelId = (id: string) => `${id}-label`

export function FormField({ id, label, required, hint, error, length, asGroup, aside, children, className }: FormFieldProps) {
  const left = length ? length.max - length.value : null
  const LabelTag = asGroup ? 'p' : 'label'
  return (
    <div className={cn('grid min-w-0 gap-1.5', className)}>
      <div className="flex items-center gap-2">
        <LabelTag id={labelId(id)} htmlFor={asGroup ? undefined : id} className="text-label text-text">
          {label}
          {required && (
            <>
              <span aria-hidden="true" className="ml-0.5 text-danger-text">
                *
              </span>
              <span className="sr-only"> (จำเป็น)</span>
            </>
          )}
        </LabelTag>
        {aside && <span className="ml-auto">{aside}</span>}
      </div>
      {children}
      {hint && (
        <p id={hintId(id)} className="text-caption text-text-tertiary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId(id)} className="flex items-start gap-1.5 text-caption font-medium text-danger-text">
          <Icon name="alert" size="sm" className="mt-0.75" />
          {error}
        </p>
      )}
      {left !== null && left <= 10 && (
        <p aria-live="polite" className="text-right text-caption text-text-tertiary">
          เหลือ {left} ตัวอักษร
        </p>
      )}
    </div>
  )
}
