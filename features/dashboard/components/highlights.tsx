'use client'

import { useId } from 'react'
import { AppLink } from '@/components/ui/AppLink'
import { Card } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'
import { OnlineLabel, STATUS_PILL } from '@/components/patterns/StatusBar'
import { todayShares, type CustomerTimePeriod, type DashboardStats, type DebtSummary } from '../logic'
import { baht } from './cards'

// Glass home (ADR-28, docs/design-system/car-care-glass/APP.md §9). Every figure comes from
// data the dashboard already loads; nothing here asks the server for more.
// Values: null while loading (a placeholder of the same size) · undefined when that part
// failed to load (shown as "—"; the card it comes from shows the error and the retry).

const TILES = {
  blue: 'bg-primary-subtle text-link',
  violet: 'bg-polish-subtle text-polish',
  sky: 'bg-wash-subtle text-wash',
  amber: 'bg-warning-subtle text-warning-text',
} as const

function Tile({ tone, icon, className }: { tone: keyof typeof TILES; icon: IconName; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('grid size-11 shrink-0 place-items-center rounded-md', TILES[tone], className)}>
      <Icon name={icon} />
    </span>
  )
}

// ── Status pills: connection, customers this month, customers who owe ──────────

export function StatusPills({ customersMonth, debt }: { customersMonth: number | null | undefined; debt: DebtSummary | null | undefined }) {
  return (
    <ul aria-label="สถานะ" className="flex flex-wrap gap-2">
      <li className={STATUS_PILL}>
        <OnlineLabel />
      </li>
      {/* The other two hold their place while loading, so the row never changes height */}
      <li className={STATUS_PILL}>
        <Icon name="users" size="sm" className="text-link" />
        {customersMonth === null ? <Skeleton className="h-4 w-28" /> : `ลูกค้าเดือนนี้ ${customersMonth ?? '—'} ราย`}
      </li>
      <li className={STATUS_PILL}>
        <Icon name="clock" size="sm" className="text-warning-text" />
        {debt === null ? <Skeleton className="h-4 w-24" /> : `ค้างชำระ ${debt?.customers ?? '—'} ราย`}
      </li>
    </ul>
  )
}

// ── Shortcuts: four pages, each with its icon in a coloured tile ───────────────

export function QuickLinks({ debt, className }: { debt: DebtSummary | null; className?: string }) {
  const links: Array<{ href: string; title: string; note: React.ReactNode; tone: keyof typeof TILES; icon: IconName }> = [
    { href: '/add', title: 'เพิ่มรายการ', note: 'บันทึกรถคันใหม่', tone: 'blue', icon: 'plus' },
    { href: '/history', title: 'ประวัติ', note: 'ค้นและแก้ไข', tone: 'violet', icon: 'history' },
    { href: '/customers', title: 'ลูกค้า', note: 'โทรหาได้ทันที', tone: 'sky', icon: 'users' },
    {
      href: '/debts',
      title: 'ค้างชำระ',
      note: debt === null ? <Skeleton className="h-4 w-20" /> : debt.total > 0 ? `${baht(debt.total)} · ${debt.customers} ราย` : 'ไม่มียอดค้าง',
      tone: 'amber',
      icon: 'clock',
    },
  ]
  return (
    <nav aria-label="ทางลัด" className={className}>
      <ul className="grid grid-cols-2 gap-3">
        {links.map((l) => (
          <li key={l.href} className="min-w-0">
            <AppLink href={l.href} className="focus-ring block h-full rounded-lg press">
              <Card interactive className="grid h-full grid-cols-1 content-start gap-2 p-3.5!">
                <Tile tone={l.tone} icon={l.icon} />
                <span className="grid min-w-0 grid-cols-1">
                  <span className="text-body font-semibold break-words text-text">{l.title}</span>
                  <span className="text-caption break-words text-text-secondary tabular-nums">{l.note}</span>
                </span>
              </Card>
            </AppLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ── Income today / this week / this month, laid out like a price table ─────────

type Period = { total: number; washCount: number; polishCount: number }

export function PeriodCards({ today, week, month }: { today: Period | null | undefined; week: CustomerTimePeriod | null | undefined; month: CustomerTimePeriod | null | undefined }) {
  const id = useId()
  const items: Array<{ key: string; label: string; data: Period | null | undefined; since?: string }> = [
    { key: 'today', label: 'รายรับวันนี้', data: today },
    { key: 'week', label: 'รายรับสัปดาห์นี้', data: week, since: 'ตั้งแต่วันจันทร์' },
    { key: 'month', label: 'รายรับเดือนนี้', data: month },
  ]
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="sr-only">
        รายรับตามช่วงเวลา
      </h2>
      {/* Three across from a 360px phone (each ~6.5rem); with large text or on a 280px fold they wrap */}
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,6.5rem),1fr))] gap-2 md:gap-3">
        {items.map((it) => (
          // All three alike (owner, 2026-11-15): none of the periods matters more than the others
          <li key={it.key} className="grid min-w-0 grid-cols-1 content-start gap-1 rounded-lg border glass p-3 md:p-3.5 lg:p-5">
            {/* From md up every heading keeps two lines (the week's second line says since when),
                so the three amounts line up. A subgrid did the same but cost ~+10% TBT on home (G-08). */}
            <span className="grid grid-cols-1 content-start text-caption md:min-h-[2lh]">
              <span className="text-caption break-words text-text-secondary">{it.label}</span>
              {/* Shown from md up; on narrow phones only screen readers get it, as before */}
              {it.since && <span className="text-caption break-words text-text-tertiary max-md:sr-only">{it.since}</span>}
            </span>
            {/* Placeholder and figures take the same lines (amount: one line; note: two lines
                on phones, where it can wrap), so nothing moves when the numbers arrive */}
            {it.data === null ? (
              <SkeletonGroup className="grid grid-cols-1 gap-1">
                <div className="text-body md:text-body-lg lg:text-title">
                  <Skeleton className="h-[1lh] w-20" />
                </div>
                <div className="min-h-[2lh] text-caption lg:min-h-[1lh]">
                  <Skeleton className="h-[1lh] w-16" />
                </div>
              </SkeletonGroup>
            ) : it.data === undefined ? (
              <>
                <span className="text-body font-bold text-text-secondary md:text-body-lg lg:text-title">—</span>
                <span className="min-h-[2lh] text-caption text-text-secondary lg:min-h-[1lh]">โหลดไม่สำเร็จ</span>
              </>
            ) : (
              <>
                <span className="text-body font-bold whitespace-nowrap text-text tabular-nums md:text-body-lg lg:text-title">{baht(it.data.total)}</span>
                <span className="min-h-[2lh] text-caption text-text-secondary tabular-nums lg:min-h-[1lh]">
                  ล้าง {it.data.washCount} · ขัด {it.data.polishCount}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

// ── Today's jobs: wash/polish donut and the share already received ─────────────

const R = 34
const C = 2 * Math.PI * R

export function TodaySplit({ stats }: { stats: DashboardStats | null }) {
  const id = useId()
  const shares = stats ? todayShares(stats) : null
  const jobs = stats ? stats.washCount + stats.polishCount : 0
  return (
    <Card as="section" aria-labelledby={id} className="grid grid-cols-1 gap-4">
      <h2 id={id} className="text-heading text-text">
        งานวันนี้
      </h2>
      {!stats || !shares ? (
        <SkeletonGroup className="grid grid-cols-1 gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-24 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-28" />
            </div>
          </div>
          <Skeleton className="h-12 w-full" />
        </SkeletonGroup>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4">
            {/* The numbers beside it say the same in words */}
            <svg aria-hidden="true" viewBox="0 0 90 90" className="size-24 shrink-0 -rotate-90">
              <circle cx="45" cy="45" r={R} fill="none" strokeWidth="12" className={jobs ? 'stroke-polish' : 'stroke-border'} />
              {jobs > 0 && <circle cx="45" cy="45" r={R} fill="none" strokeWidth="12" className="stroke-wash" strokeDasharray={`${(C * shares.washPct) / 100} ${C}`} />}
            </svg>
            <ul className="grid min-w-0 flex-1 grid-cols-1 gap-2">
              <li className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-6 items-center rounded-full bg-wash-subtle px-2.5 text-caption font-medium text-wash">ล้างรถ</span>
                <span className="text-body font-bold text-text tabular-nums">
                  {stats.washCount} คัน{jobs > 0 && ` · ${shares.washPct}%`}
                </span>
              </li>
              <li className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-6 items-center rounded-full bg-polish-subtle px-2.5 text-caption font-medium text-polish">ขัดสี</span>
                <span className="text-body font-bold text-text tabular-nums">
                  {stats.polishCount} คัน{jobs > 0 && ` · ${100 - shares.washPct}%`}
                </span>
              </li>
            </ul>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            <p className="flex flex-wrap justify-between gap-x-3 text-caption text-text-secondary">
              <span>รับเงินแล้ว</span>
              <span className="font-semibold text-text tabular-nums">
                {shares.paidPct}% · {baht(stats.todayPaid)}
              </span>
            </p>
            <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-linear-90 from-gradient-from to-gradient-to" style={{ width: `${shares.paidPct}%` }} />
            </div>
            <p className="mt-1 flex flex-wrap justify-between gap-x-3 text-caption text-text-secondary">
              <span>ค้างชำระวันนี้</span>
              <span className="font-semibold text-unpaid tabular-nums">
                {stats.todayTotalIncome > 0 ? 100 - shares.paidPct : 0}% · {baht(stats.todayUnpaid)}
              </span>
            </p>
            <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-unpaid" style={{ width: `${stats.todayTotalIncome > 0 ? 100 - shares.paidPct : 0}%` }} />
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
