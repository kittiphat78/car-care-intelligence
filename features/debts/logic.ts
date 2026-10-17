import { DEFAULT_CUSTOMER_NAME_UNPAID, type Record as AppRecord } from '@/types'
import { bangkokToday, daysBetween, toBangkokDay } from '@/lib/time/bangkok'

// Pure rules of the debts page (screen-specifications.md §3, component-specifications.md §3.8)

/** At this age a debt is "เร่งด่วน" (D-05: two levels only, text + icon first) */
export const URGENT_DAYS = 14

/** URL value for the customer with no name (an empty `?settle=` would be ambiguous) */
export const UNNAMED_KEY = '-'

export interface DebtGroup {
  /** Stable id for the URL: the trimmed name, or UNNAMED_KEY */
  key: string
  /** Name shown on screen and on the bill */
  name: string
  /** Oldest first */
  items: AppRecord[]
  total: number
  /** Days since the oldest unpaid job (Bangkok days) */
  oldestDays: number
  urgent: boolean
}

export type DebtSort = 'amount' | 'age'

export function daysOwed(createdAt: string, today: string = bangkokToday()): number {
  return Math.max(0, daysBetween(toBangkokDay(createdAt), today))
}

/** One group per customer; unnamed jobs together under "ลูกค้าทั่วไป (ไม่ระบุชื่อ)" */
export function groupDebts(unpaid: readonly AppRecord[], today: string = bangkokToday()): DebtGroup[] {
  const byKey = new Map<string, AppRecord[]>()
  for (const r of unpaid) {
    const key = (r.customer_name ?? '').trim() || UNNAMED_KEY
    byKey.set(key, [...(byKey.get(key) ?? []), r])
  }
  return [...byKey.entries()].map(([key, rows]) => {
    const items = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
    const oldestDays = daysOwed(items[0].created_at, today)
    return {
      key,
      name: key === UNNAMED_KEY ? DEFAULT_CUSTOMER_NAME_UNPAID : key,
      items,
      total: items.reduce((sum, r) => sum + r.price, 0),
      oldestDays,
      urgent: oldestDays >= URGENT_DAYS,
    }
  })
}

/** "ยอดมากสุด" or "ค้างนานสุด"; ties fall back to the other order, then the name */
export function sortDebts(groups: readonly DebtGroup[], sort: DebtSort): DebtGroup[] {
  return [...groups].sort((a, b) =>
    sort === 'amount'
      ? b.total - a.total || b.oldestDays - a.oldestDays || a.name.localeCompare(b.name, 'th')
      : b.oldestDays - a.oldestDays || b.total - a.total || a.name.localeCompare(b.name, 'th'),
  )
}

export function debtTotals(groups: readonly DebtGroup[]) {
  return {
    total: groups.reduce((sum, g) => sum + g.total, 0),
    customers: groups.length,
    cars: groups.reduce((sum, g) => sum + g.items.length, 0),
  }
}

/** Plates for the settle dialog: up to `max`, then "และอีก N คัน" */
export function platePreview(items: readonly AppRecord[], max = 6): { plates: string[]; more: number } {
  return { plates: items.slice(0, max).map((r) => r.plate), more: Math.max(0, items.length - max) }
}

/** What the settle result means for the user (UF-DEBT-02) */
export function settleOutcome(asked: number, updated: number): 'all' | 'some' | 'none' {
  if (updated >= asked) return 'all'
  return updated > 0 ? 'some' : 'none'
}
