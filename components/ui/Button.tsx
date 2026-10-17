import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon, Spinner, type IconName } from './Icon'

// component-specifications.md §1.1–1.2

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost' | 'success'
export type ButtonSize = 'md' | 'lg'

// Each variant sets its own border colour: two border-colour utilities on one element
// would leave the winner to stylesheet order
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border-border-strong bg-surface text-text hover:bg-surface-2',
  ghost: 'border-transparent bg-transparent text-link hover:bg-surface-2',
  danger: 'border-transparent bg-danger text-on-primary',
  'danger-ghost': 'border-transparent bg-transparent text-danger-text hover:bg-surface-2',
  success: 'border-transparent bg-success text-on-primary',
}

const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-12 text-body font-semibold',
  lg: 'min-h-14 text-body-lg font-semibold',
}

/** Classes of a Button, for a link that must look like one (e.g. "บันทึกรายการ" in SideNav) */
export function buttonClassName({ variant = 'primary', size = 'md', fullWidth = false }: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean } = {}) {
  return cn(
    'press focus-ring inline-flex items-center justify-center gap-2 rounded-md border text-center select-none',
    'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
    // Text-only buttons sit closer to their neighbours
    variant === 'ghost' || variant === 'danger-ghost' ? 'px-3' : 'px-5',
    fullWidth && 'w-full',
  )
}

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  leadingIcon?: IconName
  trailingIcon?: IconName
  isLoading?: boolean
  /** Shown instead of the label while loading, e.g. "กำลังบันทึก…" */
  loadingText?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    isLoading = false,
    loadingText,
    type = 'button',
    disabled,
    onClick,
    className,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      // A loading button stays focusable (focus is not lost) but cannot be pressed again
      aria-disabled={isLoading || undefined}
      aria-busy={isLoading || undefined}
      data-state={isLoading ? 'loading' : undefined}
      onClick={isLoading ? (e) => e.preventDefault() : onClick}
      className={cn(buttonClassName({ variant, size, fullWidth }), className)}
      {...rest}
    >
      {isLoading ? <Spinner /> : leadingIcon && <Icon name={leadingIcon} />}
      <span>{isLoading && loadingText ? loadingText : children}</span>
      {!isLoading && trailingIcon && <Icon name={trailingIcon} />}
    </button>
  )
})

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  icon: IconName
  /** Required: an icon-only button has no other accessible name */
  'aria-label': string
  variant?: 'ghost' | 'secondary'
  size?: 'md' | 'lg'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, variant = 'ghost', size = 'md', type = 'button', className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'press focus-ring inline-grid shrink-0 place-items-center rounded-md border',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'ghost'
          ? 'border-transparent bg-transparent text-text-secondary hover:bg-surface-2'
          : 'border-border-strong bg-surface text-text hover:bg-surface-2',
        size === 'md' ? 'size-11' : 'size-12',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size === 'md' ? 'md' : 'lg'} />
    </button>
  )
})
