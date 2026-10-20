'use client'

import { cn } from '@/lib/cn'
import { formatBangkok } from '@/lib/time/bangkok'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import type { Expense, Record as AppRecord } from '@/types'

// component-specifications.md §3.4 — one income or expense line. The whole row is a
// <button> that opens the edit dialog. Its accessible name is the text on screen plus a
// hidden hint, so voice control ("แตะ กข 1234") finds it (WCAG 2.5.3 Label in Name).

const baht = (n: number) => `฿${n.toLocaleString('en-US')}`
const timeOf = (at: string) => `${formatBangkok(at, { hour: '2-digit', minute: '2-digit', hour12: false })} น.`
const dateOf = (at: string) => formatBangkok(at, { day: 'numeric', month: 'short', year: '2-digit' })

/** "เพิ่มโดย x · แก้โดย y" under a row in history (component-specifications.md §3.4) */
function auditLine(row: { created_by_email?: string; updated_by_email?: string; updated_at?: string }): string | null {
  const who = (email?: string) => email?.split('@')[0]
  const parts = [row.created_by_email && `เพิ่มโดย ${who(row.created_by_email)}`, row.updated_at && row.updated_by_email && `แก้โดย ${who(row.updated_by_email)}`]
  return parts.filter(Boolean).join(' · ') || null
}

export function IncomeRow({
  record,
  highlight = false,
  showAudit = false,
  showDate = false,
  below,
  onOpen,
}: {
  record: AppRecord
  highlight?: boolean
  showAudit?: boolean
  /** The date as well as the time (rows from several days, e.g. a customer's history) */
  showDate?: boolean
  /** One more line under the row, e.g. why it is in a customer's history */
  below?: string
  onOpen: (r: AppRecord) => void
}) {
  const [, brand, note] = record.services ?? []
  const polish = record.type === 'polish'
  const unpaid = record.payment_status === 'unpaid'
  const extra = [record.customer_name, note].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      onClick={() => onOpen(record)}
      data-highlight={highlight || undefined}
      className={cn(
        'focus-ring flex w-full items-center gap-3 rounded-md px-2 py-3 text-left transition-colors duration-(--duration-slow) hover:bg-surface-2',
        highlight && 'bg-primary-subtle',
      )}
    >
      <span aria-hidden="true" className={cn('grid size-10 shrink-0 place-items-center rounded-md', polish ? 'bg-polish-subtle text-polish' : 'bg-wash-subtle text-wash')}>
        <Icon name={polish ? 'polish' : 'wash'} size="lg" />
      </span>
      <span className="grid grid-cols-1 min-w-0 flex-1 gap-0.5">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-subheading text-text">{record.plate}</span>
          {brand && <span className="shrink-0 text-caption text-text-secondary">{brand}</span>}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge tone={polish ? 'polish' : 'wash'}>{polish ? 'ขัดสี' : 'ล้างรถ'}</Badge>
          {unpaid && (
            <Badge tone="warning" icon="clock">
              ค้างชำระ
            </Badge>
          )}
          {record.seq_number != null && <span className="text-caption text-text-tertiary">#{record.seq_number}</span>}
        </span>
        {extra && <span className="truncate text-caption text-text-tertiary">{extra}</span>}
        {showAudit && auditLine(record) && <span className="truncate text-caption text-text-tertiary">{auditLine(record)}</span>}
        {below && <span className="truncate text-caption text-text-tertiary">{below}</span>}
      </span>
      <span className="grid grid-cols-1 shrink-0 justify-items-end gap-0.5">
        <span className={cn('text-subheading font-bold tabular-nums', unpaid ? 'text-unpaid' : 'text-text')}>{baht(record.price)}</span>
        <span className="text-caption text-text-tertiary tabular-nums">{showDate ? `${dateOf(record.created_at)} · ${timeOf(record.created_at)}` : timeOf(record.created_at)}</span>
      </span>
      <span className="sr-only">แตะเพื่อแก้ไข</span>
    </button>
  )
}

export function ExpenseRow({ expense, showAudit = false, onOpen }: { expense: Expense; showAudit?: boolean; onOpen: (e: Expense) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(expense)}
      className="focus-ring flex w-full items-center gap-3 rounded-md px-2 py-3 text-left hover:bg-surface-2"
    >
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-md bg-danger-subtle text-danger-text">
        <Icon name="receipt" size="lg" />
      </span>
      <span className="grid grid-cols-1 min-w-0 flex-1 gap-0.5">
        <span className="truncate text-subheading text-text">{expense.title}</span>
        {expense.note && <span className="truncate text-caption text-text-tertiary">{expense.note}</span>}
        {showAudit && auditLine(expense) && <span className="truncate text-caption text-text-tertiary">{auditLine(expense)}</span>}
      </span>
      <span className="grid grid-cols-1 shrink-0 justify-items-end gap-0.5">
        <span className="text-subheading font-bold text-expense tabular-nums">−{baht(expense.amount)}</span>
        <span className="text-caption text-text-tertiary tabular-nums">{timeOf(expense.created_at)}</span>
      </span>
      <span className="sr-only">รายจ่าย แตะเพื่อแก้ไข</span>
    </button>
  )
}
