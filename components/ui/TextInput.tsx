import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

// component-specifications.md §1.3 — 48px, 18px text (no iOS zoom), label from FormField.
// Prefix/suffix sit inside the border (฿, search icon, clear button).

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'size'> {
  invalid?: boolean
  prefix?: ReactNode
  suffix?: ReactNode
  /** Extra classes for the <input> itself (text size, alignment) */
  inputClassName?: string
  /** md = 48px; lg = 64px for plate and money fields */
  size?: 'md' | 'lg'
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { invalid = false, prefix, suffix, className, inputClassName, disabled, size = 'md', ...rest },
  ref,
) {
  return (
    <div
      data-state={invalid ? 'invalid' : undefined}
      className={cn(
        'flex items-center gap-2 rounded-md border text-body-lg text-text',
        size === 'md' ? 'min-h-12' : 'min-h-16',
        'focus-within:border-2 focus-within:border-primary focus-within:px-[15px] focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus',
        // 2px border when invalid, with 1px less padding so the text does not move
        invalid ? 'border-2 border-danger-text px-[15px]' : 'border-border-strong px-4',
        disabled ? 'bg-surface-2 opacity-70' : 'bg-surface',
        className,
      )}
    >
      {prefix && <span className="shrink-0 text-text-tertiary">{prefix}</span>}
      <input
        ref={ref}
        // size=1: no built-in 20-character minimum width, so the box can be as narrow
        // as the screen allows (the width comes from flex-1)
        size={1}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn('h-full min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed', inputClassName)}
        {...rest}
      />
      {suffix && <span className="shrink-0">{suffix}</span>}
    </div>
  )
})
