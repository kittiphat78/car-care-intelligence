import type { Expense, Record as AppRecord } from '@/types'
import { addDays, bangkokParts, formatBangkok, startOfBangkokDay, toBangkokDay } from '@/lib/time/bangkok'

// Pure rules of /history (screen-specifications.md §5, user-flows UF-HIST-01, UF-EXP-01)

export type HistoryTab = 'income' | 'expense'
export type JobFilter = 'all' | 'wash' | 'polish'

export const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'] as const

/** Filters as kept in the URL: ?y ?m (0 = whole year) ?tab ?q ?from ?to ?job */
export interface HistoryFilters {
  year: number
  month: number
  tab: HistoryTab
  q: string
  from: string
  to: string
  job: JobFilter
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

export function parseFilters(params: URLSearchParams, now: Date = new Date()): HistoryFilters {
  const today = bangkokParts(now)
  const year = Number(params.get('y'))
  const month = params.has('m') ? Number(params.get('m')) : today.month
  const job = params.get('job')
  return {
    year: Number.isInteger(year) && year >= 2000 && year <= today.year ? year : today.year,
    month: Number.isInteger(month) && month >= 0 && month <= 12 ? month : today.month,
    tab: params.get('tab') === 'expense' ? 'expense' : 'income',
    q: params.get('q') ?? '',
    from: DAY.test(params.get('from') ?? '') ? params.get('from')! : '',
    to: DAY.test(params.get('to') ?? '') ? params.get('to')! : '',
    job: job === 'wash' || job === 'polish' ? job : 'all',
  }
}

/** URL query for filters; defaults are left out so links stay short */
export function filtersQuery(f: HistoryFilters, now: Date = new Date()): string {
  const today = bangkokParts(now)
  const params = new URLSearchParams()
  if (f.year !== today.year) params.set('y', String(f.year))
  if (f.month !== today.month) params.set('m', String(f.month))
  if (f.tab !== 'income') params.set('tab', f.tab)
  if (f.q) params.set('q', f.q)
  if (f.from) params.set('from', f.from)
  if (f.to) params.set('to', f.to)
  if (f.tab === 'income' && f.job !== 'all') params.set('job', f.job)
  return params.toString()
}

/** Number of filters narrowing the list beyond the month (for "ตัวกรอง (2)") */
export function activeFilterCount(f: HistoryFilters): number {
  return [f.q, f.from, f.to, f.tab === 'income' && f.job !== 'all'].filter(Boolean).length
}

export const periodLabel = (f: Pick<HistoryFilters, 'year' | 'month'>) =>
  f.month === 0 ? `ปี ${f.year + 543}` : `${MONTHS_TH[f.month - 1]} ${f.year + 543}`

type Row = AppRecord | Expense

function inMonth<T extends Row>(rows: readonly T[], month: number): T[] {
  return month === 0 ? [...rows] : rows.filter((r) => bangkokParts(r.created_at).month === month)
}

/** Whole Bangkok days: from 00:00 of `from` to before 00:00 of the day after `to` (ER-10) */
function inRange(createdAt: string, from: string, to: string): boolean {
  const t = new Date(createdAt).getTime()
  if (from && t < startOfBangkokDay(from).getTime()) return false
  if (to && t >= startOfBangkokDay(addDays(to, 1)).getTime()) return false
  return true
}

const has = (text: string | null | undefined, q: string) => (text ?? '').toLowerCase().includes(q)

export function filterIncome(records: readonly AppRecord[], f: HistoryFilters): AppRecord[] {
  const q = f.q.trim().toLowerCase()
  return inMonth(records, f.month).filter(
    (r) =>
      (!q || has(r.plate, q) || has(r.customer_name, q) || has(r.services?.[2], q)) &&
      (f.job === 'all' || r.type === f.job) &&
      inRange(r.created_at, f.from, f.to),
  )
}

export function filterExpenses(expenses: readonly Expense[], f: HistoryFilters): Expense[] {
  const q = f.q.trim().toLowerCase()
  return inMonth(expenses, f.month).filter((e) => (!q || has(e.title, q) || has(e.note, q)) && inRange(e.created_at, f.from, f.to))
}

export interface IncomeSummary {
  total: number
  washCount: number
  washTotal: number
  polishCount: number
  polishTotal: number
  unpaidTotal: number
}

/** PeriodSummary for the month (or year) shown, before search filters */
export function incomeSummary(records: readonly AppRecord[], month: number): IncomeSummary {
  const rows = inMonth(records, month)
  const sum = (list: readonly AppRecord[]) => list.reduce((s, r) => s + r.price, 0)
  const wash = rows.filter((r) => r.type === 'wash')
  const polish = rows.filter((r) => r.type === 'polish')
  return {
    total: sum(rows),
    washCount: wash.length,
    washTotal: sum(wash),
    polishCount: polish.length,
    polishTotal: sum(polish),
    unpaidTotal: sum(rows.filter((r) => r.payment_status === 'unpaid')),
  }
}

export function expenseSummary(expenses: readonly Expense[], month: number): { total: number; count: number } {
  const rows = inMonth(expenses, month)
  return { total: rows.reduce((s, e) => s + e.amount, 0), count: rows.length }
}

export interface DayGroup<T> {
  day: string
  /** "14 ต.ค. 2569 · อังคาร" */
  label: string
  items: T[]
  total: number
  washCount: number
  polishCount: number
}

/** Rows by Bangkok day, newest day first, newest row first within a day */
export function groupByDay<T extends Row>(rows: readonly T[]): DayGroup<T>[] {
  const byDay = new Map<string, T[]>()
  for (const r of [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const day = toBangkokDay(r.created_at)
    byDay.set(day, [...(byDay.get(day) ?? []), r])
  }
  return [...byDay.entries()].map(([day, items]) => {
    const start = startOfBangkokDay(day)
    return {
      day,
      label: `${formatBangkok(start, { day: 'numeric', month: 'short', year: 'numeric' })} · ${formatBangkok(start, { weekday: 'long' })}`,
      items,
      total: items.reduce((s, r) => s + ('price' in r ? r.price : r.amount), 0),
      washCount: items.filter((r) => 'type' in r && r.type === 'wash').length,
      polishCount: items.filter((r) => 'type' in r && r.type === 'polish').length,
    }
  })
}

// ── Export (UF-EXP-01) ───────────────────────────────────────────────────────

export type ExportMode = 'bank' | 'internal'

export interface MonthRef {
  year: number
  month: number
}

const index = (m: MonthRef) => m.year * 12 + m.month

export function exportRangeError(from: MonthRef, to: MonthRef): string | null {
  return index(to) < index(from) ? 'เดือนสิ้นสุดต้องไม่ก่อนเดือนเริ่มต้น' : null
}

export function exportFileName(mode: ExportMode, from: MonthRef, to: MonthRef): string {
  const label = (m: MonthRef) => `${MONTHS_TH[m.month - 1]}${m.year + 543}`
  const range = index(from) === index(to) ? label(from) : `ตั้งแต่${label(from)}_ถึง${label(to)}`
  return mode === 'internal' ? `รายงานภายใน_${range}` : `สรุปรายรับและรายจ่าย_${range}`
}

/** Rows in the range, when the range is inside the year already loaded (for "พบ N รายการ") */
export function countInRange(records: readonly AppRecord[], expenses: readonly Expense[], loadedYear: number, from: MonthRef, to: MonthRef): number | null {
  if (from.year !== loadedYear || to.year !== loadedYear || exportRangeError(from, to)) return null
  const inside = (r: Row) => {
    const m = bangkokParts(r.created_at).month
    return m >= from.month && m <= to.month
  }
  return records.filter(inside).length + expenses.filter(inside).length
}
