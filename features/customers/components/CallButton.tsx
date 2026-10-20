'use client'

import { cn } from '@/lib/cn'
import { IconButton, buttonClassName } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { formatPhone, telHref } from '../logic'

// US-03 / US-04 — call and copy a stored number. The link text is what the screen reader
// reads first ("โทร 081-234-5678", WCAG 2.5.3); who is called is added after it.

export interface CallLinkProps {
  /** Stored number (digits only) */
  number: string
  /** Read after the visible text, e.g. the customer's name */
  who?: string
  variant?: 'secondary' | 'primary'
  className?: string
}

/** <a href="tel:…"> that looks like a button, at least 44px high. Nothing for a number that is not valid. */
export function CallLink({ number, who, variant = 'secondary', className }: CallLinkProps) {
  const href = telHref(number)
  if (!href) return null
  const shown = formatPhone(number)
  return (
    <a
      href={href}
      aria-label={who ? `โทร ${shown} ${who}` : undefined}
      className={cn(buttonClassName({ variant, size: 'sm' }), 'min-w-0 tabular-nums', className)}
    >
      <Icon name="phone" />
      <span className="truncate">โทร {shown}</span>
    </a>
  )
}

/** Copies the number and says so; when the browser refuses, tells the user to select it by hand */
export function CopyNumberButton({ number, who }: { number: string; who?: string }) {
  const toast = useToast()
  const shown = formatPhone(number)

  async function copy() {
    try {
      await navigator.clipboard.writeText(number)
      toast.success(`คัดลอก ${shown} แล้ว`)
    } catch {
      toast.info('คัดลอกไม่ได้ในเบราว์เซอร์นี้ แตะค้างที่เบอร์เพื่อเลือกแล้วคัดลอกเอง')
    }
  }

  return (
    <IconButton
      icon="copy"
      variant="secondary"
      aria-label={who ? `คัดลอกเบอร์ ${shown} ${who}` : `คัดลอกเบอร์ ${shown}`}
      title="คัดลอกเบอร์"
      onClick={() => void copy()}
    />
  )
}

/** Call + copy side by side (list rows, customer page) */
export function CallActions({ number, who, className }: { number: string; who?: string; className?: string }) {
  if (!telHref(number)) return null
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <CallLink number={number} who={who} className="flex-1 sm:flex-none" />
      <CopyNumberButton number={number} who={who} />
    </div>
  )
}
