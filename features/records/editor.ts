import { CAR_BRANDS, CAR_TYPES, type Expense, type PaymentStatus, type Record as AppRecord, type RecordType } from '@/types'
import { bangkokTimestampOn, joinBangkok, splitBangkok } from '@/lib/time/bangkok'
import { changedFields, expenseSchema, incomeSchema, newIncomeSchema } from './schema'
import type { EntryPatch, ExpenseInsert, IncomeInsert } from './api'

// Pure rules of the record editor (screen-specifications.md §4, user-flows UF-REC-01..05).
// No React here, so every rule is unit-tested.

export interface IncomeDraft {
  type: RecordType
  plate: string
  carType: string | null
  brand: string | null
  /** Digits only */
  price: string
  paymentStatus: PaymentStatus
  customerName: string
  note: string
}

export interface ExpenseDraft {
  title: string
  /** Digits only */
  amount: string
  note: string
}

export const EMPTY_INCOME: IncomeDraft = {
  type: 'wash',
  plate: '',
  carType: null,
  brand: null,
  price: '',
  paymentStatus: 'paid',
  customerName: '',
  note: '',
}

export const EMPTY_EXPENSE: ExpenseDraft = { title: '', amount: '', note: '' }

/** Expense shortcuts (same eight as v1) */
export const EXPENSE_PRESETS = ['ค่าน้ำยา', 'ค่าแรง', 'ค่าข้าว', 'ค่าเช่า', 'ค่าไฟ', 'ค่าน้ำ', 'ค่าขยะ', 'อุปกรณ์'] as const

/** DOM ids of the fields, in screen order (used by the error summary and focus) */
export const INCOME_FIELDS = [
  { key: 'type', id: 'income-type', label: 'ประเภทงาน' },
  { key: 'plate', id: 'income-plate', label: 'ป้ายทะเบียน' },
  { key: 'carType', id: 'income-car-type', label: 'ประเภทรถ' },
  { key: 'price', id: 'income-price', label: 'ราคา' },
  { key: 'paymentStatus', id: 'income-payment', label: 'สถานะการชำระ' },
  { key: 'customerName', id: 'income-customer', label: 'ลูกค้า / เต็นท์' },
  { key: 'note', id: 'income-note', label: 'หมายเหตุ' },
] as const

export const EXPENSE_FIELDS = [
  { key: 'amount', id: 'expense-amount', label: 'จำนวนเงินที่จ่าย' },
  { key: 'title', id: 'expense-title', label: 'จ่ายค่าอะไร' },
  { key: 'note', id: 'expense-note', label: 'หมายเหตุ' },
] as const

export interface FieldError {
  id: string
  label: string
  message: string
}

export type Checked<T> = { ok: true; data: T } | { ok: false; errors: FieldError[] }

type FieldList = ReadonlyArray<{ key: string; id: string; label: string }>

/** Every problem (not just the first), one per field, in screen order */
function collect(fields: FieldList, issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): FieldError[] {
  const byKey = new Map<string, string>()
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '')
    if (!byKey.has(key)) byKey.set(key, issue.message)
  }
  return fields.flatMap((f) => (byKey.has(f.key) ? [{ id: f.id, label: f.label, message: byKey.get(f.key)! }] : []))
}

export function checkIncome(draft: IncomeDraft) {
  const parsed = newIncomeSchema.safeParse({ ...draft, carType: draft.carType ?? '' })
  return parsed.success
    ? ({ ok: true, data: parsed.data } as const)
    : ({ ok: false, errors: collect(INCOME_FIELDS, parsed.error.issues) } as const)
}

export function checkExpense(draft: ExpenseDraft) {
  const parsed = expenseSchema.safeParse(draft)
  return parsed.success
    ? ({ ok: true, data: parsed.data } as const)
    : ({ ok: false, errors: collect(EXPENSE_FIELDS, parsed.error.issues) } as const)
}

/** Unpaid with no name ends up under "ลูกค้าทั่วไป" and is hard to collect: warn (UF-REC-01 D1) */
export function needsNameWarning(draft: IncomeDraft): boolean {
  return draft.paymentStatus === 'unpaid' && draft.customerName.trim() === ''
}

export interface SaveContext {
  /** Bangkok day chosen in the form */
  day: string
  userId: string
  email: string
  requestId: string
  now?: Date
}

type CheckedIncome = Extract<ReturnType<typeof checkIncome>, { ok: true }>['data']
type CheckedExpense = Extract<ReturnType<typeof checkExpense>, { ok: true }>['data']

/**
 * Row to insert. The daily number (seq_number) is left to the database trigger (M009),
 * so the app no longer counts the day's records first (S07-33).
 * `services` keeps v1's layout: [car type name, brand name, note].
 */
export function incomeRow(data: CheckedIncome, draft: IncomeDraft, ctx: SaveContext): IncomeInsert {
  const typeName = CAR_TYPES.find((t) => t.id === draft.carType)?.name ?? ''
  const brandName = CAR_BRANDS.find((b) => b.id === draft.brand)?.name ?? ''
  return {
    type: data.type,
    plate: data.plate.toUpperCase(),
    services: [typeName, brandName, data.note],
    price: data.price,
    created_at: bangkokTimestampOn(ctx.day, ctx.now),
    created_by: ctx.userId,
    created_by_email: ctx.email,
    payment_method: 'cash',
    customer_name: data.customerName,
    payment_status: data.paymentStatus,
    job_status: 'done',
    client_request_id: ctx.requestId,
  }
}

export function expenseRow(data: CheckedExpense, ctx: SaveContext): ExpenseInsert {
  return {
    title: data.title,
    amount: data.amount,
    note: data.note,
    created_at: bangkokTimestampOn(ctx.day, ctx.now),
    created_by: ctx.userId,
    created_by_email: ctx.email,
    client_request_id: ctx.requestId,
  }
}

/** "บันทึกแล้วทำต่อ": clear what changes per car, keep the rest (AC-05-1) */
export function nextIncome(draft: IncomeDraft): IncomeDraft {
  return { ...draft, plate: '', price: '', customerName: '', note: '' }
}

const baht = (n: number) => `฿${n.toLocaleString('en-US')}`

export function incomeSavedMessage(row: Pick<IncomeInsert, 'plate' | 'price'>): string {
  return `บันทึก ${row.plate} ${baht(row.price)} แล้ว`
}

export function expenseSavedMessage(row: Pick<ExpenseInsert, 'title' | 'amount'>): string {
  return `บันทึกรายจ่าย ${row.title} ${baht(row.amount)} แล้ว`
}

/** True when the draft holds something worth restoring */
export function isIncomeDirty(d: IncomeDraft): boolean {
  return !!(d.plate || d.price || d.customerName || d.note || d.carType || d.brand || d.type !== 'wash' || d.paymentStatus !== 'paid')
}

export function isExpenseDirty(d: ExpenseDraft): boolean {
  return !!(d.title || d.amount || d.note)
}

// ── Edit mode (screen-specifications.md §8) ──────────────────────────────────

const typeIdOf = (name: string | undefined) => CAR_TYPES.find((t) => t.name === name)?.id ?? null
const brandIdOf = (name: string | undefined) => CAR_BRANDS.find((b) => b.name === name)?.id ?? null

/** Form values of a stored income record. `services` is [car type name, brand name, note]. */
export function incomeDraftFrom(r: AppRecord): IncomeDraft {
  const [typeName, brandName, note] = r.services ?? []
  return {
    type: r.type ?? 'wash',
    plate: r.plate ?? '',
    carType: typeIdOf(typeName),
    brand: brandIdOf(brandName),
    price: r.price != null ? String(r.price) : '',
    paymentStatus: r.payment_status ?? 'paid',
    customerName: r.customer_name ?? '',
    note: note ?? '',
  }
}

export function expenseDraftFrom(e: Expense): ExpenseDraft {
  return { title: e.title ?? '', amount: e.amount != null ? String(e.amount) : '', note: e.note ?? '' }
}

/** Date and time (Bangkok) of a stored row, for the DateField/TimeField pair */
export const whenOf = (createdAt: string) => splitBangkok(createdAt)

/** created_at to save: the stored value untouched unless the date or time changed */
export function editedCreatedAt(stored: string, day: string, time: string): string {
  const original = splitBangkok(stored)
  return original.date === day && original.time === time ? stored : joinBangkok(day, time)
}

/** Edits are checked with the v1 edit rule: an old record may have no car type */
export function checkIncomeEdit(draft: IncomeDraft) {
  const parsed = incomeSchema.safeParse(draft)
  return parsed.success
    ? ({ ok: true, data: parsed.data } as const)
    : ({ ok: false, errors: collect(INCOME_FIELDS, parsed.error.issues) } as const)
}

type CheckedIncomeEdit = Extract<ReturnType<typeof checkIncomeEdit>, { ok: true }>['data']

/**
 * Only the changed fields (B5). A car type or brand name the catalogue no longer knows
 * is kept as stored unless the user picks another one.
 */
export function incomePatch(original: AppRecord, draft: IncomeDraft, data: CheckedIncomeEdit, createdAt: string): EntryPatch {
  const [storedType = '', storedBrand = ''] = original.services ?? []
  const typeName = draft.carType
    ? CAR_TYPES.find((t) => t.id === draft.carType)!.name
    : typeIdOf(storedType) === null ? storedType : ''
  const brandName = draft.brand
    ? CAR_BRANDS.find((b) => b.id === draft.brand)!.name
    : brandIdOf(storedBrand) === null ? storedBrand : ''
  return changedFields<EntryPatch>(original, {
    type: data.type,
    plate: data.plate.toUpperCase(),
    price: data.price,
    customer_name: data.customerName,
    payment_status: data.paymentStatus,
    services: [typeName, brandName, data.note],
    created_at: createdAt,
  })
}

export function expensePatch(original: Expense, data: CheckedExpense, createdAt: string): EntryPatch {
  return changedFields<EntryPatch>(original, { title: data.title, amount: data.amount, note: data.note, created_at: createdAt })
}
