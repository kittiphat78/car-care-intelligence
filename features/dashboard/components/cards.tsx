'use client'

import Link from 'next/link'
import { useId, useState } from 'react'
import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/Card'
import { ChoiceGroup } from '@/components/ui/ChoiceGroup'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Skeleton, SkeletonGroup, SkeletonText } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/patterns/EmptyState'
import { topCustomers, type CustomerBreakdownItem, type CustomerPeriodKey, type DashboardStats, type DebtSummary } from '../logic'

// Dashboard cards (component-specifications.md §3.1–3.3, §3.10)

export const baht = (n: number) => `฿${Math.abs(n).toLocaleString('en-US')}`

/** Card heading row: h2 + optional control on the right */
export function CardHeader({ id, title, children }: { id: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="text-heading text-text">
        {title}
      </h2>
      {children}
    </div>
  )
}

// ── MoneyHero + StatItem ─────────────────────────────────────────────────────

function StatItem({
  label,
  value,
  unit,
  icon,
  tone,
  trend,
  reserveTrend = false,
}: {
  label: string
  value: string
  unit?: string
  icon: IconName
  tone: string
  trend?: { up: boolean; pct: number }
  /** Keep the trend line's height even without a trend, so the card's height never depends on the data */
  reserveTrend?: boolean
}) {
  return (
    <div className="grid grid-cols-1 min-w-0 gap-0.5">
      <p className="flex items-center gap-1.5 text-caption font-medium text-text-secondary">
        <Icon name={icon} className={tone} />
        {label}
      </p>
      <p className="text-heading font-bold text-text tabular-nums">
        {value}
        {unit && <span className="ml-1 text-caption font-normal text-text-secondary">{unit}</span>}
      </p>
      {trend && (
        <p className={cn('flex items-center gap-0.5 text-caption font-semibold', trend.up ? 'text-success-text' : 'text-danger-text')}>
          <Icon name={trend.up ? 'arrow-up' : 'arrow-down'} size="sm" />
          {trend.pct}% <span className="font-normal text-text-tertiary">จากเมื่อวาน</span>
        </p>
      )}
      {!trend && reserveTrend && (
        <p aria-hidden="true" className="invisible text-caption">
          –
        </p>
      )}
    </div>
  )
}

export function MoneyHero({ stats, error, onRetry }: { stats: DashboardStats | null; error?: string; onRetry: () => void }) {
  const id = useId()
  const negative = (stats?.netProfit ?? 0) < 0
  return (
    <Card as="section" aria-labelledby={id} className="grid grid-cols-1 gap-4">
      <div>
        <h2 id={id} className="text-label text-text-secondary">
          เงินสดสุทธิวันนี้
        </h2>
        {error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : !stats ? (
          // Same lines as the loaded card, each bar one line of the same text style,
          // so nothing below moves when the numbers arrive (Step 09 O-10)
          <SkeletonGroup>
            <div className="text-display lg:text-display-lg">
              <Skeleton className="h-[1lh] w-48" />
            </div>
            <div className="text-caption">
              <Skeleton className="h-[1lh] w-40" />
            </div>
          </SkeletonGroup>
        ) : (
          <>
            <p className={cn('text-display tabular-nums lg:text-display-lg', negative ? 'text-expense' : 'text-text')}>
              {negative && <span className="sr-only">ติดลบ </span>}
              {negative ? '−' : ''}
              {baht(stats.netProfit)}
            </p>
            <p className="text-caption text-text-tertiary">รับเงินแล้ว − รายจ่าย</p>
          </>
        )}
      </div>
      {!stats && !error && (
        <div aria-hidden="true" className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 md:grid-cols-4">
          {[true, false, false, false].map((withTrend, i) => (
            <div key={i} className="grid grid-cols-1 gap-0.5">
              <div className="text-caption">
                <Skeleton className="h-[1lh] w-20" />
              </div>
              <div className="text-heading">
                <Skeleton className="h-[1lh] w-16" />
              </div>
              {/* Income usually shows the change against yesterday */}
              {withTrend && (
                <div className="text-caption">
                  <Skeleton className="h-[1lh] w-24" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {stats && !error && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 md:grid-cols-4">
          <StatItem
            label="รายรับรวม"
            value={baht(stats.todayTotalIncome)}
            icon="arrow-down"
            tone="text-income"
            trend={stats.diffPct !== 0 ? { up: stats.isUp, pct: Math.abs(stats.diffPct) } : undefined}
            reserveTrend
          />
          <StatItem label="รายจ่าย" value={baht(stats.todayExpense)} icon="receipt" tone="text-expense" />
          <StatItem label="ล้างรถ" value={String(stats.washCount)} unit="คัน" icon="wash" tone="text-wash" />
          <StatItem label="ขัดสี" value={String(stats.polishCount)} unit="คัน" icon="polish" tone="text-polish" />
        </div>
      )}
    </Card>
  )
}

// ── DebtSummaryCard ──────────────────────────────────────────────────────────

export function DebtSummaryCard({ debt }: { debt: DebtSummary }) {
  // Hidden when nothing is owed (the data loaded fine, so 0 is real)
  if (debt.total <= 0) return null
  return (
    <Link href="/debts" className="focus-ring block rounded-lg">
      <Card tone="warning" interactive className="grid grid-cols-1 gap-1">
        <p className="flex items-center gap-2 text-label text-warning-text">
          <Icon name="clock" />
          ค้างชำระ
        </p>
        <p className="text-title-lg text-unpaid tabular-nums">{baht(debt.total)}</p>
        <p className="flex items-center justify-between text-caption text-text-secondary">
          <span>
            {debt.customers} ราย · {debt.cars} คัน
          </span>
          <span className="flex items-center font-semibold text-link">
            ดูทั้งหมด
            <Icon name="chevron-right" size="sm" />
          </span>
        </p>
      </Card>
    </Link>
  )
}

/**
 * Holds the debt card's place while loading, line for line (each bar is one line of the
 * same text style), so the cards below do not jump down when it arrives (Step 09 O-09).
 * Most days there is something owed; when there is not, the card goes away after loading.
 */
export function DebtSummarySkeleton() {
  return (
    <SkeletonGroup label="กำลังโหลดยอดค้างชำระ…">
      <Card tone="warning" className="grid grid-cols-1 gap-1">
        <div className="text-label">
          <Skeleton className="h-[1lh] w-24" />
        </div>
        <div className="text-title-lg">
          <Skeleton className="h-[1lh] w-36" />
        </div>
        <div className="text-caption">
          <Skeleton className="h-[1lh] w-32" />
        </div>
      </Card>
    </SkeletonGroup>
  )
}

// ── CustomerBreakdownCard ────────────────────────────────────────────────────

const PERIODS: ReadonlyArray<{ value: CustomerPeriodKey; label: string }> = [
  { value: 'week', label: 'สัปดาห์' },
  { value: 'month', label: 'เดือน' },
  { value: 'year', label: 'ปี' },
]

export function CustomerBreakdownCard({ items, error, onRetry }: { items: CustomerBreakdownItem[] | null; error?: string; onRetry: () => void }) {
  const id = useId()
  const [period, setPeriod] = useState<CustomerPeriodKey>('month')
  const rows = items ? topCustomers(items, period) : []
  return (
    <Card as="section" aria-labelledby={id}>
      <CardHeader id={id} title="รายรับตามลูกค้า">
        <ChoiceGroup label="ช่วงเวลา" value={period} onChange={(v) => v && setPeriod(v)} options={PERIODS} />
      </CardHeader>
      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : !items ? (
        <SkeletonGroup>
          <SkeletonText lines={4} />
        </SkeletonGroup>
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-body text-text-secondary">ยังไม่มีรายรับในช่วงนี้</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4">
          {rows.map((r) => (
            <li key={r.name} className="grid grid-cols-1 gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-body font-semibold text-text">{r.name}</span>
                <span className="shrink-0 text-body font-bold text-text tabular-nums">{baht(r.total)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${r.percent}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right text-caption text-text-secondary tabular-nums">{r.percent}%</span>
              </div>
              <p className="text-caption text-text-tertiary">
                ล้าง {r.washCount} คัน {baht(r.washAmount)} · ขัดสี {r.polishCount} คัน {baht(r.polishAmount)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
