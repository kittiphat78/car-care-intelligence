'use client'

import { useId, useState } from 'react'
import { cn } from '@/lib/cn'
import { formatBangkok } from '@/lib/time/bangkok'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { Record as AppRecord } from '@/types'
import { daysOwed, type DebtGroup } from '../logic'

// component-specifications.md §3.8

const FIRST_ROWS = 5
const baht = (n: number) => `฿${n.toLocaleString('en-US')}`

function DebtRow({ record, today, onOpen }: { record: AppRecord; today: string; onOpen: (r: AppRecord) => void }) {
  const days = daysOwed(record.created_at, today)
  const note = record.services?.[2]
  const date = formatBangkok(record.created_at, { day: 'numeric', month: 'short' })
  return (
    <button
      type="button"
      onClick={() => onOpen(record)}
      className="focus-ring flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-surface-2"
    >
      <span className="grid grid-cols-1 min-w-0 flex-1">
        <span className="truncate text-body font-semibold text-text">{record.plate}</span>
        <span className="truncate text-caption text-text-tertiary">
          {date} · <span className="sr-only">ค้าง </span>{days} วัน{note ? ` · ${note}` : ''}
        </span>
      </span>
      <span className="shrink-0 text-body font-bold text-unpaid tabular-nums">{baht(record.price)}</span>
      <span className="sr-only">แตะเพื่อแก้ไข</span>
    </button>
  )
}

export interface DebtCustomerCardProps {
  group: DebtGroup
  today: string
  online: boolean
  billing: boolean
  onBill: (g: DebtGroup) => void
  onSettle: (g: DebtGroup) => void
  onOpenRow: (r: AppRecord) => void
}

export function DebtCustomerCard({ group, today, online, billing, onBill, onSettle, onOpenRow }: DebtCustomerCardProps) {
  const id = useId()
  const [expanded, setExpanded] = useState(false)
  const rows = expanded ? group.items : group.items.slice(0, FIRST_ROWS)
  const hidden = group.items.length - FIRST_ROWS

  return (
    <Card as="article" aria-labelledby={id} className="grid grid-cols-1 content-start gap-3">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={id} className="truncate text-heading text-text">
            {group.name}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-caption text-text-secondary">{group.items.length} คัน</span>
            <Badge tone={group.urgent ? 'danger' : 'warning'} icon="clock">
              {group.urgent ? 'เร่งด่วน · ' : ''}ค้างนานสุด {group.oldestDays} วัน
            </Badge>
          </div>
        </div>
        <p className="shrink-0 text-title text-unpaid tabular-nums">{baht(group.total)}</p>
      </header>

      <ul className="-mx-2 grid grid-cols-1 divide-y divide-border border-y border-border">
        {rows.map((r) => (
          <li key={r.id}>
            <DebtRow record={r} today={today} onOpen={onOpenRow} />
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="justify-self-start">
          {expanded ? 'แสดงน้อยลง' : `ดูอีก ${hidden} คัน`}
        </Button>
      )}

      <div className={cn('grid grid-cols-2 gap-3')}>
        <Button
          variant="secondary"
          leadingIcon="file"
          isLoading={billing}
          loadingText="กำลังสร้าง…"
          onClick={() => onBill(group)}
          aria-label={`สร้างบิล ${group.name}`}
        >
          สร้างบิล
        </Button>
        <Button
          variant="success"
          leadingIcon="check-circle"
          disabled={!online}
          onClick={() => onSettle(group)}
          aria-label={`เคลียร์ยอด ${group.name}`}
          aria-describedby={online ? undefined : `${id}-offline`}
        >
          เคลียร์ยอด
        </Button>
      </div>
      {!online && (
        <p id={`${id}-offline`} className="text-caption text-text-tertiary">
          เคลียร์ยอดต้องเชื่อมต่ออินเทอร์เน็ต
        </p>
      )}
    </Card>
  )
}
