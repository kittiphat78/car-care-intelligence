import { CAR_BRANDS, CAR_TYPES } from '@/types'
import type { Customer, CustomerDraft, CustomerPhone, CustomerVehicle, PhoneDraft, VehicleDraft } from './types'

// Pure rules of the customer directory (docs/features/customer-directory.md §5).
// No React or Supabase here, so every rule is unit-tested. The plate rules must give
// the same results as the generated columns of M010/M012 (tested with the same samples
// as supabase/tests/customers.test.sql).

// ── Phone numbers ────────────────────────────────────────────────────────────

/** Thai numbers, as the database check of M010: mobile 06/08/09 + 8 digits, landline 02-05/07 + 7 */
export const PHONE_PATTERN = /^0([689]\d{8}|[2-57]\d{7})$/

/** "081-234 5678", "(081) 234-5678", "+66 81 234 5678" → "0812345678". Letters are kept, so the check can refuse them. */
export function normalizePhone(input: string): string {
  const hadPlus = /^\s*\+/.test(input)
  const compact = input.replace(/[\s\-().]/g, '').replace(/^\+/, '')
  // +66…, or 66 + 8-9 digits: the international form of a Thai number (also part of one, for search)
  if (/^66\d{8,9}$/.test(compact) || (hadPlus && compact.startsWith('66'))) return `0${compact.slice(2)}`
  return compact
}

/** Why a (normalised) number cannot be saved, in Thai; null when it is fine */
export function phoneProblem(number: string): string | null {
  if (number === '') return 'กรุณากรอกเบอร์โทร'
  if (!/^\d+$/.test(number)) return 'เบอร์โทรใส่ได้เฉพาะตัวเลข'
  if (!number.startsWith('0')) return 'เบอร์โทรต้องขึ้นต้นด้วย 0'
  if (PHONE_PATTERN.test(number)) return null
  if (/^0[689]/.test(number)) return 'เบอร์มือถือต้องมี 10 หลัก เช่น 081-234-5678'
  if (/^0[2-57]/.test(number)) return 'เบอร์บ้าน/ร้านต้องมี 9 หลัก เช่น 053-123-456'
  return 'เบอร์โทรไม่ถูกต้อง เช่น 081-234-5678'
}

/** 081-234-5678 · 02-123-4567 · 053-123-456; anything else as it is */
export function formatPhone(number: string): string {
  if (!PHONE_PATTERN.test(number)) return number
  if (number.length === 10) return `${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6)}`
  if (number.startsWith('02')) return `${number.slice(0, 2)}-${number.slice(2, 5)}-${number.slice(5)}`
  return `${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6)}`
}

/** `tel:` link for a valid stored number only, so a link can never dial something else */
export function telHref(number: string): string | null {
  return PHONE_PATTERN.test(number) ? `tel:${number}` : null
}

// ── Plates ───────────────────────────────────────────────────────────────────

/** As records store it: trimmed, upper case */
export function normalizePlate(input: string): string {
  return input.trim().toUpperCase()
}

/** customer_vehicles.plate_key: no spaces, dots or dashes ("1กข 1234 กทม." → "1กข1234กทม") */
export function plateKey(input: string): string {
  return normalizePlate(input).replace(/[\s.-]/g, '')
}

const CORE_PREFIX = /^[0-9]?[ก-ฮ]{1,3}[0-9]{1,4}(?=[^0-9]|$)/
const FULL_PLATE = /^[0-9]?[ก-ฮ]{1,3}[0-9]{1,4}$/

/** customer_vehicles.plate_core: the key without a trailing province ("กข1234ชร." → "กข1234"); other plates keep their key */
export function plateCore(input: string): string {
  const key = plateKey(input)
  return CORE_PREFIX.exec(key)?.[0] ?? key
}

/** Thai letters + 1-4 digits: such a plate belongs to one customer only. Digits-only plates ("1234") may repeat. */
export function isFullPlate(core: string): boolean {
  return FULL_PLATE.test(core)
}

// ── Names ────────────────────────────────────────────────────────────────────

/** For comparing names: no spaces at all, lower case ("เต็นท์  A" = "เต็นท์a") */
export function nameKey(name: string): string {
  return name.replace(/\s/g, '').toLowerCase()
}

// ── Reading a customer ───────────────────────────────────────────────────────

export function sortedPhones(customer: Pick<Customer, 'customer_phones'>): CustomerPhone[] {
  return [...customer.customer_phones].sort((a, b) => a.position - b.position)
}

export function sortedVehicles(customer: Pick<Customer, 'customer_vehicles'>): CustomerVehicle[] {
  return [...customer.customer_vehicles].sort((a, b) => a.position - b.position)
}

/** The main number, or the first one when none is marked */
export function primaryPhone(customer: Pick<Customer, 'customer_phones'>): CustomerPhone | null {
  const phones = sortedPhones(customer)
  return phones.find((p) => p.is_primary) ?? phones[0] ?? null
}

export const carTypeName = (id: string | null) => CAR_TYPES.find((t) => t.id === id)?.name ?? null
export const brandName = (id: string | null) => CAR_BRANDS.find((b) => b.id === id)?.name ?? null

/** "TOYOTA Vios" · "TOYOTA" · "Vios" · "" (brand and model, either may be missing) */
export function vehicleMake(v: Pick<CustomerVehicle, 'brand' | 'model'>): string {
  return [brandName(v.brand), v.model].filter(Boolean).join(' ')
}

/** "รถกระบะ · TOYOTA Vios · ขาว" */
export function vehicleDetails(v: Pick<CustomerVehicle, 'car_type' | 'brand' | 'model' | 'color'>): string {
  return [carTypeName(v.car_type), vehicleMake(v), v.color].filter(Boolean).join(' · ')
}

/** The first vehicle ("1กข 1234", "TOYOTA Vios") and how many more ("+2 คัน") */
export function vehicleSummary(customer: Pick<Customer, 'customer_vehicles'>): { first: string | null; make: string; more: number } {
  const vehicles = sortedVehicles(customer)
  return { first: vehicles[0]?.plate ?? null, make: vehicles[0] ? vehicleMake(vehicles[0]) : '', more: Math.max(0, vehicles.length - 1) }
}

// ── Search ───────────────────────────────────────────────────────────────────

export type QueryKind = 'phone' | 'plate' | 'name'

/** What a typed plate looks like without spaces: "1กข", "กข1234", "กข1234เชียงราย" (no Latin letters) */
const PLATE_QUERY = /^[0-9]?[ก-ฮ]{1,3}[0-9]{0,4}[ก-๛]*$/

/**
 * What the search text most likely is, to fill the right field of a new customer.
 * Production data (§2.1): most plates are typed as digits only, so 3-4 digits are a
 * plate; a longer number, or one starting with 0, is a phone number.
 */
export function classifyQuery(query: string): QueryKind {
  const q = query.trim()
  const digitsOnly = q.replace(/[\s\-().+]/g, '')
  if (/^\d+$/.test(digitsOnly) && digitsOnly.length > 0) {
    return digitsOnly.length >= 5 || digitsOnly.startsWith('0') ? 'phone' : 'plate'
  }
  // A name may hold digits too ("อู่ 99", "เต็นท์ 2"): only the shape of a plate counts
  if (/\d/.test(q) && PLATE_QUERY.test(plateKey(q)) && plateKey(q).length <= 20) return 'plate'
  return 'name'
}

export interface SearchMatch {
  field: QueryKind
  /** What matched, as shown ("081-234-5678", "1กข 1234", or the name) */
  value: string
}

export interface SearchResult {
  customer: Customer
  /** Empty when there is no search text */
  match: SearchMatch | null
}

const rank = (haystack: string, needle: string) => (haystack === needle ? 3 : haystack.startsWith(needle) ? 2 : haystack.includes(needle) ? 1 : 0)

/**
 * One search box for name, phone and plate (all partial): "เต็นท์", "5678", "000-0001",
 * "1กข", "1 กข". Says which field matched. Best matches first, then by name.
 */
export function searchCustomers(customers: readonly Customer[], query: string): SearchResult[] {
  const byName = (a: Customer, b: Customer) => a.name.localeCompare(b.name, 'th')
  const q = query.trim()
  if (!q) return [...customers].sort(byName).map((customer) => ({ customer, match: null }))

  const qName = nameKey(q)
  const qDigits = normalizePhone(q).replace(/\D/g, '')
  const qPlate = plateKey(q)
  const onlyDigits = /^[\d\s\-().+]+$/.test(q)

  const results: Array<SearchResult & { score: number }> = []
  for (const customer of customers) {
    let best: { score: number; match: SearchMatch } | null = null
    const consider = (score: number, match: SearchMatch) => {
      if (score > 0 && (!best || score > best.score)) best = { score, match }
    }

    consider(rank(nameKey(customer.name), qName), { field: 'name', value: customer.name })
    // Phone search only for number-like text ("5678", "081-234"), not for "กข1234"
    if (onlyDigits && qDigits.length >= 3) {
      for (const phone of sortedPhones(customer)) consider(rank(phone.number, qDigits), { field: 'phone', value: formatPhone(phone.number) })
    }
    // Digits typed as a phone fragment ("000-0001") are not a plate search
    if (qPlate.length >= 2 && !(onlyDigits && /[\s\-()+]/.test(q))) {
      for (const vehicle of sortedVehicles(customer)) {
        consider(Math.max(rank(vehicle.plate_key, qPlate), rank(vehicle.plate_core, qPlate)), { field: 'plate', value: vehicle.plate })
      }
    }

    const found = best as { score: number; match: SearchMatch } | null
    if (found) results.push({ customer, match: found.match, score: found.score })
  }

  return results.sort((a, b) => b.score - a.score || byName(a.customer, b.customer)).map(({ customer, match }) => ({ customer, match }))
}

// ── Duplicates across customers (warnings and the "move" offer) ──────────────

export interface PlateOwner {
  customer: Customer
  plate: string
  /** A full plate belongs to one customer: saving needs "ย้ายรถมาที่ลูกค้านี้". Otherwise only a warning. */
  blocking: boolean
}

/** Other customers who have this plate (compared by plate_core) */
export function plateOwners(customers: readonly Customer[], plate: string, selfId: string | null): PlateOwner[] {
  const core = plateCore(plate)
  if (!core) return []
  return customers.flatMap((customer) =>
    customer.id === selfId
      ? []
      : customer.customer_vehicles
          .filter((v) => v.plate_core === core)
          .map((v) => ({ customer, plate: v.plate, blocking: isFullPlate(core) })),
  )
}

/** Other customers who have this number (a warning; saving is allowed, Q-3) */
export function phoneOwners(customers: readonly Customer[], number: string, selfId: string | null): Customer[] {
  const n = normalizePhone(number)
  if (!PHONE_PATTERN.test(n)) return []
  return customers.filter((c) => c.id !== selfId && c.customer_phones.some((p) => p.number === n))
}

// ── Records → customers (Phase 3: debts call button, plate hint on /add) ─────
// Records keep the plate and the name as typed (no customer id, ADR-21), so a record is
// matched to directory customers by its plate, then by its name (§5 matchDebtGroup).

const PLATE_DIGITS = /^[0-9]?[ก-ฮ]{1,3}([0-9]{1,4})$/

/**
 * How sure a plate match is. `exact`: the same full plate ("กข 1234" = "กข1234ชร.").
 * `digits`: only the numbers agree — a record typed as "1234" and a car "กข 1234", or
 * two digits-only plates — which may be another car, so the user picks.
 */
export type PlateMatch = 'exact' | 'digits' | null

export function comparePlates(recordPlate: string, vehicleCore: string): PlateMatch {
  const core = plateCore(recordPlate)
  if (!core || !vehicleCore) return null
  if (core === vehicleCore) return isFullPlate(core) ? 'exact' : /^\d{3,}$/.test(core) ? 'digits' : null
  const digitsOf = (c: string) => (/^\d+$/.test(c) ? c : (PLATE_DIGITS.exec(c)?.[1] ?? null))
  const a = digitsOf(core)
  const b = digitsOf(vehicleCore)
  // One side digits only (at least 3 digits), the other a full plate with the same digits
  const oneDigitsOnly = /^\d+$/.test(core) !== /^\d+$/.test(vehicleCore)
  return oneDigitsOnly && a !== null && a.length >= 3 && a === b ? 'digits' : null
}

/** Directory customers with this plate, the exact matches first */
export function customersForPlate(customers: readonly Customer[], plate: string): { exact: Customer[]; digits: Customer[] } {
  const exact: Customer[] = []
  const digits: Customer[] = []
  for (const c of customers) {
    const kinds = c.customer_vehicles.map((v) => comparePlates(plate, v.plate_core))
    if (kinds.includes('exact')) exact.push(c)
    else if (kinds.includes('digits')) digits.push(c)
  }
  return { exact, digits }
}

/** Directory customers with this name (spaces and case ignored) */
export function customersNamed(customers: readonly Customer[], name: string): Customer[] {
  const key = nameKey(name)
  return key ? customers.filter((c) => nameKey(c.name) === key) : []
}

const unique = (list: readonly Customer[]) => [...new Map(list.map((c) => [c.id, c])).values()]

/**
 * The directory customers a group of unpaid records belongs to (US-10): exact plates and
 * the same name first; numbers-only plate matches only when nothing surer was found. The
 * unnamed group ("ลูกค้าทั่วไป") is matched by plates only. 0, 1 or several customers.
 */
export function matchDebtGroup(customers: readonly Customer[], group: { name: string | null; plates: readonly string[] }): Customer[] {
  const byPlate = group.plates.map((p) => customersForPlate(customers, p))
  const sure = unique([...byPlate.flatMap((m) => m.exact), ...(group.name ? customersNamed(customers, group.name) : [])])
  return sure.length ? sure : unique(byPlate.flatMap((m) => m.digits))
}

/** Customers to suggest for a plate typed on /add (US-11): exact matches, else numbers-only ones */
export function customersForTypedPlate(customers: readonly Customer[], plate: string): Customer[] {
  const { exact, digits } = customersForPlate(customers, plate)
  return exact.length ? exact : digits
}

// ── Draft ⇄ customer ─────────────────────────────────────────────────────────

let keySeq = 0
/** Stable React key for a new row */
export const rowKey = () => `row-${Date.now().toString(36)}-${(keySeq++).toString(36)}`

export const emptyPhone = (isPrimary = false): PhoneDraft => ({ key: rowKey(), number: '', label: '', isPrimary })
export const emptyVehicle = (): VehicleDraft => ({ key: rowKey(), plate: '', carType: null, brand: null, model: '', color: '', note: '' })

/** A new customer: one empty phone and one empty vehicle, ready to type */
export function emptyDraft(): CustomerDraft {
  return { name: '', note: '', phones: [emptyPhone(true)], vehicles: [emptyVehicle()] }
}

/** New customer from what was searched (AC-02-5) or from a debt card / record (name and plates) */
export function draftFrom({ query, name, plates = [] }: { query?: string; name?: string; plates?: readonly string[] }): CustomerDraft {
  const draft = emptyDraft()
  if (name) draft.name = name.trim()
  // One row per car (the same plate typed differently counts once)
  const seen = new Set<string>()
  const rows = plates.map(normalizePlate).filter((p) => {
    const core = plateCore(p)
    if (!core || seen.has(core)) return false
    seen.add(core)
    return true
  })
  if (rows.length) draft.vehicles = rows.slice(0, 50).map((plate) => ({ ...emptyVehicle(), plate }))
  if (query?.trim()) {
    const q = query.trim()
    const kind = classifyQuery(q)
    if (kind === 'phone') draft.phones[0].number = normalizePhone(q)
    else if (kind === 'plate') draft.vehicles[0].plate = normalizePlate(q)
    else draft.name = q
  }
  return draft
}

export function draftFromCustomer(customer: Customer): CustomerDraft {
  const phones = sortedPhones(customer)
  const primaryId = primaryPhone(customer)?.id
  return {
    name: customer.name,
    note: customer.note ?? '',
    phones: phones.map((p) => ({ key: p.id, number: p.number, label: p.label ?? '', isPrimary: p.id === primaryId })),
    vehicles: sortedVehicles(customer).map((v) => ({
      key: v.id,
      plate: v.plate,
      carType: v.car_type,
      brand: v.brand,
      model: v.model ?? '',
      color: v.color ?? '',
      note: v.note ?? '',
    })),
  }
}

/** A phone row with nothing typed is ignored when saving */
export const isBlankPhone = (p: PhoneDraft) => p.number.trim() === '' && p.label.trim() === ''
/** A vehicle row with nothing typed is ignored when saving */
export const isBlankVehicle = (v: VehicleDraft) =>
  v.plate.trim() === '' && !v.carType && !v.brand && v.model.trim() === '' && v.color.trim() === '' && v.note.trim() === ''

/** Comparable form of a draft (changes to the order of keys or blank rows do not count) */
export function draftSignature(draft: CustomerDraft): string {
  return JSON.stringify({
    name: draft.name.trim(),
    note: draft.note.trim(),
    phones: draft.phones.filter((p) => !isBlankPhone(p)).map((p) => [normalizePhone(p.number), p.label.trim(), p.isPrimary]),
    vehicles: draft.vehicles
      .filter((v) => !isBlankVehicle(v))
      .map((v) => [normalizePlate(v.plate), v.carType, v.brand, v.model.trim(), v.color.trim(), v.note.trim()]),
  })
}
