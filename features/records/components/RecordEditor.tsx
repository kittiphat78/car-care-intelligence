'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { CAR_BRANDS, CAR_TYPES } from '@/types'
import { bangkokToday } from '@/lib/time/bangkok'
import { toAppError, toUserMessage, type AppError } from '@/lib/errors'
import { useKeepEarlyTyping } from '@/lib/use-early-typing'
import { useHydrated } from '@/lib/use-hydrated'
import { reportAppError } from '@/lib/observability'
import type { Result } from '@/lib/result'
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
import { createExpense, createIncome } from '../api'
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

/** Shared save plumbing: busy flag, failure banner, one request id per payload */
function useSave() {
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<AppError | null>(null)
  const requestId = useRequestId()

  const save = useCallback(
    async (write: () => Promise<Result<void>>): Promise<boolean> => {
      setBusy(true)
      setFailure(null)
      try {
        const result = await write()
        if (result.ok) {
          requestId.clear()
          return true
        }
        reportAppError(result.error)
        setFailure(result.error)
      } catch (e) {
        const error = toAppError(e)
        reportAppError(error)
        setFailure(error)
      } finally {
        setBusy(false)
      }
      return false
    },
    [requestId],
  )

  return { busy, failure, setFailure, save, requestId }
}

function FailureBanner({ error }: { error: AppError | null }) {
  const ref = useRef<HTMLDivElement>(null)
  // The banner is at the top of the form while the save button is at the bottom, so on
  // a phone it appeared out of sight and the tap seemed to do nothing. Move focus to it
  // (which scrolls it into view) on every new failure, like FormErrorSummary (IS-1, U-01)
  useEffect(() => {
    if (error) ref.current?.focus()
  }, [error])
  if (!error) return null
  const title = error.code === 'NETWORK' || error.code === 'TIMEOUT' ? 'บันทึกไม่สำเร็จ ข้อมูลยังอยู่ในฟอร์ม' : 'บันทึกไม่สำเร็จ'
  return (
    <div ref={ref} tabIndex={-1} className="focus-ring scroll-mt-4 rounded-md">
      <Banner tone="danger" title={title}>
        {toUserMessage(error)}
      </Banner>
    </div>
  )
}

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
  busy,
  online,
  primaryLabel,
  primaryVariant = 'primary',
  day,
  today,
}: {
  busy: 'save' | 'continue' | null
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
        disabled={!ready || !online || busy === 'save'}
        isLoading={busy === 'continue'}
        loadingText="กำลังบันทึก…"
      >
        บันทึกแล้วทำต่อ
      </Button>
      <Button
        type="submit"
        name="intent"
        value="save"
        variant={primaryVariant}
        size="lg"
        disabled={!ready || !online || busy === 'continue'}
        isLoading={busy === 'save'}
        loadingText="กำลังบันทึก…"
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
  const router = useRouter()
  const toast = useToast()
  const online = useOnline()
  const today = bangkokToday()
  const [day, setDay] = useState(today)
  const draft = useDraft<IncomeDraft>(draftKey(userId, 'income'), EMPTY_INCOME, isIncomeDirty)
  const d = draft.value
  const set = <K extends keyof IncomeDraft>(key: K, value: IncomeDraft[K]) => draft.setValue((prev) => ({ ...prev, [key]: value }))

  const recent = useRecentCustomers()
  const visits = usePlateVisits(d.plate)
  const { busy, failure, setFailure, save, requestId } = useSave()
  const [intent, setIntent] = useState<'save' | 'continue' | null>(null)
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

  async function write(mode: 'save' | 'continue') {
    const result = checkIncome(d)
    if (!result.ok) return
    setIntent(mode)
    const payload = incomeRow(result.data, d, { day, userId, email, requestId: '' })
    const row = { ...payload, client_request_id: requestId.idFor({ ...payload, created_at: day }) }
    const saved = await save(() => createIncome(row))
    setIntent(null)
    if (!saved) return

    recent.remember(row.customer_name)
    toast.success(incomeSavedMessage(row))
    if (mode === 'continue') {
      draft.reset(nextIncome(d))
      setAttempt(0)
      plateRef.current?.focus()
    } else {
      draft.reset()
      rememberLastSaved(row.client_request_id)
      router.push('/')
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const mode = submitIntent(e)
    setAttempt((n) => n + 1)
    setFailure(null)
    if (!checkIncome(d).ok) return
    if (needsNameWarning(d)) return setAskName(mode)
    void write(mode)
  }

  return (
    <form ref={formRef} method="post" noValidate onSubmit={onSubmit} onKeyDown={enterMovesToNextField} aria-busy={busy || undefined} className="grid grid-cols-1 gap-5">
      {draft.restored && <RestoredBanner onClear={() => draft.reset()} />}
      <FormErrorSummary errors={errors} attempt={attempt} />
      <FailureBanner error={failure} />

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
            below={visits > 0 ? <Badge tone="info" icon="user">ลูกค้าประจำ · ครั้งที่ {visits + 1}</Badge> : undefined}
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

      <SaveButtons busy={busy ? intent : null} online={online} primaryLabel="บันทึก" day={day} today={today} />

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
                void write(mode)
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
  )
}

// ── Expense ──────────────────────────────────────────────────────────────────

export function ExpenseEditor({ userId, email }: EditorProps) {
  const router = useRouter()
  const toast = useToast()
  const online = useOnline()
  const today = bangkokToday()
  const [day, setDay] = useState(today)
  const draft = useDraft<ExpenseDraft>(draftKey(userId, 'expense'), EMPTY_EXPENSE, isExpenseDirty)
  const d = draft.value
  const set = <K extends keyof ExpenseDraft>(key: K, value: ExpenseDraft[K]) => draft.setValue((prev) => ({ ...prev, [key]: value }))

  const { busy, failure, setFailure, save, requestId } = useSave()
  const [intent, setIntent] = useState<'save' | 'continue' | null>(null)
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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const mode = submitIntent(e)
    setAttempt((n) => n + 1)
    setFailure(null)
    const result = checkExpense(d)
    if (!result.ok) return

    setIntent(mode)
    const payload = expenseRow(result.data, { day, userId, email, requestId: '' })
    const row = { ...payload, client_request_id: requestId.idFor({ ...payload, created_at: day }) }
    const saved = await save(() => createExpense(row))
    setIntent(null)
    if (!saved) return

    toast.success(expenseSavedMessage(row))
    draft.reset()
    setAttempt(0)
    if (mode === 'continue') amountRef.current?.focus()
    else router.push('/')
  }

  return (
    <form ref={formRef} method="post" noValidate onSubmit={onSubmit} onKeyDown={enterMovesToNextField} aria-busy={busy || undefined} className="grid grid-cols-1 gap-5">
      {draft.restored && <RestoredBanner onClear={() => draft.reset()} />}
      <FormErrorSummary errors={errors} attempt={attempt} />
      <FailureBanner error={failure} />

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

      <SaveButtons busy={busy ? intent : null} online={online} primaryLabel="บันทึกรายจ่าย" primaryVariant="danger" day={day} today={today} />
    </form>
  )
}
