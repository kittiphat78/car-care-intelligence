import { ok, type Result } from '@/lib/result'
import { toBangkokDay } from '@/lib/time/bangkok'
import { withOutboxIncome, type OutboxSnapshot } from '@/features/records/outbox'
import type { Record as AppRecord } from '@/types'
import type { DashboardData } from './api'
import type { CustomerTimePeriod } from './logic'

// The dashboard with the writes still on their way (ADR-30): today's list, the unpaid
// list, today's totals, today's bar in the chart and the week / month cards all count
// them, so every figure moves together the moment a save, edit, delete or settle is made.

/** How today's figures differ from the loaded ones until the database's copy arrives (may be negative) */
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

type IncomeLike = Pick<AppRecord, 'type' | 'price' | 'payment_status' | 'created_at'>

/**
 * `startedAt`: when the figures were asked for (performance.now()). A write the database
 * confirmed before that is already in them; one confirmed after is not yet. For income,
 * today's list (loaded with the totals) says exactly which version the totals counted.
 */
export function pendingToday(data: DashboardData, outbox: OutboxSnapshot, day: string, startedAt: number): PendingToday {
  const notCounted = (w: { status: string; sentAt?: number }) => w.status !== 'sent' || (w.sentAt ?? 0) > startedAt
  const listed = data.todayRecords.ok ? new Map(data.todayRecords.data.map((r) => [r.id, r])) : null
  const listedRequests = data.todayRecords.ok ? new Set(data.todayRecords.data.map((r) => r.client_request_id)) : null
  const total = { ...NO_PENDING }
  const isToday = (at: string) => toBangkokDay(at) === day

  const income = (row: IncomeLike, sign: 1 | -1) => {
    if (!isToday(row.created_at)) return
    if (row.type === 'polish') {
      total.polishCount += sign
      total.polishAmount += sign * row.price
    } else {
      total.washCount += sign
      total.washAmount += sign * row.price
    }
    if (row.payment_status === 'unpaid') total.unpaid += sign * row.price
    else total.paid += sign * row.price
  }
  const expense = (row: { amount: number; created_at: string }, sign: 1 | -1) => {
    if (isToday(row.created_at)) total.expense += sign * row.amount
  }

  for (const item of outbox.items) {
    if (item.table === 'expenses') {
      if (notCounted(item)) expense(item.row, 1)
    } else if (listedRequests ? !listedRequests.has(item.requestId) : notCounted(item)) income(item.row, 1)
  }

  for (const c of outbox.changes) {
    if (c.table === 'expenses') {
      // No expense list here: the confirmation time tells
      if (!notCounted(c)) continue
      expense(c.before, -1)
      if (c.kind === 'update') expense(c.after, 1)
      continue
    }
    if (c.kind === 'settle') {
      for (const b of c.before) {
        const now = listed?.get(b.id)
        if (listed ? now?.payment_status === 'unpaid' : notCounted(c)) {
          income(b, -1)
          income({ ...b, payment_status: 'paid' }, 1)
        }
      }
      continue
    }
    const now = listed?.get(c.before.id)
    // The totals still count the version that was changed (a row of another day is not in the list)
    const stillOld = listed ? (now ? (now.updated_at ?? null) === (c.before.updated_at ?? null) : !isToday(c.before.created_at)) : notCounted(c)
    if (!stillOld) continue
    income(c.before, -1)
    if (c.kind === 'update') income(c.after, 1)
  }
  return total
}

const isNone = (p: PendingToday) => Object.values(p).every((v) => v === 0)

export function dashboardWithOutbox(data: DashboardData, outbox: OutboxSnapshot, day: string, startedAt: number): { data: DashboardData; pending: PendingToday } {
  if (outbox.items.length === 0 && outbox.changes.length === 0) return { data, pending: NO_PENDING }
  const found = pendingToday(data, outbox, day, startedAt)
  const pending = isNone(found) ? NO_PENDING : found
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

/** A week or month card with today's writes still on their way */
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
