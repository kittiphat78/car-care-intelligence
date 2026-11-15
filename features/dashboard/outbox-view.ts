import { ok, type Result } from '@/lib/result'
import { toBangkokDay } from '@/lib/time/bangkok'
import { withOutboxIncome, type OutboxItem } from '@/features/records/outbox'
import type { DashboardData } from './api'
import type { CustomerTimePeriod } from './logic'

// The dashboard with the rows still on their way (ADR-30): today's list, the unpaid list,
// today's totals, today's bar in the chart and the week / month cards all count them, so
// every figure moves together the moment "บันทึก" is pressed.

/** Income and expenses of today that the loaded figures do not count yet */
export interface PendingToday {
  washCount: number
  washAmount: number
  polishCount: number
  polishAmount: number
  paid: number
  unpaid: number
  expense: number
}

export const NO_PENDING: PendingToday = { washCount: 0, washAmount: 0, polishCount: 0, polishAmount: 0, paid: 0, unpaid: 0, expense: 0 }

const map = <T>(result: Result<T>, fn: (data: T) => T): Result<T> => (result.ok ? ok(fn(result.data)) : result)

/**
 * `startedAt`: when the figures were asked for (performance.now()). A row the database
 * confirmed before that is already in them; one confirmed after is not yet.
 */
export function pendingToday(data: DashboardData, outbox: readonly OutboxItem[], day: string, startedAt: number): PendingToday {
  const notCounted = (item: OutboxItem) => item.status !== 'sent' || (item.sentAt ?? 0) > startedAt
  // Today's list came with the totals: a row in it is counted (exact, by request id)
  const listed = data.todayRecords.ok ? new Set(data.todayRecords.data.map((r) => r.client_request_id)) : null
  const total = { ...NO_PENDING }
  for (const item of outbox) {
    if (toBangkokDay(item.row.created_at) !== day) continue
    if (item.table === 'expenses') {
      if (notCounted(item)) total.expense += item.row.amount
      continue
    }
    if (listed ? listed.has(item.requestId) : !notCounted(item)) continue
    const { price, type, payment_status } = item.row
    if (type === 'polish') {
      total.polishCount += 1
      total.polishAmount += price
    } else {
      total.washCount += 1
      total.washAmount += price
    }
    if (payment_status === 'unpaid') total.unpaid += price
    else total.paid += price
  }
  return total
}

export function dashboardWithOutbox(data: DashboardData, outbox: readonly OutboxItem[], day: string, startedAt: number): { data: DashboardData; pending: PendingToday } {
  if (outbox.length === 0) return { data, pending: NO_PENDING }
  const pending = pendingToday(data, outbox, day, startedAt)
  const income = pending.washAmount + pending.polishAmount
  return {
    pending,
    data: {
      ...data,
      todayRecords: map(data.todayRecords, (list) => withOutboxIncome(list, outbox, (row) => toBangkokDay(row.created_at) === day)),
      unpaidRecords: map(data.unpaidRecords, (list) => withOutboxIncome(list, outbox, (row) => row.payment_status === 'unpaid')),
      today: map(data.today, (t) => ({
        ...t,
        totalIncome: t.totalIncome + income,
        paidIncome: t.paidIncome + pending.paid,
        unpaidIncome: t.unpaidIncome + pending.unpaid,
        expense: t.expense + pending.expense,
        washCount: t.washCount + pending.washCount,
        polishCount: t.polishCount + pending.polishCount,
      })),
      series: map(data.series, (days) =>
        days.map((d) => (d.day === day ? { ...d, income: d.income + income, expense: d.expense + pending.expense } : d)),
      ),
    },
  }
}

/** A week or month card with today's rows still on their way */
export function periodWithPending(period: CustomerTimePeriod, pending: PendingToday): CustomerTimePeriod {
  if (pending === NO_PENDING) return period
  return {
    washCount: period.washCount + pending.washCount,
    washAmount: period.washAmount + pending.washAmount,
    polishCount: period.polishCount + pending.polishCount,
    polishAmount: period.polishAmount + pending.polishAmount,
    total: period.total + pending.washAmount + pending.polishAmount,
  }
}
