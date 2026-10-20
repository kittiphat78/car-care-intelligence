import { describe, expect, it } from 'vitest'
import {
  classifyQuery,
  comparePlates,
  customersForTypedPlate,
  draftFrom,
  draftFromCustomer,
  draftSignature,
  emptyDraft,
  formatPhone,
  isFullPlate,
  matchDebtGroup,
  nameKey,
  normalizePhone,
  phoneOwners,
  phoneProblem,
  plateCore,
  plateKey,
  plateOwners,
  primaryPhone,
  vehicleDetails,
  vehicleMake,
  searchCustomers,
  telHref,
  vehicleSummary,
} from '../logic'
import type { Customer } from '../types'

let seq = 0
function customer(name: string, phones: Array<[string, string?, boolean?]> = [], plates: string[] = []): Customer {
  const id = `c${++seq}`
  return {
    id,
    name,
    note: null,
    created_at: '2026-10-20T03:00:00Z',
    created_by_email: null,
    updated_at: null,
    updated_by_email: null,
    customer_phones: phones.map(([number, label, primary], i) => ({ id: `${id}-p${i}`, number, label: label ?? null, is_primary: !!primary, position: i })),
    customer_vehicles: plates.map((plate, i) => ({
      id: `${id}-v${i}`,
      plate,
      plate_key: plateKey(plate),
      plate_core: plateCore(plate),
      car_type: null,
      brand: null,
      model: null,
      color: null,
      note: null,
      position: i,
    })),
  }
}

describe('phone numbers', () => {
  it.each([
    ['081-234-5678', '0812345678'],
    ['081 234 5678', '0812345678'],
    ['(081) 234-5678', '0812345678'],
    ['+66 81 234 5678', '0812345678'],
    ['66812345678', '0812345678'],
    ['+6653123456', '053123456'],
    ['053.123.456', '053123456'],
    ['080-000-0001', '0800000001'],
  ])('normalises %s to %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it('accepts Thai mobile (10 digits) and landline (9 digits) numbers, as the database does', () => {
    for (const ok of ['0812345678', '0612345678', '0912345678', '021234567', '053123456', '073123456']) expect(phoneProblem(ok)).toBeNull()
  })

  it('says in Thai what is wrong', () => {
    expect(phoneProblem('')).toBe('กรุณากรอกเบอร์โทร')
    expect(phoneProblem('08x2345678')).toBe('เบอร์โทรใส่ได้เฉพาะตัวเลข')
    expect(phoneProblem('812345678')).toBe('เบอร์โทรต้องขึ้นต้นด้วย 0')
    expect(phoneProblem('081234567')).toMatch(/^เบอร์มือถือต้องมี 10 หลัก/)
    expect(phoneProblem('08123456789')).toMatch(/^เบอร์มือถือต้องมี 10 หลัก/)
    expect(phoneProblem('05312345')).toMatch(/^เบอร์บ้าน\/ร้านต้องมี 9 หลัก/)
    expect(phoneProblem('0112345678')).toMatch(/^เบอร์โทรไม่ถูกต้อง/)
  })

  it('refuses the same numbers as the SQL test (customers.test.sql §4)', () => {
    for (const bad of ['12345', '0812345678 ', '1812345678', '081234567', '08123456789', '0612-34567', '0112345678']) {
      expect(phoneProblem(bad)).not.toBeNull()
    }
  })

  it('formats for reading and builds tel: links only for valid numbers', () => {
    expect(formatPhone('0812345678')).toBe('081-234-5678')
    expect(formatPhone('021234567')).toBe('02-123-4567')
    expect(formatPhone('053123456')).toBe('053-123-456')
    expect(formatPhone('12345')).toBe('12345')
    expect(telHref('0800000001')).toBe('tel:0800000001')
    expect(telHref('0800000001;evil')).toBeNull()
  })
})

describe('plates (must equal the generated columns of M010/M012)', () => {
  // Same samples as supabase/tests/customers.test.sql and the production shapes (§2.1)
  it.each([
    [' 1กข 1234 ', '1กข1234', '1กข1234', true],
    ['2ขค-5678', '2ขค5678', '2ขค5678', true],
    ['2ขค.5678ชร.', '2ขค5678ชร', '2ขค5678', true],
    ['2ขค5678 เชียงราย', '2ขค5678เชียงราย', '2ขค5678', true],
    ['1กข 1234 กทม.', '1กข1234กทม', '1กข1234', true],
    ['กข1234ชร', 'กข1234ชร', 'กข1234', true],
    ['กข123ชร', 'กข123ชร', 'กข123', true],
    ['9กข 9999', '9กข9999', '9กข9999', true],
    ['1234', '1234', '1234', false],
    ['123', '123', '123', false],
    ['toyota', 'TOYOTA', 'TOYOTA', false],
    ['กขค12345', 'กขค12345', 'กขค12345', false],
    ['ทดสอบ 0150', 'ทดสอบ0150', 'ทดสอบ0150', false],
  ])('%s → key %s, core %s (full plate: %s)', (plate, key, core, full) => {
    expect(plateKey(plate)).toBe(key)
    expect(plateCore(plate)).toBe(core)
    expect(isFullPlate(plateCore(plate))).toBe(full)
  })
})

describe('classifyQuery (what a search text most likely is)', () => {
  it.each([
    ['0812345678', 'phone'],
    ['081-234', 'phone'],
    ['05678', 'phone'],
    ['123456', 'phone'],
    ['1234', 'plate'],
    ['567', 'plate'],
    ['1กข', 'plate'],
    ['กข 1234', 'plate'],
    ['1กข-1234 เชียงราย', 'plate'],
    ['เต็นท์ A', 'name'],
    ['เต็นท์ 2', 'name'],
    ['อู่ 99', 'name'],
    ['ทดสอบ E2E-D 7243', 'name'],
    ['พี่เอ', 'name'],
  ])('%s → %s', (q, kind) => {
    expect(classifyQuery(q)).toBe(kind)
  })
})

describe('searchCustomers', () => {
  const a = customer('ทดสอบ เต็นท์ A', [['0800000001', 'เจ้าของ'], ['0800000002', 'เซลส์', true]], ['1กข 1234', '2ขค 5678ชร.'])
  const b = customer('ทดสอบ คุณบี', [['053123456']], ['5678'])
  const c = customer('ร้านทดสอบ เต็นท์ซี', [], [])
  const all = [b, a, c]

  it('lists everyone by name when there is no search text', () => {
    expect(searchCustomers(all, '  ').map((r) => r.customer.name)).toEqual(['ทดสอบ คุณบี', 'ทดสอบ เต็นท์ A', 'ร้านทดสอบ เต็นท์ซี'])
    expect(searchCustomers(all, '').every((r) => r.match === null)).toBe(true)
  })

  it('finds part of a name, ignoring spaces, and says it matched the name', () => {
    const results = searchCustomers(all, 'เต็นท์')
    expect(results.map((r) => r.customer.name)).toEqual(['ทดสอบ เต็นท์ A', 'ร้านทดสอบ เต็นท์ซี'])
    expect(results[0].match).toEqual({ field: 'name', value: 'ทดสอบ เต็นท์ A' })
    expect(searchCustomers(all, 'คุณ บี')[0].customer).toBe(b)
  })

  it('finds part of a number, with or without dashes, and shows it formatted', () => {
    expect(searchCustomers(all, '0002')).toEqual([{ customer: a, match: { field: 'phone', value: '080-000-0002' } }])
    expect(searchCustomers(all, '000-0001')[0]).toEqual({ customer: a, match: { field: 'phone', value: '080-000-0001' } })
    expect(searchCustomers(all, '+66 53 123')[0].customer).toBe(b)
  })

  it('finds part of a plate without spaces, dashes or province', () => {
    expect(searchCustomers(all, '1กข')).toEqual([{ customer: a, match: { field: 'plate', value: '1กข 1234' } }])
    expect(searchCustomers(all, '1 กข 12')[0].customer).toBe(a)
    expect(searchCustomers(all, '2ขค5678')[0].match).toEqual({ field: 'plate', value: '2ขค 5678ชร.' })
  })

  it('ranks an exact plate before a partial one', () => {
    // "5678" is B's whole plate but only part of A's
    expect(searchCustomers(all, '5678').map((r) => r.customer.name)).toEqual(['ทดสอบ คุณบี', 'ทดสอบ เต็นท์ A'])
  })

  it('finds nothing for unrelated text', () => {
    expect(searchCustomers(all, 'ไม่มีชื่อนี้')).toEqual([])
  })
})

describe('reading a customer', () => {
  it('uses the marked main number, or the first one', () => {
    expect(primaryPhone(customer('x', [['0800000001'], ['0800000002', undefined, true]]))?.number).toBe('0800000002')
    expect(primaryPhone(customer('x', [['0800000001'], ['0800000002']]))?.number).toBe('0800000001')
    expect(primaryPhone(customer('x'))).toBeNull()
  })

  it('summarises vehicles as the first plate, its brand and model, and how many more', () => {
    const c = customer('x', [], ['1กข 1234', '2', '3'])
    c.customer_vehicles[0] = { ...c.customer_vehicles[0], brand: 'toyota', model: 'Hilux Revo' }
    expect(vehicleSummary(c)).toEqual({ first: '1กข 1234', make: 'TOYOTA Hilux Revo', more: 2 })
    expect(vehicleSummary(customer('x'))).toEqual({ first: null, make: '', more: 0 })
  })

  it('names a vehicle by type, brand, model and colour, leaving out what is missing', () => {
    expect(vehicleMake({ brand: 'toyota', model: 'Vios' })).toBe('TOYOTA Vios')
    expect(vehicleMake({ brand: 'honda', model: null })).toBe('HONDA')
    expect(vehicleMake({ brand: null, model: 'Vios' })).toBe('Vios')
    expect(vehicleMake({ brand: null, model: null })).toBe('')
    expect(vehicleDetails({ car_type: 'pickup', brand: 'toyota', model: 'Hilux Revo', color: 'ขาว' })).toBe('รถกระบะ · TOYOTA Hilux Revo · ขาว')
    expect(vehicleDetails({ car_type: null, brand: null, model: null, color: 'แดง' })).toBe('แดง')
  })
})

describe('duplicates across customers', () => {
  const a = customer('ทดสอบ เต็นท์ A', [['0800000001']], ['1กข 1234', '7777'])
  const b = customer('ทดสอบ คุณบี', [['0800000001']], ['7777'])

  it('a full plate of someone else blocks (also typed with its province); a digits-only plate only warns', () => {
    expect(plateOwners([a, b], '1กข-1234 กทม.', b.id)).toEqual([{ customer: a, plate: '1กข 1234', blocking: true }])
    expect(plateOwners([a, b], '7777', null).map((o) => [o.customer.name, o.blocking])).toEqual([
      ['ทดสอบ เต็นท์ A', false],
      ['ทดสอบ คุณบี', false],
    ])
    expect(plateOwners([a, b], '1กข 1234', a.id)).toEqual([])
  })

  it('finds other customers with the same number', () => {
    expect(phoneOwners([a, b], '080-000-0001', a.id)).toEqual([b])
    expect(phoneOwners([a, b], '123', null)).toEqual([])
  })

  it('compares names without spaces and case', () => {
    expect(nameKey(' เต็นท์  A ')).toBe(nameKey('เต็นท์a'))
  })
})

describe('drafts', () => {
  it('a new customer starts with one empty phone (main) and one empty vehicle', () => {
    const d = emptyDraft()
    expect(d.phones).toHaveLength(1)
    expect(d.phones[0].isPrimary).toBe(true)
    expect(d.vehicles).toHaveLength(1)
  })

  it('puts the search text in the matching field (AC-02-5)', () => {
    expect(draftFrom({ query: '081-234-5678' }).phones[0].number).toBe('0812345678')
    expect(draftFrom({ query: '1234' }).vehicles[0].plate).toBe('1234')
    expect(draftFrom({ query: '1กข 1234' }).vehicles[0].plate).toBe('1กข 1234')
    expect(draftFrom({ query: ' เต็นท์ใหม่ ' }).name).toBe('เต็นท์ใหม่')
    expect(draftFrom({ name: 'ทดสอบ', plates: [' กข 1 '] })).toMatchObject({ name: 'ทดสอบ', vehicles: [{ plate: 'กข 1' }] })
  })

  it('a customer turns into a draft and back to the same signature', () => {
    const c = customer('ทดสอบ', [['0800000001', 'เจ้าของ'], ['053123456', undefined, true]], ['1กข 1234'])
    const d = draftFromCustomer(c)
    expect(d.phones.map((p) => [p.number, p.label, p.isPrimary])).toEqual([
      ['0800000001', 'เจ้าของ', false],
      ['053123456', '', true],
    ])
    const copy = { ...d, phones: [...d.phones, { key: 'blank', number: '', label: '', isPrimary: false }] }
    expect(draftSignature(copy)).toBe(draftSignature(d))
    expect(draftSignature({ ...d, name: 'ทดสอบ 2' })).not.toBe(draftSignature(d))
  })
})

describe('records → customers (Phase 3)', () => {
  const tent = customer('ทดสอบ เต็นท์ A', [['0800000001', '', true]], ['1กข 1234', '7777'])
  const bee = customer('ทดสอบ คุณบี', [['0800000002', '', true]], ['2ขค 5678'])
  const dee = customer('ทดสอบ คุณดี', [], ['5678'])
  const all = [tent, bee, dee]

  it.each([
    ['1กข 1234', '1กข1234', 'exact'],
    ['1กข-1234 ชร.', '1กข1234', 'exact'],
    ['1234', '1กข1234', 'digits'],
    ['1กข 1234', '1234', 'digits'],
    ['7777', '7777', 'digits'],
    ['77', '77', null],
    ['234', '1กข1234', null],
    ['2กข 1234', '1กข1234', null],
    ['1กข 1234', '2ขค1234', null],
  ] as const)('compares the record plate %s with the car %s: %s', (record, core, kind) => {
    expect(comparePlates(record, core)).toBe(kind)
  })

  it('finds the customer of a debt group by an exact plate or the same name first', () => {
    expect(matchDebtGroup(all, { name: 'อื่น', plates: ['1กข1234กทม.'] })).toEqual([tent])
    expect(matchDebtGroup(all, { name: ' ทดสอบ  เต็นท์ a ', plates: [] })).toEqual([tent])
    // Exact plate of one customer and the name of another: both, the user picks
    expect(matchDebtGroup(all, { name: 'ทดสอบ คุณบี', plates: ['1กข 1234'] }).map((c) => c.name)).toEqual(['ทดสอบ เต็นท์ A', 'ทดสอบ คุณบี'])
  })

  it('uses numbers-only plate matches only when nothing surer was found, and may find several', () => {
    expect(matchDebtGroup(all, { name: 'ทดสอบ เต็นท์ A', plates: ['5678'] })).toEqual([tent])
    expect(matchDebtGroup(all, { name: null, plates: ['5678'] }).map((c) => c.name)).toEqual(['ทดสอบ คุณบี', 'ทดสอบ คุณดี'])
    expect(matchDebtGroup(all, { name: null, plates: ['9999'] })).toEqual([])
    // The unnamed group is matched by plates only
    expect(matchDebtGroup(all, { name: null, plates: [] })).toEqual([])
  })

  it('suggests customers for a plate typed on /add', () => {
    expect(customersForTypedPlate(all, '2ขค 5678')).toEqual([bee])
    expect(customersForTypedPlate(all, '5678').map((c) => c.name)).toEqual(['ทดสอบ คุณบี', 'ทดสอบ คุณดี'])
    expect(customersForTypedPlate(all, '56')).toEqual([])
  })

  it('a new customer from a debt card gets one row per car', () => {
    const draft = draftFrom({ name: 'ทดสอบ เต็นท์ C', plates: ['1กข 1234', '1กข-1234 ชร.', ' 7777 ', ''] })
    expect(draft.name).toBe('ทดสอบ เต็นท์ C')
    expect(draft.vehicles.map((v) => v.plate)).toEqual(['1กข 1234', '7777'])
  })
})
