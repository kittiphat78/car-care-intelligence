import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

// component-specifications.md §1.3 — 48px, 18px text (no iOS zoom), label from FormField.
// Prefix/suffix sit inside the border (฿, search icon, clear button).

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  invalid?: boolean
  prefix?: ReactNode
  suffix?: ReactNode
  /** Extra classes for the <input> itself (size, alignment) */
  inputClassName?: string
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { invalid = false, prefix, suffix, className, inputClassName, disabled, ...rest },
  ref,
) {
  return (
    <div
      data-state={invalid ? 'invalid' : undefined}
      className={cn(
        'flex min-h-12 items-center gap-2 rounded-md border bg-surface px-4 text-body-lg text-text',
        'focus-within:border-2 focus-within:border-primary focus-within:px-[15px] focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus',
        invalid ? 'border-2 border-danger-text px-[15px]' : 'border-border-strong',
        disabled && 'bg-surface-2 opacity-70',
        className,
      )}
    >
      {prefix && <span className="shrink-0 text-text-tertiary">{prefix}</span>}
      <input
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn('h-full min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed', inputClassName)}
        {...rest}
      />
      {suffix && <span className="shrink-0">{suffix}</span>}
    </div>
  )
})
