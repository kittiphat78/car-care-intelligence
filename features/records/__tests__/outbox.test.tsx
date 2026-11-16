import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appError } from '@/lib/errors'

const api = vi.hoisted(() => ({ createIncome: vi.fn(), createExpense: vi.fn() }))
vi.mock('../api', () => api)

import {
  RETRY_MS,
  SENT_KEEP_MS,
  clearOutbox,
  outboxItems,
  outboxSnapshot,
  resend,
  restoreDraft,
  send,
  takeRestoredDraft,
  useReloadWhenSent,
  withOutboxExpenses,
  withOutboxIncome,
  type OutboxEntry,
} from '../outbox'
import { ExpenseRow, IncomeRow } from '../components/RecordRow'
import type { IncomeInsert } from '../api'
import type { Record as AppRecord } from '@/types'

const income = (requestId: string, over: Partial<IncomeInsert> = {}): OutboxEntry => ({
  table: 'records',
  row: {
    type: 'wash',
    plate: `ทดสอบ ${requestId}`,
    services: ['รถเก๋ง', '', ''],
    price: 150,
    created_at: '2026-10-15T03:00:00.000Z',
    created_by: 'user-1',
    created_by_email: 'owner@example.com',
    payment_method: 'cash',
    customer_name: '',
    payment_status: 'paid',
    job_status: 'done',
    client_request_id: requestId,
    ...over,
  },
})

/** Let the request's promise settle */
const settle = () => act(async () => {})

beforeEach(() => {
  api.createIncome.mockReset().mockResolvedValue({ ok: true, data: undefined })
  api.createExpense.mockReset().mockResolvedValue({ ok: true, data: undefined })
})

afterEach(() => {
  clearOutbox()
  vi.useRealTimers()
})

describe('outbox (ADR-30)', () => {
  it('shows a row as sending at once and as sent when the database has it', async () => {
    const onSent = vi.fn()
    send({ ...income('a'), draft: null, callbacks: { onSent } })
    expect(outboxItems().map((i) => i.status)).toEqual(['sending'])
    await settle()
    expect(outboxItems().map((i) => i.status)).toEqual(['sent'])
    expect(onSent).toHaveBeenCalledOnce()
  })

  it('a sent row leaves the outbox once the lists have had time to load the database copy', async () => {
    vi.useFakeTimers()
    send({ ...income('a'), draft: null })
    await settle()
    act(() => vi.advanceTimersByTime(SENT_KEEP_MS))
    expect(outboxItems()).toEqual([])
  })

  it('keeps a row the network lost as unsent, tells once, and sends it again with the same request id', async () => {
    api.createIncome.mockResolvedValue({ ok: false, error: appError('NETWORK') })
    const onUnsent = vi.fn()
    send({ ...income('a'), draft: null, callbacks: { onUnsent } })
    await settle()
    expect(outboxItems()[0].status).toBe('unsent')
    resend()
    await settle()
    expect(onUnsent).toHaveBeenCalledOnce()
    api.createIncome.mockResolvedValue({ ok: true, data: undefined })
    resend('a')
    await settle()
    expect(outboxItems()[0].status).toBe('sent')
    expect(api.createIncome.mock.calls.map((c) => c[0].client_request_id)).toEqual(['a', 'a', 'a'])
  })

  it('sends again by itself when the device is back online, and every RETRY_MS', async () => {
    vi.useFakeTimers()
    api.createIncome.mockResolvedValue({ ok: false, error: appError('TIMEOUT') })
    send({ ...income('a'), draft: null })
    await settle()
    window.dispatchEvent(new Event('online'))
    await settle()
    expect(api.createIncome).toHaveBeenCalledTimes(2)
    await act(async () => vi.advanceTimersByTime(RETRY_MS))
    expect(api.createIncome).toHaveBeenCalledTimes(3)
  })

  it('drops a row the database refuses and says why', async () => {
    api.createIncome.mockResolvedValue({ ok: false, error: appError('VALIDATION') })
    const onRefused = vi.fn()
    send({ ...income('a'), draft: null, callbacks: { onRefused } })
    await settle()
    expect(outboxItems()).toEqual([])
    expect(onRefused).toHaveBeenCalledWith(expect.objectContaining({ code: 'VALIDATION' }))
  })

  it('asks before the app closes only while something is waiting', async () => {
    const closing = () => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(closing()).toBe(false)
    api.createIncome.mockResolvedValue({ ok: false, error: appError('NETWORK') })
    send({ ...income('a'), draft: null })
    expect(closing()).toBe(true)
    await settle()
    expect(closing()).toBe(true)
    api.createIncome.mockResolvedValue({ ok: true, data: undefined })
    resend()
    await settle()
    expect(closing()).toBe(false)
  })

  it('tells mounted screens to reload when a row reaches the database', async () => {
    const reload = vi.fn()
    renderHook(() => useReloadWhenSent(reload))
    send({ ...income('a'), draft: null })
    expect(reload).not.toHaveBeenCalled()
    await settle()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('sign-out forgets what is waiting and a form to fill again', () => {
    send({ ...income('a'), draft: null })
    restoreDraft('records', { form: {}, day: '2026-10-15' })
    clearOutbox()
    expect(outboxItems()).toEqual([])
    expect(takeRestoredDraft('records')).toBeNull()
  })
})

describe('rows for the lists', () => {
  it('adds what belongs and is not in the list yet; the database copy wins (same request id)', async () => {
    api.createIncome.mockReturnValue(new Promise(() => {}))
    send({ ...income('a'), draft: null })
    send({ ...income('b', { payment_status: 'unpaid' }), draft: null })
    const loaded = [{ id: 'db-1', client_request_id: 'a' } as AppRecord]
    const shown = withOutboxIncome(loaded, outboxSnapshot(), (row) => row.payment_status === 'unpaid')
    expect(shown.map((r) => [r.id, r.outbox])).toEqual([
      ['db-1', undefined],
      ['outbox:b', 'sending'],
    ])
    expect(withOutboxIncome(loaded, outboxSnapshot(), () => true).map((r) => r.id)).toEqual(['db-1', 'outbox:b'])
    expect(withOutboxExpenses([], outboxSnapshot(), () => true)).toEqual([])
  })

  it('a row on its way shows "กำลังส่ง" and cannot be opened for editing yet', async () => {
    api.createIncome.mockReturnValue(new Promise(() => {}))
    send({ ...income('a'), draft: null })
    const onOpen = vi.fn()
    const [row] = withOutboxIncome([], outboxSnapshot(), () => true)
    render(<IncomeRow record={row} onOpen={onOpen} />)
    const button = screen.getByRole('button', { name: /ทดสอบ a.*กำลังส่ง.*แก้ได้เมื่อส่งเสร็จ/ })
    fireEvent.click(button)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('a tap on a row that is not sent sends it again', async () => {
    api.createIncome.mockResolvedValueOnce({ ok: false, error: appError('NETWORK') })
    send({ ...income('a'), draft: null })
    await settle()
    const [row] = withOutboxIncome([], outboxSnapshot(), () => true)
    render(<IncomeRow record={row} onOpen={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /ยังไม่ส่ง.*แตะเพื่อส่งอีกครั้ง/ }))
    await settle()
    expect(api.createIncome).toHaveBeenCalledTimes(2)
  })

  it('an expense on its way shows the label too', () => {
    api.createExpense.mockReturnValue(new Promise(() => {}))
    send({
      table: 'expenses',
      row: { title: 'ค่าน้ำยา', amount: 90, note: '', created_at: '2026-10-15T03:00:00.000Z', created_by: 'user-1', created_by_email: 'owner@example.com', client_request_id: 'e' },
      draft: null,
    })
    const [row] = withOutboxExpenses([], outboxSnapshot(), () => true)
    render(<ExpenseRow expense={row} onOpen={vi.fn()} />)
    expect(screen.getByRole('button', { name: /ค่าน้ำยา.*กำลังส่ง.*รายจ่าย แก้ได้เมื่อส่งเสร็จ/ })).toBeInTheDocument()
  })
})
