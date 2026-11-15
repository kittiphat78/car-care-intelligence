'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { toAppError, type AppError } from '@/lib/errors'
import { err, type Result } from '@/lib/result'
import type { Expense, Record as AppRecord } from '@/types'
import { createExpense, createIncome, type EntryTable, type ExpenseInsert, type IncomeInsert } from './api'

// Writes on their way to the database (speed work 3d, ADR-30). The screen moves on at
// once and every list shows the result straight away; the database's copy follows.
//
// - New income and expenses ("items"): shown with "กำลังส่ง" until the database has them.
//   If the network fails they stay as "ยังไม่ส่ง" and are sent again by themselves (back
//   online, or every RETRY_MS); the same client_request_id means a second send never
//   makes a second row (ADR-07). Refused for another reason: they leave the lists and the
//   person is offered the form again.
// - Edits, deletes and settles ("changes"): applied to the lists at once; if they fail
//   they are undone (the lists show the rows as before) and the person can try again.
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

/** A change to rows already in the database. `before` is the row as the screen had it. */
export type Change =
  | { kind: 'update'; table: 'records'; before: AppRecord; after: AppRecord }
  | { kind: 'update'; table: 'expenses'; before: Expense; after: Expense }
  | { kind: 'delete'; table: 'records'; before: AppRecord }
  | { kind: 'delete'; table: 'expenses'; before: Expense }
  | { kind: 'settle'; table: 'records'; before: AppRecord[] }

export type PendingChange = Change & {
  key: number
  status: 'sending' | 'sent'
  sentAt?: number
}

export interface ChangeCallbacks<T> {
  /** The database did it; `data` is what the request answered */
  onSent?: (data: T) => void
  /** It failed and the lists show the rows as before again */
  onFailed?: (error: AppError) => void
}

export interface OutboxSnapshot {
  items: readonly OutboxItem[]
  changes: readonly PendingChange[]
}

/** A sent row stays in the lists this long at most, until a reload shows the database's copy */
export const SENT_KEEP_MS = 15_000
/** How often what is not sent is tried again while the device says it is online */
export const RETRY_MS = 15_000

export const EMPTY_OUTBOX: OutboxSnapshot = { items: [], changes: [] }
let snapshot: OutboxSnapshot = EMPTY_OUTBOX
const listeners = new Set<() => void>()
const sentListeners = new Set<() => void>()

function commit(next: Partial<OutboxSnapshot>) {
  snapshot = { ...snapshot, ...next }
  syncGuards()
  for (const listener of listeners) listener()
}

const notifySent = () => {
  for (const listener of sentListeners) listener()
}

// ── New rows ──

const find = (requestId: string) => snapshot.items.find((i) => i.requestId === requestId)
const update = (requestId: string, patch: Partial<OutboxItem>) =>
  commit({ items: snapshot.items.map((i) => (i.requestId === requestId ? ({ ...i, ...patch } as OutboxItem) : i)) })
const drop = (requestId: string) => {
  if (find(requestId)) commit({ items: snapshot.items.filter((i) => i.requestId !== requestId) })
}

/** A failure worth trying again: the request may not have reached the database */
const isNetwork = (error: AppError) => error.code === 'NETWORK' || error.code === 'TIMEOUT'

/** Put a new row on its way. The lists show it at once (useOutbox). */
export function send(entry: OutboxEntry & { draft: unknown; callbacks?: OutboxCallbacks }): void {
  const requestId = entry.row.client_request_id
  const item = { ...entry, requestId, status: 'sending', callbacks: entry.callbacks ?? {}, toldUnsent: false } as OutboxItem
  commit({ items: [...snapshot.items.filter((i) => i.requestId !== requestId), item] })
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
    notifySent()
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
  for (const item of snapshot.items) if (item.status === 'unsent' && (!requestId || item.requestId === requestId)) void attempt(item.requestId)
}

// ── Changes to rows already in the database ──

let changeKeys = 0

/**
 * Apply `change` to the lists at once and run `request`. On success the lists reload the
 * database's copy; on failure the change is undone (the rows show as before).
 */
export function sendChange<T>(change: Change, request: () => Promise<Result<T>>, callbacks: ChangeCallbacks<T> = {}): void {
  const key = ++changeKeys
  commit({ changes: [...snapshot.changes, { ...change, key, status: 'sending' } as PendingChange] })
  void (async () => {
    let result: Result<T>
    try {
      result = await request()
    } catch (e) {
      result = err(toAppError(e))
    }
    const current = snapshot.changes.find((c) => c.key === key)
    if (!current) return
    if (!result.ok) {
      commit({ changes: snapshot.changes.filter((c) => c.key !== key) })
      callbacks.onFailed?.(result.error)
      return
    }
    commit({ changes: snapshot.changes.map((c) => (c.key === key ? { ...c, status: 'sent', sentAt: performance.now() } : c)) })
    callbacks.onSent?.(result.data)
    notifySent()
    setTimeout(() => commit({ changes: snapshot.changes.filter((c) => c.key !== key) }), SENT_KEEP_MS)
  })()
}

/** Sign-out: the next person on a shared phone must not see these */
export function clearOutbox(): void {
  restore = null
  reopen = null
  commit(EMPTY_OUTBOX)
}

export function outboxSnapshot(): OutboxSnapshot {
  return snapshot
}

export function outboxItems(): readonly OutboxItem[] {
  return snapshot.items
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
  const waiting = snapshot.items.some((i) => i.status !== 'sent') || snapshot.changes.some((c) => c.status === 'sending')
  if (waiting && !guarded) {
    window.addEventListener('beforeunload', warnBeforeClosing)
    window.addEventListener('online', retryAll)
  } else if (!waiting && guarded) {
    window.removeEventListener('beforeunload', warnBeforeClosing)
    window.removeEventListener('online', retryAll)
  }
  guarded = waiting
  const unsent = snapshot.items.some((i) => i.status === 'unsent')
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
export function useOutbox(): OutboxSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => EMPTY_OUTBOX)
}

/** Call `reload` each time a write reaches the database, so the screen shows the database's copy */
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

/** The label a changed row shows: only while the change is on its way */
const changeLabel = (c: PendingChange): OutboxStatus | undefined => (c.status === 'sending' ? 'sending' : undefined)

/**
 * Apply the changes of `table` to `list`: deleted rows go, edited rows show their new
 * values (while the list still has the version that was edited), settled rows are paid.
 * A changed row that no longer `belongs` leaves; an edited row that now belongs joins.
 */
function withChanges<T extends AppRecord | Expense>(
  list: readonly T[],
  changes: readonly PendingChange[],
  table: EntryTable,
  belongs: (row: T) => boolean,
): { list: (T & { outbox?: OutboxStatus })[]; changed: boolean } {
  const mine = changes.filter((c) => c.table === table)
  if (mine.length === 0) return { list: list as (T & { outbox?: OutboxStatus })[], changed: false }
  const out: (T & { outbox?: OutboxStatus })[] = []
  const seen = new Set<string>()
  for (const row of list) {
    seen.add(row.id)
    let shown: T & { outbox?: OutboxStatus } = row
    let touched = false
    for (const c of mine) {
      if (c.kind === 'delete' && c.before.id === row.id) {
        touched = true
        shown = null as never
        break
      }
      if (c.kind === 'update' && c.before.id === row.id && (row.updated_at ?? null) === (c.before.updated_at ?? null)) {
        touched = true
        shown = { ...(c.after as T), outbox: changeLabel(c) }
      }
      if (c.kind === 'settle' && c.before.some((b) => b.id === row.id) && (shown as AppRecord).payment_status === 'unpaid') {
        touched = true
        shown = { ...shown, payment_status: 'paid', outbox: changeLabel(c) } as T & { outbox?: OutboxStatus }
      }
    }
    if (!touched) out.push(row)
    else if (shown && belongs(shown)) out.push(shown)
  }
  for (const c of mine) {
    if (c.kind === 'update' && c.status === 'sending' && !seen.has(c.before.id) && belongs(c.after as T)) out.push({ ...(c.after as T), outbox: 'sending' })
  }
  return { list: out, changed: true }
}

type IncomeRowLike = Pick<AppRecord, 'created_at' | 'payment_status'>

/**
 * `list` with the writes on their way: new income that belongs in it and is not in it yet
 * (the database copy wins, same request id), and edits, deletes and settles of its rows.
 */
export function withOutboxIncome(list: readonly AppRecord[], outbox: OutboxSnapshot, belongs: (row: IncomeRowLike) => boolean): ShownRecord[] {
  const { list: changed } = withChanges(list, outbox.changes, 'records', belongs)
  const have = requestIds(list)
  const extra = outbox.items.filter((i): i is OutboxItem & { table: 'records' } => i.table === 'records' && !have.has(i.requestId) && belongs(i.row)).map(toRecord)
  return extra.length > 0 ? [...changed, ...extra] : changed
}

/** `list` with the expenses on their way and the edits and deletes of its rows */
export function withOutboxExpenses(list: readonly Expense[], outbox: OutboxSnapshot, belongs: (row: Pick<Expense, 'created_at'>) => boolean): ShownExpense[] {
  const { list: changed } = withChanges(list, outbox.changes, 'expenses', belongs)
  const have = requestIds(list)
  const extra = outbox.items.filter((i): i is OutboxItem & { table: 'expenses' } => i.table === 'expenses' && !have.has(i.requestId) && belongs(i.row)).map(toExpense)
  return extra.length > 0 ? [...changed, ...extra] : changed
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

// ── Back to the edit dialog when an edit fails ("แก้อีกครั้ง") ──

let reopen: { id: string; values: unknown } | null = null

/** The edit dialog of row `id` opens with these values instead of the saved ones */
export function reopenEdit(id: string, values: unknown): void {
  reopen = { id, values }
}

/** The values waiting for the edit dialog of row `id`, once */
export function takeReopenedEdit<T>(id: string): T | null {
  if (reopen?.id !== id) return null
  const values = reopen.values as T
  reopen = null
  return values
}
