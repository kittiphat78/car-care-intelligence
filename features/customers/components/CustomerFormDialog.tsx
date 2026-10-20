'use client'

import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { CAR_BRANDS, CAR_TYPES } from '@/types'
import { cn } from '@/lib/cn'
import { toUserMessage, type AppError } from '@/lib/errors'
import { useHydrated } from '@/lib/use-hydrated'
import { reportAppError } from '@/lib/observability'
import { Banner } from '@/components/ui/Banner'
import { Button, IconButton } from '@/components/ui/Button'
import { ChoiceGroup } from '@/components/ui/ChoiceGroup'
import { Dialog } from '@/components/ui/Dialog'
import { Icon } from '@/components/ui/Icon'
import { TextInput } from '@/components/ui/TextInput'
import { useToast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { FormErrorSummary } from '@/components/patterns/FormErrorSummary'
import { FormField, describedBy, labelId } from '@/components/patterns/FormField'
import { enterMovesToNextField } from '@/components/patterns/form-keys'
import { useOnline } from '@/components/patterns/StatusBar'
import { PlateField } from '@/components/patterns/fields'
import { useRequestId } from '@/features/records/hooks'
import { saveCustomer, type SavedCustomer } from '../api'
import { customerDraftKey, useCustomerDraft } from '../hooks'
import {
  draftFrom,
  draftFromCustomer,
  draftSignature,
  emptyDraft,
  emptyPhone,
  emptyVehicle,
  normalizePhone,
  phoneOwners,
  plateCore,
  plateKey,
  plateOwners,
} from '../logic'
import { LIMITS, checkCustomer, fieldId, type FieldError } from '../schema'
import type { Customer, CustomerDraft, PhoneDraft, VehicleDraft } from '../types'

// docs/features/customer-directory.md §6.4 — add or edit a customer with all phones and
// vehicles, saved at once by save_customer. A sheet on phones, a 560px dialog on wide
// screens. The page that opens it binds it to the URL (?new=1 / ?edit=customer:<id>).

export interface CustomerFormDialogProps {
  open: boolean
  /** null: a new customer */
  customer: Customer | null
  /** What a new customer starts with: the search text, or a name and plate */
  start?: { query?: string; name?: string; plate?: string }
  /** The whole directory, to warn about numbers and plates other customers have */
  customers: readonly Customer[]
  /** Keeps a new customer's draft for this account; null keeps none */
  userId: string | null
  onClose: () => void
  onSaved: (saved: SavedCustomer, isNew: boolean) => void
  /** Load the directory again (after a clash with another device) */
  onReload: () => void
}

export function CustomerFormDialog(props: CustomerFormDialogProps) {
  if (!props.open) return null
  // A newer copy of the customer (after "โหลดข้อมูลล่าสุด") starts a fresh form
  const key = props.customer ? `${props.customer.id}:${props.customer.updated_at ?? ''}` : 'new'
  return <FormBody key={key} {...props} />
}

const errorFor = (errors: readonly FieldError[], id: string) => errors.find((e) => e.id === id)?.message ?? null

const selectClass =
  'focus-ring min-h-12 w-full min-w-0 appearance-none rounded-md border border-border-strong bg-surface px-3 pr-8 text-body-lg text-text'

function FormBody({ customer, start, customers, userId, onClose, onSaved, onReload }: CustomerFormDialogProps) {
  const toast = useToast()
  const online = useOnline()
  const ready = useHydrated()
  const formId = useId()
  const isNew = customer === null
  const selfId = customer?.id ?? null

  const [startDraft] = useState<CustomerDraft>(() => {
    if (!customer) return draftFrom(start ?? {})
    // One empty row to type into when the customer has no phone or no vehicle yet
    const saved = draftFromCustomer(customer)
    return {
      ...saved,
      phones: saved.phones.length ? saved.phones : [emptyPhone(true)],
      vehicles: saved.vehicles.length ? saved.vehicles : [emptyVehicle()],
    }
  })
  const draft = useCustomerDraft(isNew && userId ? customerDraftKey(userId) : null, startDraft)
  const d = draft.value
  const [moves, setMoves] = useState<ReadonlySet<string>>(() => new Set())
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<AppError | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const requestId = useRequestId()
  const focusNext = useRef<string | null>(null)

  const dirty = draftSignature(d) !== draftSignature(startDraft)
  const checked = checkCustomer(d, { customers, selfId, moves })
  const errors = attempt > 0 && !checked.ok ? checked.errors : []

  // A row that was just added gets the focus
  useEffect(() => {
    if (!focusNext.current) return
    document.getElementById(focusNext.current)?.focus()
    focusNext.current = null
  })

  const setDraft = (fn: (value: CustomerDraft) => CustomerDraft) => draft.setValue(fn)
  const setPhone = (index: number, patch: Partial<PhoneDraft>) =>
    setDraft((v) => ({ ...v, phones: v.phones.map((p, i) => (i === index ? { ...p, ...patch } : p)) }))
  const setVehicle = (index: number, patch: Partial<VehicleDraft>) =>
    setDraft((v) => ({ ...v, vehicles: v.vehicles.map((x, i) => (i === index ? { ...x, ...patch } : x)) }))

  function addPhone() {
    focusNext.current = fieldId.phone(d.phones.length)
    setDraft((v) => ({ ...v, phones: [...v.phones, emptyPhone(v.phones.length === 0)] }))
  }
  function removePhone(index: number) {
    setDraft((v) => {
      const phones = v.phones.filter((_, i) => i !== index)
      // The main number goes with its row: the first one left becomes the main one
      if (phones.length && !phones.some((p) => p.isPrimary)) phones[0] = { ...phones[0], isPrimary: true }
      return { ...v, phones: phones.length ? phones : [emptyPhone(true)] }
    })
  }
  function addVehicle() {
    focusNext.current = fieldId.plate(d.vehicles.length)
    setDraft((v) => ({ ...v, vehicles: [...v.vehicles, emptyVehicle()] }))
  }
  function removeVehicle(index: number) {
    setDraft((v) => {
      const vehicles = v.vehicles.filter((_, i) => i !== index)
      return { ...v, vehicles: vehicles.length ? vehicles : [emptyVehicle()] }
    })
  }

  function requestClose() {
    if (busy) return
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }

  function fail(error: AppError) {
    if (error.code === 'NOT_FOUND' && !isNew) {
      toast.info('ไม่พบลูกค้านี้ อาจถูกลบไปแล้ว')
      onReload()
      onClose()
      return
    }
    // A plate added to someone else meanwhile: reload, so the "ย้ายรถ" choice appears
    if (error.code === 'VALIDATION' && error.field === 'plate') onReload()
    reportAppError(error)
    setFailure(error)
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    setAttempt((n) => n + 1)
    setFailure(null)
    if (!checked.ok) return
    if (!isNew && !dirty) return onClose()

    // Only moves of plates that are still in the form
    const cores = new Set(checked.data.vehicles.map((v) => plateCore(v.plate)))
    const moveList = [...moves].filter((core) => cores.has(core)).sort()
    setBusy(true)
    const result = await saveCustomer(checked.data, {
      id: selfId,
      expectedUpdatedAt: customer?.updated_at ?? null,
      requestId: isNew ? requestId.idFor({ payload: checked.data, moveList }) : null,
      moves: moveList,
    })
    if (!result.ok) {
      setBusy(false)
      return fail(result.error)
    }

    // Stays busy until the page moves on or the dialog closes, so it cannot be saved twice
    requestId.clear()
    draft.discard()
    toast.success(isNew ? `เพิ่มลูกค้า ${checked.data.name} แล้ว` : 'บันทึกการแก้ไขแล้ว')
    onSaved(result.data, isNew)
  }

  const offlineId = `${formId}-offline`
  const footer: ReactNode = (
    <>
      <Button variant="secondary" onClick={requestClose} disabled={busy}>
        ยกเลิก
      </Button>
      <Button
        type="submit"
        form={formId}
        // Not before React has taken over: the browser would submit the form by itself (D-07)
        disabled={!ready || !online || (!isNew && !dirty)}
        isLoading={busy}
        loadingText="กำลังบันทึก…"
        aria-describedby={online ? undefined : offlineId}
      >
        {online ? 'บันทึก' : 'รอเชื่อมต่อ'}
      </Button>
    </>
  )

  return (
    <>
      <Dialog open onClose={requestClose} size="lg" title={isNew ? 'เพิ่มลูกค้า' : 'แก้ไขลูกค้า'} footer={footer}>
        <form
          id={formId}
          method="post"
          noValidate
          onSubmit={onSubmit}
          onKeyDown={enterMovesToNextField}
          aria-busy={busy || undefined}
          className="grid grid-cols-1 gap-5 pb-2"
        >
          {draft.restored && (
            <Banner
              tone="info"
              title="กู้ข้อมูลที่กรอกค้างไว้แล้ว"
              action={
                <Button variant="ghost" onClick={() => draft.reset(emptyDraft())}>
                  ล้างฟอร์ม
                </Button>
              }
            />
          )}
          <FormErrorSummary errors={errors} attempt={attempt} />
          <FailureBanner error={failure} onReload={onReload} />

          <FormField id={fieldId.name} label="ชื่อลูกค้า / เต็นท์" required error={errorFor(errors, fieldId.name)} length={{ value: d.name.length, max: LIMITS.name }}>
            <TextInput
              id={fieldId.name}
              value={d.name}
              onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))}
              maxLength={LIMITS.name}
              autoComplete="off"
              enterKeyHint="next"
              placeholder="เช่น เต็นท์ A"
              invalid={!!errorFor(errors, fieldId.name)}
              aria-required
              aria-describedby={describedBy(fieldId.name, { error: errorFor(errors, fieldId.name) })}
            />
          </FormField>

          <fieldset className="grid min-w-0 grid-cols-1 gap-3">
            <legend className="mb-2 text-subheading text-text">เบอร์โทร</legend>
            {d.phones.map((phone, i) => (
              <PhoneRow
                key={phone.key}
                index={i}
                phone={phone}
                single={d.phones.length === 1}
                radioName={`${formId}-primary`}
                errors={errors}
                owners={phoneOwners(customers, phone.number, selfId)}
                onChange={(patch) => setPhone(i, patch)}
                onPrimary={() => setDraft((v) => ({ ...v, phones: v.phones.map((p, j) => ({ ...p, isPrimary: j === i })) }))}
                onRemove={() => removePhone(i)}
              />
            ))}
            {d.phones.length < LIMITS.phones && (
              <Button variant="ghost" leadingIcon="plus" onClick={addPhone} className="justify-self-start">
                เพิ่มเบอร์
              </Button>
            )}
          </fieldset>

          <fieldset className="grid min-w-0 grid-cols-1 gap-3">
            <legend className="mb-2 text-subheading text-text">รถ</legend>
            {d.vehicles.map((vehicle, i) => (
              <VehicleRow
                key={vehicle.key}
                index={i}
                vehicle={vehicle}
                single={d.vehicles.length === 1}
                errors={errors}
                customers={customers}
                selfId={selfId}
                moves={moves}
                onChange={(patch) => setVehicle(i, patch)}
                onMove={(core, move) =>
                  setMoves((prev) => {
                    const next = new Set(prev)
                    if (move) next.add(core)
                    else next.delete(core)
                    return next
                  })
                }
                onRemove={() => removeVehicle(i)}
              />
            ))}
            {d.vehicles.length < LIMITS.vehicles && (
              <Button variant="ghost" leadingIcon="plus" onClick={addVehicle} className="justify-self-start">
                เพิ่มรถ
              </Button>
            )}
          </fieldset>

          <FormField id={fieldId.note} label="หมายเหตุ" error={errorFor(errors, fieldId.note)} length={{ value: d.note.length, max: LIMITS.note }}>
            <TextInput
              id={fieldId.note}
              value={d.note}
              onChange={(e) => setDraft((v) => ({ ...v, note: e.target.value }))}
              maxLength={LIMITS.note}
              autoComplete="off"
              placeholder="เช่น ส่งรถทุกวันจันทร์"
              invalid={!!errorFor(errors, fieldId.note)}
              aria-describedby={describedBy(fieldId.note, { error: errorFor(errors, fieldId.note) })}
            />
          </FormField>

          {!online && (
            <p id={offlineId} className="text-caption font-medium text-warning-text">
              ไม่มีอินเทอร์เน็ต · รอเชื่อมต่อแล้วกดบันทึกอีกครั้ง
            </p>
          )}
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmDiscard}
        title={isNew ? 'ทิ้งข้อมูลที่กรอก?' : 'ยกเลิกการแก้ไข?'}
        cancelLabel="กลับไปกรอกต่อ"
        confirmLabel={isNew ? 'ทิ้งข้อมูล' : 'ยกเลิกการแก้ไข'}
        confirmVariant="danger"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false)
          draft.discard()
          onClose()
        }}
      >
        <p>สิ่งที่กรอกไว้จะไม่ถูกบันทึก</p>
      </ConfirmDialog>
    </>
  )
}

function FailureBanner({ error, onReload }: { error: AppError | null; onReload: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  // The banner is above the fields while the save button is at the bottom: move focus
  // to it (which scrolls it into view) on every new failure, like on /add (U-01)
  useEffect(() => {
    if (error) ref.current?.focus()
  }, [error])
  if (!error) return null

  let title = 'บันทึกไม่สำเร็จ'
  let body: ReactNode = toUserMessage(error)
  let action: ReactNode
  if (error.code === 'CONFLICT') {
    title = 'ลูกค้านี้ถูกแก้จากเครื่องอื่น'
    body = 'โหลดข้อมูลล่าสุดแล้วแก้อีกครั้ง สิ่งที่กรอกในฟอร์มนี้จะไม่ถูกบันทึก'
    action = (
      <Button variant="ghost" onClick={onReload}>
        โหลดข้อมูลล่าสุด
      </Button>
    )
  } else if (error.code === 'VALIDATION' && error.field === 'plate') {
    title = 'ทะเบียนนี้เพิ่งถูกเพิ่มให้ลูกค้าคนอื่น'
    body = 'กด “ย้ายรถมาที่ลูกค้านี้” ใต้ช่องทะเบียน หรือแก้ทะเบียน แล้วบันทึกอีกครั้ง'
  } else if (error.code === 'NETWORK' || error.code === 'TIMEOUT') {
    title = 'บันทึกไม่สำเร็จ ข้อมูลยังอยู่ในฟอร์ม'
  }
  return (
    <div ref={ref} tabIndex={-1} className="focus-ring scroll-mt-4 rounded-md">
      <Banner tone="danger" title={title} action={action}>
        {body}
      </Banner>
    </div>
  )
}

// ── One phone ────────────────────────────────────────────────────────────────

function PhoneRow({
  index,
  phone,
  single,
  radioName,
  errors,
  owners,
  onChange,
  onPrimary,
  onRemove,
}: {
  index: number
  phone: PhoneDraft
  single: boolean
  radioName: string
  errors: readonly FieldError[]
  owners: readonly Customer[]
  onChange: (patch: Partial<PhoneDraft>) => void
  onPrimary: () => void
  onRemove: () => void
}) {
  const id = fieldId.phone(index)
  const labelFieldId = fieldId.phoneLabel(index)
  const error = errorFor(errors, id)
  const labelError = errorFor(errors, labelFieldId)
  // Another customer has this number: allowed (Q-3), but say so
  const warning =
    owners.length > 0 ? (
      <span className="inline-flex items-start gap-1 font-medium text-warning-text">
        <Icon name="alert" size="sm" className="mt-0.75" />
        เบอร์นี้เป็นของ {owners.map((c) => c.name).join(', ')} ด้วย
      </span>
    ) : null
  const label = single ? 'เบอร์' : `เบอร์ ${index + 1}`

  return (
    <div className="grid grid-cols-1 gap-3 rounded-md border border-border p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <FormField id={id} label={label} error={error} hint={warning}>
          <TextInput
            id={id}
            type="tel"
            inputMode="tel"
            value={phone.number}
            onChange={(e) => onChange({ number: e.target.value })}
            onBlur={() => {
              // Tidy what was typed ("081 234 5678" → "0812345678") once it is a valid number
              const n = normalizePhone(phone.number)
              if (n !== phone.number && /^\d{9,10}$/.test(n)) onChange({ number: n })
            }}
            maxLength={20}
            autoComplete="off"
            enterKeyHint="next"
            placeholder="081-234-5678"
            invalid={!!error}
            aria-describedby={describedBy(id, { hint: warning, error })}
            inputClassName="tabular-nums"
          />
        </FormField>
        {!single && <IconButton icon="trash" aria-label={`ลบ${label}`} onClick={onRemove} className="mt-7" />}
      </div>
      <div className={cn('grid items-end gap-3', single ? 'grid-cols-1' : 'grid-cols-[minmax(0,1fr)_auto]')}>
        <FormField id={labelFieldId} label="ชื่อเรียกเบอร์ (ไม่บังคับ)" error={labelError}>
          <TextInput
            id={labelFieldId}
            value={phone.label}
            onChange={(e) => onChange({ label: e.target.value })}
            maxLength={LIMITS.label}
            autoComplete="off"
            enterKeyHint="next"
            placeholder="เช่น เจ้าของ, เซลส์"
            invalid={!!labelError}
            aria-describedby={describedBy(labelFieldId, { error: labelError })}
          />
        </FormField>
        {!single && (
          <label className="flex min-h-12 cursor-pointer items-center gap-2 text-body text-text select-none">
            <input
              type="radio"
              name={radioName}
              checked={phone.isPrimary}
              onChange={onPrimary}
              // Starts with the visible text (WCAG 2.5.3) and says which number it is
              aria-label={`เบอร์หลัก: ${label}`}
              className="focus-ring size-5 accent-primary"
            />
            เบอร์หลัก
          </label>
        )}
      </div>
    </div>
  )
}

// ── One vehicle ──────────────────────────────────────────────────────────────

function VehicleRow({
  index,
  vehicle,
  single,
  errors,
  customers,
  selfId,
  moves,
  onChange,
  onMove,
  onRemove,
}: {
  index: number
  vehicle: VehicleDraft
  single: boolean
  errors: readonly FieldError[]
  customers: readonly Customer[]
  selfId: string | null
  moves: ReadonlySet<string>
  onChange: (patch: Partial<VehicleDraft>) => void
  onMove: (core: string, move: boolean) => void
  onRemove: () => void
}) {
  const plateId = fieldId.plate(index)
  const typeId = `customer-car-type-${index}`
  const brandId = `customer-brand-${index}`
  const modelId = fieldId.model(index)
  const colorId = fieldId.color(index)
  const plateError = errorFor(errors, plateId)
  const modelError = errorFor(errors, modelId)
  const colorError = errorFor(errors, colorId)
  const title = single ? 'รถ' : `คันที่ ${index + 1}`

  const owners = useMemo(() => (plateKey(vehicle.plate) ? plateOwners(customers, vehicle.plate, selfId) : []), [customers, vehicle.plate, selfId])
  const core = plateCore(vehicle.plate)
  const blocking = owners.find((o) => o.blocking)
  const moving = !!blocking && moves.has(core)

  // A digits-only plate may belong to several customers: only a reminder (AC-08-3)
  const hint =
    !blocking && owners.length > 0 ? (
      <span className="inline-flex items-start gap-1 font-medium text-warning-text">
        <Icon name="alert" size="sm" className="mt-0.75" />
        ทะเบียน {vehicle.plate.trim()} มีกับ {owners.map((o) => o.customer.name).join(', ')} ด้วย ตรวจว่าเป็นคันเดียวกันไหม
      </span>
    ) : undefined

  // A full plate belongs to one customer: offer to move it here (AC-08-1, AC-08-2)
  const below = blocking ? (
    moving ? (
      <div role="status" className="grid grid-cols-1 gap-2 rounded-md border border-info-text bg-info-subtle px-3 py-2 text-body text-info-text">
        <p>จะย้ายรถคันนี้จาก {blocking.customer.name} มาที่ลูกค้านี้เมื่อกดบันทึก</p>
        <Button variant="ghost" size="sm" onClick={() => onMove(core, false)} className="justify-self-start">
          ไม่ย้าย
        </Button>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-2 rounded-md border border-warning bg-warning-subtle px-3 py-2 text-body text-warning-text">
        {!plateError && <p>ทะเบียนนี้อยู่กับ {blocking.customer.name}</p>}
        <Button variant="secondary" size="sm" leadingIcon="car" onClick={() => onMove(core, true)} className="justify-self-start">
          ย้ายรถมาที่ลูกค้านี้
        </Button>
      </div>
    )
  ) : undefined

  return (
    <div className="grid grid-cols-1 gap-3 rounded-md border border-border p-3">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <p className="text-label text-text">{title}</p>
        {!single && (
          <Button variant="danger-ghost" size="sm" leadingIcon="trash" onClick={onRemove}>
            ลบ{title}
          </Button>
        )}
      </div>
      <PlateField id={plateId} label="ทะเบียน" value={vehicle.plate} onChange={(plate) => onChange({ plate })} maxLength={LIMITS.plate} error={plateError} hint={hint} below={below} />
      <FormField id={typeId} label="ประเภทรถ" asGroup>
        <ChoiceGroup
          labelledBy={labelId(typeId)}
          clearable
          value={vehicle.carType}
          onChange={(carType) => onChange({ carType })}
          options={CAR_TYPES.map((t) => ({ value: t.id, label: t.name }))}
        />
      </FormField>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField id={brandId} label="ยี่ห้อ">
          <span className="relative block min-w-0">
            <select id={brandId} value={vehicle.brand ?? ''} onChange={(e) => onChange({ brand: e.target.value || null })} className={selectClass}>
              <option value="">ไม่ระบุ</option>
              {CAR_BRANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <Icon name="chevron-down" className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-text-secondary" />
          </span>
        </FormField>
        <FormField id={modelId} label="รุ่น" error={modelError}>
          <TextInput
            id={modelId}
            value={vehicle.model}
            onChange={(e) => onChange({ model: e.target.value })}
            maxLength={LIMITS.model}
            autoComplete="off"
            enterKeyHint="next"
            placeholder="เช่น Vios, Hilux Revo"
            invalid={!!modelError}
            aria-describedby={describedBy(modelId, { error: modelError })}
          />
        </FormField>
        <FormField id={colorId} label="สี" error={colorError}>
          <TextInput
            id={colorId}
            value={vehicle.color}
            onChange={(e) => onChange({ color: e.target.value })}
            maxLength={LIMITS.color}
            autoComplete="off"
            enterKeyHint="next"
            placeholder="เช่น ขาว"
            invalid={!!colorError}
            aria-describedby={describedBy(colorId, { error: colorError })}
          />
        </FormField>
      </div>
    </div>
  )
}
