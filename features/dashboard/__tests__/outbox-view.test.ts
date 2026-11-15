import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/records/api', () => ({ createIncome: vi.fn(), createExpense: vi.fn() }))
import { ok } from '@/lib/result'
import type { OutboxItem } from '@/features/records/outbox'
import type { IncomeInsert } from '@/features/records/api'
import type { Record as AppRecord } from '@/types'
import type { DashboardData } from '../api'
import { NO_PENDING, dashboardWithOutbox, pendingToday, periodWithPending } from '../outbox-view'

const DAY = '2026-10-15'
const AT = '2026-10-15T03:00:00.000Z' // 10:00 Bangkok

const incomeItem = (requestId: string, over: Partial<IncomeInsert> = {}, status: OutboxItem['status'] = 'sending', sentAt?: number): OutboxItem =>
  ({
    table: 'records',
    requestId,
    status,
    sentAt,
    draft: null,
    callbacks: {},
    toldUnsent: false,
    row: {
      type: 'wash', plate: `ทดสอบ ${requestId}`, services: ['', '', ''], price: 150, created_at: AT, created_by: 'u', created_by_email: 'u@example.com',
      payment_method: 'cash', customer_name: '', payment_status: 'paid', job_status: 'done', client_request_id: requestId, ...over,
    },
  }) as OutboxItem

const expenseItem = (requestId: string, status: OutboxItem['status'] = 'sending', sentAt?: number): OutboxItem =>
  ({
    table: 'expenses', requestId, status, sentAt, draft: null, callbacks: {}, toldUnsent: false,
    row: { title: 'ค่าน้ำยา', amount: 90, note: '', created_at: AT, created_by: 'u', created_by_email: 'u@example.com', client_request_id: requestId },
  }) as OutboxItem

const data = (todayRecords: AppRecord[] = []): DashboardData => ({
  todayRecords: ok(todayRecords),
  today: ok({ totalIncome: 500, paidIncome: 400, unpaidIncome: 100, expense: 50, washCount: 3, polishCount: 1, yesterdayIncome: 0 }),
  series: ok([{ day: '2026-10-14', income: 300, expense: 0 }, { day: DAY, income: 500, expense: 50 }]),
  customers: ok([]),
  unpaidRecords: ok([]),
})

describe('dashboard with rows on their way (ADR-30)', () => {
  it('moves today’s totals, today’s bar and the lists together', () => {
    const items = [incomeItem('a'), incomeItem('b', { type: 'polish', price: 1200, payment_status: 'unpaid' }), expenseItem('e')]
    const { data: shown, pending } = dashboardWithOutbox(data(), items, DAY, 0)
    expect(pending).toEqual({ washCount: 1, washAmount: 150, polishCount: 1, polishAmount: 1200, paid: 150, unpaid: 1200, expense: 90 })
    expect(shown.today.ok && shown.today.data).toMatchObject({ totalIncome: 1850, paidIncome: 550, unpaidIncome: 1300, expense: 140, washCount: 4, polishCount: 2 })
    expect(shown.series.ok && shown.series.data).toEqual([{ day: '2026-10-14', income: 300, expense: 0 }, { day: DAY, income: 1850, expense: 140 }])
    expect(shown.todayRecords.ok && shown.todayRecords.data.map((r) => r.id)).toEqual(['outbox:a', 'outbox:b'])
    expect(shown.unpaidRecords.ok && shown.unpaidRecords.data.map((r) => r.id)).toEqual(['outbox:b'])
  })

  it('does not count a row twice once the loaded figures have it', () => {
    const loaded = data([{ id: 'db-a', client_request_id: 'a' } as AppRecord])
    // Income: today's list came with the totals, so a listed row is counted already
    expect(pendingToday(loaded, [incomeItem('a', {}, 'sent', 5)], DAY, 10)).toEqual(NO_PENDING)
    // Expenses have no list here: confirmed before the figures were asked for = counted
    expect(pendingToday(loaded, [expenseItem('e', 'sent', 5)], DAY, 10).expense).toBe(0)
    expect(pendingToday(loaded, [expenseItem('e', 'sent', 15)], DAY, 10).expense).toBe(90)
  })

  it('leaves rows of another day out of today’s figures', () => {
    const items = [incomeItem('old', { created_at: '2026-10-10T03:00:00.000Z', payment_status: 'unpaid' })]
    const { data: shown, pending } = dashboardWithOutbox(data(), items, DAY, 0)
    expect(pending).toEqual(NO_PENDING)
    expect(shown.todayRecords.ok && shown.todayRecords.data).toEqual([])
    // …but it is owed
    expect(shown.unpaidRecords.ok && shown.unpaidRecords.data.map((r) => r.id)).toEqual(['outbox:old'])
  })

  it('adds today’s rows on their way to the week and month cards', () => {
    const period = { washCount: 10, washAmount: 1500, polishCount: 1, polishAmount: 1200, total: 2700 }
    const pending = { ...NO_PENDING, washCount: 1, washAmount: 150 }
    expect(periodWithPending(period, pending)).toEqual({ washCount: 11, washAmount: 1650, polishCount: 1, polishAmount: 1200, total: 2850 })
    expect(periodWithPending(period, NO_PENDING)).toBe(period)
  })
})
