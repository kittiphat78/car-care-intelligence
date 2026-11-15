'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { toAppError, type AppError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'
import type { Expense, Record as AppRecord } from '@/types'
import { createExpense, createIncome, type ExpenseInsert, type IncomeInsert } from './api'

// New income and expenses on their way to the database (speed work 3d, ADR-30). "บันทึก"
// puts the row here and the app moves on at once: every list shows it with a "กำลังส่ง"
// label until the database has it. If the network fails it stays as "ยังไม่ส่ง" and is
// sent again by itself (back online, or every RETRY_MS); the same client_request_id
// means a second send never makes a second row (ADR-07). If the database refuses it for
// another reason, it leaves the lists and the person is offered the form again.
//
// Memory of this tab only (ADR-26): closing the app loses what is not sent yet, so the
// browser asks first while anything is waiting. Sign-out clears it.

export type OutboxStatus = 'sending' | 'unsent' | 'sent'

export interface OutboxCallbacks {
  /** The database has it */
  onSent?: () => void
  /** The first time the network fails (later automatic tries stay quiet) */
  onUnsent?: () => void
  /** Refused for another reason; the row has left the lists */
  onRefused?: (error: AppError) => void
}

export type OutboxEntry = { table: 'records'; row: IncomeInsert } | { table: 'expenses'; row: ExpenseInsert }

export type OutboxItem = OutboxEntry & {
  requestId: string
  status: OutboxStatus
  /** The form as it was, to fill it again if the database refuses the row */
  draft: unknown
  callbacks: OutboxCallbacks
  /** When the database confirmed it (performance.now()) */
  sentAt?: number
  toldUnsent: boolean
}

/** A sent row stays in the lists this long at most, until a reload shows the database's copy */
export const SENT_KEEP_MS = 15_000
/** How often what is not sent is tried again while the device says it is online */
export const RETRY_MS = 15_000

const EMPTY: readonly OutboxItem[] = []
let items: readonly OutboxItem[] = EMPTY
const listeners = new Set<() => void>()
const sentListeners = new Set<() => void>()

function commit(next: readonly OutboxItem[]) {
  items = next
  syncGuards()
  for (const listener of listeners) listener()
}

const find = (requestId: string) => items.find((i) => i.requestId === requestId)
const update = (requestId: string, patch: Partial<OutboxItem>) =>
  commit(items.map((i) => (i.requestId === requestId ? ({ ...i, ...patch } as OutboxItem) : i)))
const drop = (requestId: string) => {
  if (find(requestId)) commit(items.filter((i) => i.requestId !== requestId))
}

/** A failure worth trying again: the request may not have reached the database */
const isNetwork = (error: AppError) => error.code === 'NETWORK' || error.code === 'TIMEOUT'

/** Put a new row on its way. The lists show it at once (useOutbox). */
export function send(entry: OutboxEntry & { draft: unknown; callbacks?: OutboxCallbacks }): void {
  const requestId = entry.row.client_request_id
  const item = { ...entry, requestId, status: 'sending', callbacks: entry.callbacks ?? {}, toldUnsent: false } as OutboxItem
  commit([...items.filter((i) => i.requestId !== requestId), item])
  void attempt(requestId)
}

async function attempt(requestId: string): Promise<void> {
  const item = find(requestId)
  if (!item) return
  if (item.status !== 'sending') update(requestId, { status: 'sending' })
  let result: Result<void>
  try {
    result = item.table === 'records' ? await createIncome(item.row) : await createExpense(item.row)
  } catch (e) {
    result = err(toAppError(e))
  }
  // Signed out meanwhile: nothing more to show
  if (!find(requestId)) return
  if (result.ok) {
    update(requestId, { status: 'sent', sentAt: performance.now() })
    item.callbacks.onSent?.()
    for (const listener of sentListeners) listener()
    setTimeout(() => drop(requestId), SENT_KEEP_MS)
    return
  }
  if (isNetwork(result.error)) {
    update(requestId, { status: 'unsent', toldUnsent: true })
    if (!item.toldUnsent) item.callbacks.onUnsent?.()
    return
  }
  drop(requestId)
  item.callbacks.onRefused?.(result.error)
}

/** Send again what is not sent yet ("ส่งอีกครั้ง", back online, a tap on the row) */
export function resend(requestId?: string): void {
  for (const item of items) if (item.status === 'unsent' && (!requestId || item.requestId === requestId)) void attempt(item.requestId)
}

/** Sign-out: the next person on a shared phone must not see these */
export function clearOutbox(): void {
  restore = null
  commit(EMPTY)
}

export function outboxItems(): readonly OutboxItem[] {
  return items
}

// ── While something is waiting: ask before the app closes, retry when back online ──

let guarded = false
let retryTimer: ReturnType<typeof setInterval> | undefined

function warnBeforeClosing(e: BeforeUnloadEvent) {
  e.preventDefault()
  // Older browsers show their own "leave this page?" only with returnValue set
  e.returnValue = ''
}
const retryAll = () => resend()

function syncGuards() {
  if (typeof window === 'undefined') return
  const waiting = items.some((i) => i.status !== 'sent')
  if (waiting && !guarded) {
    window.addEventListener('beforeunload', warnBeforeClosing)
    window.addEventListener('online', retryAll)
  } else if (!waiting && guarded) {
    window.removeEventListener('beforeunload', warnBeforeClosing)
    window.removeEventListener('online', retryAll)
  }
  guarded = waiting
  const unsent = items.some((i) => i.status === 'unsent')
  if (unsent && retryTimer === undefined) {
    retryTimer = setInterval(() => {
      if (navigator.onLine) retryAll()
    }, RETRY_MS)
  } else if (!unsent && retryTimer !== undefined) {
    clearInterval(retryTimer)
    retryTimer = undefined
  }
}

// ── React ──

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** What is on its way, for the lists to show */
export function useOutbox(): readonly OutboxItem[] {
  return useSyncExternalStore(subscribe, () => items, () => EMPTY)
}

/** Call `reload` each time a row reaches the database, so the screen shows the database's copy */
export function useReloadWhenSent(reload: () => void): void {
  const latest = useRef(reload)
  useEffect(() => {
    latest.current = reload
  })
  useEffect(() => {
    const listener = () => latest.current()
    sentListeners.add(listener)
    return () => {
      sentListeners.delete(listener)
    }
  }, [])
}

// ── Rows for the lists ──

export type ShownRecord = AppRecord & { outbox?: OutboxStatus }
export type ShownExpense = Expense & { outbox?: OutboxStatus }

export const OUTBOX_ID_PREFIX = 'outbox:'

function toRecord(item: OutboxItem & { table: 'records' }): ShownRecord {
  return { ...item.row, created_by: item.row.created_by ?? undefined, id: OUTBOX_ID_PREFIX + item.requestId, seq_number: null as unknown as number, outbox: item.status }
}

function toExpense(item: OutboxItem & { table: 'expenses' }): ShownExpense {
  return { ...item.row, created_by: item.row.created_by ?? undefined, id: OUTBOX_ID_PREFIX + item.requestId, outbox: item.status }
}

const requestIds = (list: readonly { client_request_id?: string | null }[]) => new Set(list.map((r) => r.client_request_id).filter(Boolean))

/** `list` plus the income on its way that belongs in it and is not in it yet (the database's copy wins) */
export function withOutboxIncome(list: readonly AppRecord[], outbox: readonly OutboxItem[], belongs: (row: IncomeInsert) => boolean): ShownRecord[] {
  const have = requestIds(list)
  const extra = outbox.filter((i): i is OutboxItem & { table: 'records' } => i.table === 'records' && !have.has(i.requestId) && belongs(i.row)).map(toRecord)
  return extra.length > 0 ? [...list, ...extra] : (list as ShownRecord[])
}

/** `list` plus the expenses on their way that belong in it and are not in it yet */
export function withOutboxExpenses(list: readonly Expense[], outbox: readonly OutboxItem[], belongs: (row: ExpenseInsert) => boolean): ShownExpense[] {
  const have = requestIds(list)
  const extra = outbox.filter((i): i is OutboxItem & { table: 'expenses' } => i.table === 'expenses' && !have.has(i.requestId) && belongs(i.row)).map(toExpense)
  return extra.length > 0 ? [...list, ...extra] : (list as ShownExpense[])
}

// ── Back to the form when the database refuses a row ──

let restore: { table: OutboxEntry['table']; draft: unknown } | null = null

/** "กลับไปแก้": the form of `table` opens with this draft */
export function restoreDraft(table: OutboxEntry['table'], draft: unknown): void {
  restore = { table, draft }
}

/** The draft waiting for the form of `table`, once */
export function takeRestoredDraft<T>(table: OutboxEntry['table']): T | null {
  if (restore?.table !== table) return null
  const draft = restore.draft as T
  restore = null
  return draft
}
