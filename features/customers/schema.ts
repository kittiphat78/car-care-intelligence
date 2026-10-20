import { z } from '@/lib/zod'
import {
  PHONE_PATTERN,
  isBlankPhone,
  isBlankVehicle,
  isFullPlate,
  normalizePhone,
  normalizePlate,
  phoneProblem,
  plateCore,
  plateKey,
  plateOwners,
} from './logic'
import type { Customer, CustomerDraft } from './types'

// What save_customer (M011-M013) accepts, with the same limits as the CHECK rules of
// M010. checkCustomer() turns a form draft into this payload, or into one Thai message
// per field (docs/features/customer-directory.md §5).

export const LIMITS = { name: 50, note: 200, label: 30, plate: 20, code: 20, model: 30, color: 30, vehicleNote: 200, phones: 20, vehicles: 50 } as const

const optionalText = (max: number) => z.nullable(z.string().check(z.maxLength(max)))
const trimmed = (s: string) => s === s.trim()

export const phonePayload = z.object({
  number: z.string().check(z.regex(PHONE_PATTERN)),
  label: optionalText(LIMITS.label),
  is_primary: z.boolean(),
})

export const vehiclePayload = z.object({
  plate: z.string().check(z.minLength(1), z.maxLength(LIMITS.plate), z.refine((p) => p === normalizePlate(p) && plateKey(p).length > 0)),
  car_type: optionalText(LIMITS.code),
  brand: optionalText(LIMITS.code),
  model: optionalText(LIMITS.model),
  color: optionalText(LIMITS.color),
  note: optionalText(LIMITS.vehicleNote),
})

export const customerPayload = z.object({
  name: z.string().check(z.minLength(1), z.maxLength(LIMITS.name), z.refine(trimmed)),
  note: optionalText(LIMITS.note),
  phones: z.array(phonePayload).check(z.maxLength(LIMITS.phones)),
  vehicles: z.array(vehiclePayload).check(z.maxLength(LIMITS.vehicles)),
})

export type CustomerPayload = z.infer<typeof customerPayload>

/** DOM ids of the form fields (error summary links and focus) */
export const fieldId = {
  name: 'customer-name',
  note: 'customer-note',
  phone: (i: number) => `customer-phone-${i}`,
  phoneLabel: (i: number) => `customer-phone-label-${i}`,
  plate: (i: number) => `customer-plate-${i}`,
  model: (i: number) => `customer-model-${i}`,
  color: (i: number) => `customer-color-${i}`,
  vehicleNote: (i: number) => `customer-vehicle-note-${i}`,
}

export interface FieldError {
  id: string
  label: string
  message: string
}

export type CheckedCustomer = { ok: true; data: CustomerPayload } | { ok: false; errors: FieldError[] }

export interface CheckContext {
  /** Every customer in the directory, to find a full plate that belongs to someone else */
  customers?: readonly Customer[]
  /** The customer being edited (null for a new one) */
  selfId?: string | null
  /** plate_core values the user agreed to move here */
  moves?: ReadonlySet<string>
}

const emptyToNull = (s: string) => (s.trim() === '' ? null : s.trim())

/** Every problem (one per field, in screen order) or the payload for save_customer */
export function checkCustomer(draft: CustomerDraft, { customers = [], selfId = null, moves = new Set() }: CheckContext = {}): CheckedCustomer {
  const errors: FieldError[] = []
  const add = (id: string, label: string, message: string) => errors.push({ id, label, message })

  const name = draft.name.trim()
  if (!name) add(fieldId.name, 'ชื่อลูกค้า / เต็นท์', 'กรุณากรอกชื่อลูกค้า')
  else if (name.length > LIMITS.name) add(fieldId.name, 'ชื่อลูกค้า / เต็นท์', `ชื่อยาวเกิน ${LIMITS.name} ตัวอักษร`)

  const seenNumbers = new Set<string>()
  const phones: CustomerPayload['phones'] = []
  draft.phones.forEach((p, i) => {
    if (isBlankPhone(p)) return
    const number = normalizePhone(p.number)
    const problem = phoneProblem(number)
    if (problem) add(fieldId.phone(i), `เบอร์โทร ${i + 1}`, problem)
    else if (seenNumbers.has(number)) add(fieldId.phone(i), `เบอร์โทร ${i + 1}`, 'เบอร์นี้ใส่ไว้แล้ว')
    seenNumbers.add(number)
    if (p.label.trim().length > LIMITS.label) add(fieldId.phoneLabel(i), `ชื่อเรียกเบอร์ ${i + 1}`, `ยาวเกิน ${LIMITS.label} ตัวอักษร`)
    phones.push({ number, label: emptyToNull(p.label), is_primary: p.isPrimary })
  })
  if (phones.length > LIMITS.phones) add(fieldId.phone(0), 'เบอร์โทร', `ใส่ได้ไม่เกิน ${LIMITS.phones} เบอร์`)
  // One main number: the marked one, or the first
  const primaryIndex = Math.max(0, phones.findIndex((p) => p.is_primary))
  phones.forEach((p, i) => (p.is_primary = i === primaryIndex))

  const seenCores = new Set<string>()
  const vehicles: CustomerPayload['vehicles'] = []
  draft.vehicles.forEach((v, i) => {
    if (isBlankVehicle(v)) return
    const plate = normalizePlate(v.plate)
    const label = `ทะเบียน คันที่ ${i + 1}`
    if (!plate) add(fieldId.plate(i), label, 'กรุณากรอกทะเบียน')
    else if (plate.length > LIMITS.plate) add(fieldId.plate(i), label, `ทะเบียนยาวเกิน ${LIMITS.plate} ตัวอักษร`)
    else if (!plateKey(plate)) add(fieldId.plate(i), label, 'ทะเบียนไม่ถูกต้อง')
    else {
      const core = plateCore(plate)
      const owner = plateOwners(customers, plate, selfId).find((o) => o.blocking)
      if (seenCores.has(core)) add(fieldId.plate(i), label, 'ทะเบียนนี้ใส่ไว้แล้ว')
      else if (owner && isFullPlate(core) && !moves.has(core)) add(fieldId.plate(i), label, `ทะเบียนนี้อยู่กับ ${owner.customer.name}`)
      seenCores.add(core)
    }
    if (v.model.trim().length > LIMITS.model) add(fieldId.model(i), `รุ่น คันที่ ${i + 1}`, `ยาวเกิน ${LIMITS.model} ตัวอักษร`)
    if (v.color.trim().length > LIMITS.color) add(fieldId.color(i), `สี คันที่ ${i + 1}`, `ยาวเกิน ${LIMITS.color} ตัวอักษร`)
    if (v.note.trim().length > LIMITS.vehicleNote) add(fieldId.vehicleNote(i), `หมายเหตุ คันที่ ${i + 1}`, `ยาวเกิน ${LIMITS.vehicleNote} ตัวอักษร`)
    vehicles.push({ plate, car_type: v.carType, brand: v.brand, model: emptyToNull(v.model), color: emptyToNull(v.color), note: emptyToNull(v.note) })
  })
  if (vehicles.length > LIMITS.vehicles) add(fieldId.plate(0), 'รถ', `ใส่ได้ไม่เกิน ${LIMITS.vehicles} คัน`)

  if (draft.note.trim().length > LIMITS.note) add(fieldId.note, 'หมายเหตุ', `หมายเหตุยาวเกิน ${LIMITS.note} ตัวอักษร`)

  if (errors.length) return { ok: false, errors }
  // The same rules as the database, as a last guard
  const parsed = customerPayload.safeParse({ name, note: emptyToNull(draft.note), phones, vehicles })
  if (!parsed.success) return { ok: false, errors: [{ id: fieldId.name, label: 'ข้อมูล', message: 'ข้อมูลไม่ถูกต้อง ตรวจสอบแล้วลองใหม่' }] }
  return { ok: true, data: parsed.data }
}
