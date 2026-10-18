'use client'

import { useRef, useState, type ReactNode } from 'react'
import { CAR_BRANDS, CAR_TYPES, type Expense, type Record as AppRecord } from '@/types'
import { formatBangkok } from '@/lib/time/bangkok'
import { toUserMessage, type AppError } from '@/lib/errors'
import { reportAppError } from '@/lib/observability'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { ChoiceGroup } from '@/components/ui/ChoiceGroup'
import { Dialog } from '@/components/ui/Dialog'
import { TextInput } from '@/components/ui/TextInput'
import { useToast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { FormErrorSummary } from '@/components/patterns/FormErrorSummary'
import { FormField, describedBy, labelId } from '@/components/patterns/FormField'
import { useOnline } from '@/components/patterns/StatusBar'
import { BrandPicker, CustomerField, DateField, MoneyField, PlateField, TimeField, thaiDate } from '@/components/patterns/fields'
import { deleteEntry, updateEntry, type EntryPatch } from '../api'
import {
  EXPENSE_PRESETS,
  checkExpense,
  checkIncomeEdit,
  editedCreatedAt,
  expenseDraftFrom,
  expensePatch,
  incomeDraftFrom,
  incomePatch,
  whenOf,
  type ExpenseDraft,
  type FieldError,
  type IncomeDraft,
} from '../editor'
import { useRecentCustomers } from '../hooks'

// screen-specifications.md §8 — RecordEditor in edit mode, inside a dialog.

export type EditTarget = { kind: 'income'; row: AppRecord } | { kind: 'expense'; row: Expense }

export interface EditRecordDialogProps {
  target: EditTarget | null
  onClose: () => void
  /** After a save or delete, so the page reloads its data */
  onChanged: () => void
}

const baht = (n: number) => `฿${n.toLocaleString('en-US')}`
const errorFor = (errors: FieldError[], id: string) => errors.find((e) => e.id === id)?.message ?? null
const shortDate = (at: string) => formatBangkok(at, { day: 'numeric', month: 'short' })
const stamp = (at: string) => formatBangkok(at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })

export function EditRecordDialog({ target, onClose, onChanged }: EditRecordDialogProps) {
  if (!target) return null
  // Keyed by row and version, so reopening (or a newer copy) starts from fresh values
  return <EditBody key={`${target.row.id}:${target.row.updated_at ?? ''}`} target={target} onClose={onClose} onChanged={onChanged} />
}

function AuditInfo({ row }: { row: AppRecord | Expense }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md bg-surface-2 px-3 py-2 text-caption">
      <dt className="text-text-tertiary">เพิ่มโดย</dt>
      <dd className="min-w-0 break-all text-text-secondary">
        {row.created_by_email || '—'} · {stamp(row.created_at)}
      </dd>
      {row.updated_at && (
        <>
          <dt className="text-text-tertiary">แก้ไขล่าสุด</dt>
          <dd className="min-w-0 break-all text-text-secondary">
            {row.updated_by_email || '—'} · {stamp(row.updated_at)}
          </dd>
        </>
      )}
    </dl>
  )
}

function EditBody({ target, onClose, onChanged }: { target: EditTarget; onClose: () => void; onChanged: () => void }) {
  const toast = useToast()
  const online = useOnline()
  const recent = useRecentCustomers()
  const { row } = target
  const isIncome = target.kind === 'income'

  const when = whenOf(row.created_at)
  const [day, setDay] = useState(when.date)
  const [time, setTime] = useState(when.time)
  const [income, setIncome] = useState<IncomeDraft | null>(isIncome ? incomeDraftFrom(target.row) : null)
  const [expense, setExpense] = useState<ExpenseDraft | null>(isIncome ? null : expenseDraftFrom(target.row as Expense))
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)
  const [failure, setFailure] = useState<AppError | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const cancelDeleteRef = useRef<HTMLButtonElement>(null)

  // Snapshot of the values as opened; "บันทึกการแก้ไข" stays disabled until they change
  const [initial] = useState(() => JSON.stringify([day, time, income, expense]))
  const dirty = JSON.stringify([day, time, income, expense]) !== initial

  const checked = income ? checkIncomeEdit(income) : checkExpense(expense!)
  const errors = attempt > 0 && !checked.ok ? checked.errors : []

  const summary = isIncome
    ? `${(row as AppRecord).plate} ${baht((row as AppRecord).price)} (${shortDate(row.created_at)})`
    : `${(row as Expense).title} ${baht((row as Expense).amount)} (${shortDate(row.created_at)})`

  function requestClose() {
    if (busy) return
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }

  function fail(error: AppError) {
    if (error.code === 'NOT_FOUND') {
      toast.info('รายการนี้ถูกลบไปแล้ว')
      onChanged()
      onClose()
      return
    }
    reportAppError(error)
    setFailure(error)
  }

  async function save() {
    setAttempt((n) => n + 1)
    setFailure(null)
    if (!checked.ok) return
    const createdAt = editedCreatedAt(row.created_at, day, time)
    let patch: EntryPatch
    if (income && checked.ok && 'paymentStatus' in checked.data) patch = incomePatch(row as AppRecord, income, checked.data, createdAt)
    else if (checked.ok && 'title' in checked.data) patch = expensePatch(row as Expense, checked.data, createdAt)
    else return
    if (Object.keys(patch).length === 0) return onClose()

    setBusy('save')
    const result = await updateEntry(isIncome ? 'records' : 'expenses', row.id, patch, row.updated_at ?? null)
    setBusy(null)
    if (!result.ok) return fail(result.error)
    toast.success('บันทึกการแก้ไขแล้ว')
    onChanged()
    onClose()
  }

  async function remove() {
    setBusy('delete')
    setFailure(null)
    const result = await deleteEntry(isIncome ? 'records' : 'expenses', row.id)
    setBusy(null)
    if (!result.ok) {
      setConfirmDelete(false)
      return fail(result.error)
    }
    toast.success(`ลบ ${summary.split(' (')[0]} แล้ว`)
    onChanged()
    onClose()
  }

  const footer: ReactNode = confirmDelete ? (
    <div className="grid grid-cols-1 w-full gap-2">
      <p className="text-body font-semibold text-text">ลบ {summary}?</p>
      <div className="flex gap-3 *:flex-1">
        <Button ref={cancelDeleteRef} variant="secondary" onClick={() => setConfirmDelete(false)} disabled={busy === 'delete'}>
          ยกเลิก
        </Button>
        <Button variant="danger" onClick={remove} isLoading={busy === 'delete'} loadingText="กำลังลบ…" disabled={!online}>
          ลบรายการ
        </Button>
      </div>
    </div>
  ) : (
    <>
      <Button
        variant="danger-ghost"
        leadingIcon="trash"
        className="flex-none!"
        disabled={!!busy || !online}
        onClick={() => {
          setConfirmDelete(true)
          requestAnimationFrame(() => cancelDeleteRef.current?.focus())
        }}
      >
        ลบ
      </Button>
      <Button onClick={save} disabled={!dirty || !online || busy === 'delete'} isLoading={busy === 'save'} loadingText="กำลังบันทึก…">
        {online ? 'บันทึกการแก้ไข' : 'รอเชื่อมต่อ'}
      </Button>
    </>
  )

  return (
    <>
      <Dialog
        open
        onClose={requestClose}
        size="lg"
        title={isIncome ? 'แก้ไขรายรับ' : 'แก้ไขรายจ่าย'}
        description={`${isIncome ? (row as AppRecord).plate : (row as Expense).title} · ${thaiDate(when.date)}`}
        footer={footer}
      >
        <div className="grid grid-cols-1 gap-5 pb-2">
          <FormErrorSummary errors={errors} attempt={attempt} />
          {failure && (
            <Banner tone="danger" title={failure.code === 'CONFLICT' ? 'มีการแก้รายการนี้จากเครื่องอื่น' : 'บันทึกไม่สำเร็จ'}>
              {toUserMessage(failure)}
            </Banner>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[3fr_2fr]">
            <DateField id="edit-date" label="วันที่" value={day} onChange={setDay} />
            <TimeField id="edit-time" label="เวลา" value={time} onChange={setTime} />
          </div>

          {income ? (
            <IncomeFields draft={income} setDraft={setIncome} errors={errors} recent={recent.names} />
          ) : (
            <ExpenseFields draft={expense!} setDraft={setExpense} errors={errors} />
          )}

          <AuditInfo row={row} />
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmDiscard}
        title="ยกเลิกการแก้ไข?"
        cancelLabel="กลับไปแก้ไข"
        confirmLabel="ยกเลิกการแก้ไข"
        confirmVariant="danger"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false)
          onClose()
        }}
      >
        <p>สิ่งที่แก้ไว้จะไม่ถูกบันทึก</p>
      </ConfirmDialog>
    </>
  )
}

function IncomeFields({
  draft,
  setDraft,
  errors,
  recent,
}: {
  draft: IncomeDraft
  setDraft: (fn: (d: IncomeDraft | null) => IncomeDraft | null) => void
  errors: FieldError[]
  recent: readonly string[]
}) {
  const set = <K extends keyof IncomeDraft>(key: K, value: IncomeDraft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d))
  return (
    <>
      <FormField id="income-type" label="ประเภทงาน" asGroup>
        <ChoiceGroup
          labelledBy={labelId('income-type')}
          variant="tile"
          columns={2}
          value={draft.type}
          onChange={(v) => v && set('type', v)}
          options={[
            { value: 'wash', label: 'ล้างรถ', icon: 'wash', tone: 'wash' },
            { value: 'polish', label: 'ขัดสี', icon: 'polish', tone: 'polish' },
          ]}
        />
      </FormField>
      <PlateField id="income-plate" label="ป้ายทะเบียน" required value={draft.plate} onChange={(v) => set('plate', v)} error={errorFor(errors, 'income-plate')} />
      <FormField id="income-car-type" label="ประเภทรถ" asGroup>
        <ChoiceGroup
          labelledBy={labelId('income-car-type')}
          variant="tile"
          columns={3}
          clearable
          value={draft.carType}
          onChange={(v) => set('carType', v)}
          options={CAR_TYPES.map((t) => ({ value: t.id, label: t.name }))}
        />
      </FormField>
      <MoneyField id="income-price" label="ราคา (บาท)" required value={draft.price} onChange={(v) => set('price', v)} error={errorFor(errors, 'income-price')} />
      <FormField id="income-payment" label="สถานะการชำระ" asGroup>
        <ChoiceGroup
          labelledBy={labelId('income-payment')}
          value={draft.paymentStatus}
          onChange={(v) => v && set('paymentStatus', v)}
          options={[
            { value: 'paid', label: 'ชำระแล้ว', tone: 'success' },
            { value: 'unpaid', label: 'ค้างชำระ', tone: 'warning' },
          ]}
        />
      </FormField>
      <CustomerField
        id="income-customer"
        label="ลูกค้า / เต็นท์"
        value={draft.customerName}
        onChange={(v) => set('customerName', v)}
        recent={recent}
        error={errorFor(errors, 'income-customer')}
      />
      <BrandPicker id="income-brand" label="ยี่ห้อรถ" brands={CAR_BRANDS} value={draft.brand} onChange={(v) => set('brand', v)} />
      <FormField id="income-note" label="หมายเหตุ" error={errorFor(errors, 'income-note')} length={{ value: draft.note.length, max: 200 }}>
        <TextInput
          id="income-note"
          value={draft.note}
          onChange={(e) => set('note', e.target.value)}
          maxLength={200}
          invalid={!!errorFor(errors, 'income-note')}
          aria-describedby={describedBy('income-note', { error: errorFor(errors, 'income-note') })}
        />
      </FormField>
    </>
  )
}

function ExpenseFields({
  draft,
  setDraft,
  errors,
}: {
  draft: ExpenseDraft
  setDraft: (fn: (d: ExpenseDraft | null) => ExpenseDraft | null) => void
  errors: FieldError[]
}) {
  const set = <K extends keyof ExpenseDraft>(key: K, value: ExpenseDraft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d))
  const preset = (EXPENSE_PRESETS as readonly string[]).includes(draft.title) ? draft.title : null
  return (
    <>
      <MoneyField
        id="expense-amount"
        label="จำนวนเงินที่จ่าย (บาท)"
        required
        tone="expense"
        value={draft.amount}
        onChange={(v) => set('amount', v)}
        error={errorFor(errors, 'expense-amount')}
      />
      <FormField id="expense-title" label="จ่ายค่าอะไร" required error={errorFor(errors, 'expense-title')} length={{ value: draft.title.length, max: 100 }}>
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
          value={draft.title}
          onChange={(e) => set('title', e.target.value)}
          maxLength={100}
          invalid={!!errorFor(errors, 'expense-title')}
          aria-describedby={describedBy('expense-title', { error: errorFor(errors, 'expense-title') })}
        />
      </FormField>
      <FormField id="expense-note" label="หมายเหตุ" length={{ value: draft.note.length, max: 200 }}>
        <TextInput id="expense-note" value={draft.note} onChange={(e) => set('note', e.target.value)} maxLength={200} />
      </FormField>
    </>
  )
}
