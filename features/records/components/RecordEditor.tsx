'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { CAR_BRANDS, CAR_TYPES } from '@/types'
import { bangkokToday } from '@/lib/time/bangkok'
import { toUserMessage } from '@/lib/errors'
import { useKeepEarlyTyping } from '@/lib/use-early-typing'
import { useHydrated } from '@/lib/use-hydrated'
import { reportAppError } from '@/lib/observability'
import { Badge } from '@/components/ui/Badge'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { ChoiceGroup } from '@/components/ui/ChoiceGroup'
import { Dialog } from '@/components/ui/Dialog'
import { TextInput } from '@/components/ui/TextInput'
import { useToast } from '@/components/ui/Toast'
import { ActionBar } from '@/components/patterns/ActionBar'
import { FormErrorSummary } from '@/components/patterns/FormErrorSummary'
import { enterMovesToNextField } from '@/components/patterns/form-keys'
import { FormField, describedBy, labelId } from '@/components/patterns/FormField'
import { useOnline } from '@/components/patterns/StatusBar'
import { BrandPicker, CustomerField, DateField, MoneyField, PlateField, dayKind, thaiDate, toDigits } from '@/components/patterns/fields'
import { CustomerFormDialog } from '@/features/customers/components/CustomerFormDialog'
import { useCustomerDirectory, usePlateCustomers } from '@/features/customers/hooks'
import { useUrlDialog } from '@/lib/url-state'
import { matchDebtGroup, nameKey, plateKey } from '@/features/customers/logic'
import type { Customer } from '@/features/customers/types'
import { loadTodayDashboard } from '@/features/dashboard/hooks'
import { resend, restoreDraft, send, takeRestoredDraft, type OutboxEntry } from '../outbox'
import {
  EMPTY_EXPENSE,
  EMPTY_INCOME,
  EXPENSE_PRESETS,
  checkExpense,
  checkIncome,
  expenseRow,
  expenseSavedMessage,
  incomeRow,
  incomeSavedMessage,
  isExpenseDirty,
  isIncomeDirty,
  needsNameWarning,
  nextIncome,
  type ExpenseDraft,
  type FieldError,
  type IncomeDraft,
} from '../editor'
import { draftKey, rememberLastSaved, useDraft, usePlateVisits, useRecentCustomers, useRequestId } from '../hooks'

// RecordEditor in create mode (screen-specifications.md §4). Edit mode joins in C4.

export interface EditorProps {
  userId: string
  email: string
}

const errorFor = (errors: FieldError[], id: string) => errors.find((e) => e.id === id)?.message ?? null

/** What the form was when it was sent, to fill it again if the database refuses the row */
interface SentForm<T> {
  form: T
  day: string
}

/** A tap this soon after a send, on the form it left behind, is the same tap again */
const RESUBMIT_GUARD_MS = 800

/**
 * Shared save plumbing (ADR-30): the row goes on its way (outbox.ts) and the form moves on
 * at once; the lists show it with "กำลังส่ง". One request id per payload, a new one after
 * each send. A tap in the moment after a send, on the form exactly as the send left it, is
 * the same tap again and is ignored (AC-06-1): the emptied form would only show "fill in"
 * errors. Anything typed since makes it a new save.
 */
function useSend() {
  const requestId = useRequestId()
  const router = useRouter()
  const toast = useToast()
  const lastSent = useRef(-Infinity)

  const left = useRef<unknown>(null)
  /** The form the send left behind (the value passed to draft.reset) */
  const leaveForm = useCallback(<T,>(form: T): T => {
    left.current = form
    return form
  }, [])
  const repeatTap = useCallback((form: unknown) => form === left.current && performance.now() - lastSent.current < RESUBMIT_GUARD_MS, [])

  const sendRow = useCallback(
    <T,>(entry: OutboxEntry, sent: SentForm<T>, { label, onSent }: { label: string; onSent: () => void }) => {
      lastSent.current = performance.now()
      requestId.clear()
      let unsentToast: number | null = null
      send({
        ...entry,
        draft: sent,
        callbacks: {
          onSent: () => {
            if (unsentToast !== null) toast.dismiss(unsentToast)
            onSent()
          },
          onUnsent: () => {
            unsentToast = toast.error(`ส่ง ${label} ไม่ได้ ไม่มีสัญญาณ`, { action: { label: 'ส่งอีกครั้ง', onClick: () => resend(entry.row.client_request_id) } })
          },
          onRefused: (error) => {
            reportAppError(error)
            if (unsentToast !== null) toast.dismiss(unsentToast)
            toast.error(`บันทึก ${label} ไม่สำเร็จ ${toUserMessage(error)}`, {
              action: {
                label: 'กลับไปแก้',
                onClick: () => {
                  restoreDraft(entry.table, sent)
                  router.push(entry.table === 'records' ? '/add' : '/add?type=expense')
                },
              },
            })
          },
        },
      })
    },
    [requestId, router, toast],
  )

  return { requestId, sendRow, leaveForm, repeatTap }
}

/** A refused row sent back to this form ("กลับไปแก้"), once, after the draft kept in this tab is read */
function useRestoredForm<T>(table: OutboxEntry['table'], restore: (form: T) => void, setDay: (day: string) => void) {
  useEffect(() => {
    const sent = takeRestoredDraft<SentForm<T>>(table)
    if (!sent) return
    restore(sent.form)
    setDay(sent.day)
    // Once on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/**
 * "บันทึก" goes back to the dashboard at once; the row shows there with "กำลังส่ง".
 * `warmDashboard` is called once the database has the row: the dashboard's data starts
 * loading then, and the dashboard joins that request (lib/data-store.ts). Started before,
 * it would be dropped as out of date when the save completes (forget('records:')), and
 * the dashboard would have to ask again (measured: +100-250 ms to see the row).
 */
function useToDashboard() {
  const router = useRouter()
  return useCallback(() => router.push('/'), [router])
}

const warmDashboard = () => void loadTodayDashboard()

function RestoredBanner({ onClear }: { onClear: () => void }) {
  return (
    <Banner
      tone="info"
      title="กู้ข้อมูลที่กรอกค้างไว้แล้ว"
      action={
        <Button variant="ghost" onClick={onClear}>
          ล้างฟอร์ม
        </Button>
      }
    />
  )
}

function SaveButtons({
  online,
  primaryLabel,
  primaryVariant = 'primary',
  day,
  today,
}: {
  online: boolean
  primaryLabel: string
  primaryVariant?: 'primary' | 'danger'
  day: string
  today: string
}) {
  const kind = dayKind(day, today)
  // Not before React has taken over the form: the browser would submit it by itself (D-07)
  const ready = useHydrated()
  const note: ReactNode =
    !online ? (
      <p className="text-caption font-medium text-warning-text">ไม่มีอินเทอร์เน็ต · รอเชื่อมต่อแล้วกดบันทึกอีกครั้ง</p>
    ) : kind !== 'today' ? (
      <Badge tone={kind === 'past' ? 'warning' : 'info'} icon="calendar">
        {kind === 'past' ? 'บันทึกย้อนหลัง' : 'วันที่ในอนาคต'}: {thaiDate(day)}
      </Badge>
    ) : undefined
  return (
    <ActionBar note={note}>
      <Button
        type="submit"
        name="intent"
        value="continue"
        variant="secondary"
        size="lg"
        disabled={!ready || !online}
      >
        บันทึกแล้วทำต่อ
      </Button>
      <Button
        type="submit"
        name="intent"
        value="save"
        variant={primaryVariant}
        size="lg"
        disabled={!ready || !online}
      >
        {online ? primaryLabel : 'รอเชื่อมต่อ'}
      </Button>
    </ActionBar>
  )
}

const submitIntent = (e: FormEvent<HTMLFormElement>) =>
  ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === 'continue' ? 'continue' : 'save'

// ── Income ───────────────────────────────────────────────────────────────────

export function IncomeEditor({ userId, email }: EditorProps) {
  const toDashboard = useToDashboard()
  const toast = useToast()
  const online = useOnline()
  const today = bangkokToday()
  const [day, setDay] = useState(today)
  const draft = useDraft<IncomeDraft>(draftKey(userId, 'income'), EMPTY_INCOME, isIncomeDirty)
  const d = draft.value
  const set = <K extends keyof IncomeDraft>(key: K, value: IncomeDraft[K]) => draft.setValue((prev) => ({ ...prev, [key]: value }))

  const recent = useRecentCustomers()
  const visits = usePlateVisits(d.plate)
  const { requestId, sendRow, leaveForm, repeatTap } = useSend()
  useRestoredForm<IncomeDraft>('records', draft.restore, setDay)
  const [attempt, setAttempt] = useState(0)
  const [askName, setAskName] = useState<'save' | 'continue' | null>(null)
  const [showCustomer, setShowCustomer] = useState(false)
  const [showBrand, setShowBrand] = useState(false)
  const plateRef = useRef<HTMLInputElement>(null)
  const customerRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  useKeepEarlyTyping(formRef, {
    'income-date': (v) => v && setDay(v),
    'income-plate': (v) => set('plate', v),
    'income-price': (v) => set('price', toDigits(v)),
    'income-customer': (v) => set('customerName', v),
    'income-note': (v) => set('note', v),
  })

  // Messages appear after the first save attempt and then follow the user's fixes
  const checked = checkIncome(d)
  const errors = attempt > 0 && !checked.ok ? checked.errors : []
  const customerVisible = showCustomer || d.paymentStatus === 'unpaid' || d.customerName !== ''

  // Customer directory (US-11, US-13): loaded only once a plate is typed or the name field
  // shows. It suggests, it never fills a field by itself.
  const directory = useCustomerDirectory({ enabled: plateKey(d.plate).length >= 2 || customerVisible })
  const plateCustomers = usePlateCustomers(directory.customers, d.plate)
  const directoryNames = useMemo(() => directory.customers?.map((c) => c.name) ?? [], [directory.customers])
  const newCustomer = useUrlDialog('customer')
  const [newCustomerFrom, setNewCustomerFrom] = useState<{ name: string; plates: string[] } | null>(null)

  function applyName(customer: Customer) {
    set('customerName', customer.name)
    setShowCustomer(true)
  }

  function write(mode: 'save' | 'continue') {
    const result = checkIncome(d)
    if (!result.ok) return
    const payload = incomeRow(result.data, d, { day, userId, email, requestId: '' })
    const row = { ...payload, client_request_id: requestId.idFor({ ...payload, created_at: day }) }

    recent.remember(row.customer_name)
    // A name and plate the directory does not know yet: offer to keep them (US-13)
    const unknown = mode === 'continue' && row.customer_name.trim() !== '' && directory.customers !== null && matchDebtGroup(directory.customers, { name: row.customer_name, plates: [row.plate] }).length === 0
    const from = { name: row.customer_name.trim(), plates: [row.plate] }
    // On its way: the lists show it at once, the toast says when the database has it (ADR-30)
    sendRow({ table: 'records', row }, { form: d, day }, {
      label: row.plate,
      onSent: () => {
        if (mode === 'save') warmDashboard()
        toast.success(
          incomeSavedMessage(row),
          unknown
            ? {
                action: {
                  label: 'บันทึกเป็นลูกค้า',
                  onClick: () => {
                    setNewCustomerFrom(from)
                    newCustomer.open('new')
                  },
                },
              }
            : undefined,
        )
      },
    })
    if (mode === 'continue') {
      draft.reset(leaveForm(nextIncome(d)))
      setAttempt(0)
      plateRef.current?.focus()
    } else {
      draft.reset(leaveForm(EMPTY_INCOME))
      setAttempt(0)
      rememberLastSaved(row.client_request_id)
      toDashboard()
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (repeatTap(d)) return
    const mode = submitIntent(e)
    setAttempt((n) => n + 1)
    if (!checkIncome(d).ok) return
    if (needsNameWarning(d)) return setAskName(mode)
    write(mode)
  }

  return (
    <>
      <form ref={formRef} method="post" noValidate onSubmit={onSubmit} onKeyDown={enterMovesToNextField} className="grid grid-cols-1 gap-5">
        {draft.restored && <RestoredBanner onClear={() => draft.reset()} />}
        <FormErrorSummary errors={errors} attempt={attempt} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-8">
          <div className="grid grid-cols-1 content-start gap-5">
            <DateField id="income-date" label="วันที่ทำรายการ" value={day} onChange={setDay} today={today} />

            <FormField id="income-type" label="ประเภทงาน" required asGroup error={errorFor(errors, 'income-type')}>
              <ChoiceGroup
                labelledBy={labelId('income-type')}
                variant="tile"
                columns={2}
                value={d.type}
                onChange={(v) => v && set('type', v)}
                options={[
                  { value: 'wash', label: 'ล้างรถ', description: 'บริการทั่วไป', icon: 'wash', tone: 'wash' },
                  { value: 'polish', label: 'ขัดสี', description: 'เต็นท์รถ', icon: 'polish', tone: 'polish' },
                ]}
              />
            </FormField>

            <PlateField
              ref={plateRef}
              id="income-plate"
              label="ป้ายทะเบียน"
              required
              value={d.plate}
              onChange={(v) => set('plate', v)}
              error={errorFor(errors, 'income-plate')}
              below={
                // Always there (hidden while empty), so a screen reader announces what appears in it
                <div aria-live="polite" className="flex flex-wrap items-center gap-2 empty:hidden">
                  {visits > 0 && <Badge tone="info" icon="user">ลูกค้าประจำ · ครั้งที่ {visits + 1}</Badge>}
                  {plateCustomers.map((c) => (
                    <span key={c.id} className="inline-flex flex-wrap items-center gap-1">
                      <Badge tone="info" icon="users">ลูกค้า: {c.name}</Badge>
                      {nameKey(d.customerName) !== nameKey(c.name) && (
                        <Button variant="ghost" size="sm" onClick={() => applyName(c)} aria-label={`ใช้ชื่อนี้ ${c.name}`}>
                          ใช้ชื่อนี้
                        </Button>
                      )}
                    </span>
                  ))}
                </div>
              }
            />

            <FormField id="income-car-type" label="ประเภทรถ" required asGroup error={errorFor(errors, 'income-car-type')}>
              <ChoiceGroup
                labelledBy={labelId('income-car-type')}
                describedBy={describedBy('income-car-type', { error: errorFor(errors, 'income-car-type') })}
                variant="tile"
                columns={3}
                clearable
                invalid={!!errorFor(errors, 'income-car-type')}
                value={d.carType}
                onChange={(v) => set('carType', v)}
                options={CAR_TYPES.map((t) => ({ value: t.id, label: t.name }))}
              />
            </FormField>

            <MoneyField id="income-price" label="ราคา (บาท)" required value={d.price} onChange={(v) => set('price', v)} error={errorFor(errors, 'income-price')} />
          </div>

          <div className="grid grid-cols-1 content-start gap-5">
            <FormField id="income-payment" label="สถานะการชำระ" asGroup>
              <ChoiceGroup
                labelledBy={labelId('income-payment')}
                value={d.paymentStatus}
                onChange={(v) => v && set('paymentStatus', v)}
                options={[
                  { value: 'paid', label: 'ชำระแล้ว', tone: 'success' },
                  { value: 'unpaid', label: 'ค้างชำระ', tone: 'warning' },
                ]}
              />
            </FormField>

            {customerVisible ? (
              <CustomerField
                ref={customerRef}
                id="income-customer"
                label="ลูกค้า / เต็นท์"
                value={d.customerName}
                onChange={(v) => set('customerName', v)}
                recent={recent.names}
                suggestions={directoryNames}
                error={errorFor(errors, 'income-customer')}
                hint={d.paymentStatus === 'unpaid' ? 'ใส่ชื่อเพื่อติดตามยอดค้างได้ง่าย' : undefined}
              />
            ) : (
              <Button variant="ghost" leadingIcon="plus" onClick={() => setShowCustomer(true)} className="justify-self-start">
                เพิ่มชื่อลูกค้า
              </Button>
            )}

            {showBrand || d.brand ? (
              <BrandPicker id="income-brand" label="ยี่ห้อรถ" brands={CAR_BRANDS} value={d.brand} onChange={(v) => set('brand', v)} />
            ) : (
              <Button variant="ghost" leadingIcon="car" onClick={() => setShowBrand(true)} className="justify-self-start">
                เลือกยี่ห้อ (ไม่บังคับ)
              </Button>
            )}

            <FormField id="income-note" label="หมายเหตุ" error={errorFor(errors, 'income-note')} length={{ value: d.note.length, max: 200 }}>
              <TextInput
                id="income-note"
                value={d.note}
                onChange={(e) => set('note', e.target.value)}
                maxLength={200}
                invalid={!!errorFor(errors, 'income-note')}
                aria-describedby={describedBy('income-note', { error: errorFor(errors, 'income-note') })}
              />
            </FormField>
          </div>
        </div>

        <SaveButtons online={online} primaryLabel="บันทึก" day={day} today={today} />

        <Dialog
          open={askName !== null}
          onClose={() => setAskName(null)}
          variant="alert"
          title="ยังไม่ได้ใส่ชื่อลูกค้า"
          description="รายการค้างชำระที่ไม่มีชื่อจะไปอยู่ในกลุ่ม 'ลูกค้าทั่วไป' และติดตามได้ยาก"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  const mode = askName ?? 'save'
                  setAskName(null)
                  write(mode)
                }}
              >
                บันทึกโดยไม่ใส่ชื่อ
              </Button>
              <Button
                autoFocus
                onClick={() => {
                  setAskName(null)
                  setShowCustomer(true)
                  requestAnimationFrame(() => customerRef.current?.focus())
                }}
              >
                ใส่ชื่อลูกค้า
              </Button>
            </>
          }
        >
          {null}
        </Dialog>
      </form>

      {/* Outside the record form: a form may not hold another form */}
      <CustomerFormDialog
        open={newCustomer.value === 'new' && directory.customers !== null}
        customer={null}
        start={newCustomerFrom ?? undefined}
        customers={directory.customers ?? []}
        userId={userId || null}
        onClose={newCustomer.close}
        onReload={() => void directory.reload()}
        onSaved={() => {
          newCustomer.close()
          void directory.reload()
        }}
      />
    </>
  )
}

// ── Expense ──────────────────────────────────────────────────────────────────

export function ExpenseEditor({ userId, email }: EditorProps) {
  const toDashboard = useToDashboard()
  const toast = useToast()
  const online = useOnline()
  const today = bangkokToday()
  const [day, setDay] = useState(today)
  const draft = useDraft<ExpenseDraft>(draftKey(userId, 'expense'), EMPTY_EXPENSE, isExpenseDirty)
  const d = draft.value
  const set = <K extends keyof ExpenseDraft>(key: K, value: ExpenseDraft[K]) => draft.setValue((prev) => ({ ...prev, [key]: value }))

  const { requestId, sendRow, leaveForm, repeatTap } = useSend()
  useRestoredForm<ExpenseDraft>('expenses', draft.restore, setDay)
  const [attempt, setAttempt] = useState(0)
  const amountRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  useKeepEarlyTyping(formRef, {
    'expense-date': (v) => v && setDay(v),
    'expense-amount': (v) => set('amount', toDigits(v)),
    'expense-title': (v) => set('title', v),
    'expense-note': (v) => set('note', v),
  })

  const checked = checkExpense(d)
  const errors = attempt > 0 && !checked.ok ? checked.errors : []
  const preset = (EXPENSE_PRESETS as readonly string[]).includes(d.title) ? d.title : null

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (repeatTap(d)) return
    const mode = submitIntent(e)
    setAttempt((n) => n + 1)
    const result = checkExpense(d)
    if (!result.ok) return

    const payload = expenseRow(result.data, { day, userId, email, requestId: '' })
    const row = { ...payload, client_request_id: requestId.idFor({ ...payload, created_at: day }) }
    sendRow({ table: 'expenses', row }, { form: d, day }, {
      label: row.title,
      onSent: () => {
        if (mode === 'save') warmDashboard()
        toast.success(expenseSavedMessage(row))
      },
    })
    draft.reset(leaveForm(EMPTY_EXPENSE))
    setAttempt(0)
    if (mode === 'continue') amountRef.current?.focus()
    else toDashboard()
  }

  return (
    <form ref={formRef} method="post" noValidate onSubmit={onSubmit} onKeyDown={enterMovesToNextField} className="grid grid-cols-1 gap-5">
      {draft.restored && <RestoredBanner onClear={() => draft.reset()} />}
      <FormErrorSummary errors={errors} attempt={attempt} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-8">
        <div className="grid grid-cols-1 content-start gap-5">
          <DateField id="expense-date" label="วันที่ทำรายการ" value={day} onChange={setDay} today={today} />
          <MoneyField
            ref={amountRef}
            id="expense-amount"
            label="จำนวนเงินที่จ่าย (บาท)"
            required
            tone="expense"
            value={d.amount}
            onChange={(v) => set('amount', v)}
            error={errorFor(errors, 'expense-amount')}
          />
        </div>
        <div className="grid grid-cols-1 content-start gap-5">
          <FormField
            id="expense-title"
            label="จ่ายค่าอะไร"
            required
            error={errorFor(errors, 'expense-title')}
            length={{ value: d.title.length, max: 100 }}
          >
            <ChoiceGroup
              label="รายการที่ใช้บ่อย"
              tone="danger"
              clearable
              value={preset}
              onChange={(v) => set('title', v ?? '')}
              options={EXPENSE_PRESETS.map((p) => ({ value: p, label: p }))}
            />
            <TextInput
              id="expense-title"
              value={d.title}
              onChange={(e) => set('title', e.target.value)}
              maxLength={100}
              placeholder="หรือพิมพ์รายการเอง"
              invalid={!!errorFor(errors, 'expense-title')}
              aria-describedby={describedBy('expense-title', { error: errorFor(errors, 'expense-title') })}
            />
          </FormField>
          <FormField id="expense-note" label="หมายเหตุ" error={errorFor(errors, 'expense-note')} length={{ value: d.note.length, max: 200 }}>
            <TextInput id="expense-note" value={d.note} onChange={(e) => set('note', e.target.value)} maxLength={200} />
          </FormField>
        </div>
      </div>

      <SaveButtons online={online} primaryLabel="บันทึกรายจ่าย" primaryVariant="danger" day={day} today={today} />
    </form>
  )
}
