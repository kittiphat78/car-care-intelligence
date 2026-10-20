import { describe, expect, it } from 'vitest'
import { emptyDraft, emptyPhone, emptyVehicle, plateCore, plateKey } from '../logic'
import { checkCustomer, customerPayload } from '../schema'
import type { Customer, CustomerDraft } from '../types'

function draft(over: Partial<CustomerDraft> = {}): CustomerDraft {
  return { ...emptyDraft(), name: 'ทดสอบ เต็นท์ A', ...over }
}

const phone = (number: string, label = '', isPrimary = false) => ({ ...emptyPhone(isPrimary), number, label })
const vehicle = (plate: string, extra: Partial<ReturnType<typeof emptyVehicle>> = {}) => ({ ...emptyVehicle(), plate, ...extra })

const other: Customer = {
  id: 'other',
  name: 'ทดสอบ คุณบี',
  note: null,
  created_at: '2026-10-20T03:00:00Z',
  created_by_email: null,
  updated_at: null,
  updated_by_email: null,
  customer_phones: [],
  customer_vehicles: ['2ขค 5678', '7777'].map((plate, i) => ({
    id: `v${i}`,
    plate,
    plate_key: plateKey(plate),
    plate_core: plateCore(plate),
    car_type: null,
    brand: null,
    color: null,
    note: null,
    position: i,
  })),
}

describe('checkCustomer', () => {
  it('builds the save_customer payload: trimmed, normalised, blank rows dropped, one main number', () => {
    const result = checkCustomer(
      draft({
        name: '  ทดสอบ เต็นท์ A ',
        note: ' ',
        phones: [phone('080-000-0001', ' เจ้าของ '), phone(''), phone('053 123 456', '', false)],
        vehicles: [vehicle(' 1กข 1234 ', { carType: 'pickup', brand: 'toyota', color: ' ขาว ' }), vehicle('')],
      }),
    )
    expect(result).toEqual({
      ok: true,
      data: {
        name: 'ทดสอบ เต็นท์ A',
        note: null,
        phones: [
          { number: '0800000001', label: 'เจ้าของ', is_primary: true },
          { number: '053123456', label: null, is_primary: false },
        ],
        vehicles: [{ plate: '1กข 1234', car_type: 'pickup', brand: 'toyota', color: 'ขาว', note: null }],
      },
    })
    if (result.ok) expect(customerPayload.safeParse(result.data).success).toBe(true)
  })

  it('keeps the marked main number', () => {
    const result = checkCustomer(draft({ phones: [phone('0800000001'), phone('0800000002', '', true)] }))
    expect(result.ok && result.data.phones.map((p) => p.is_primary)).toEqual([false, true])
  })

  it('a customer with only a name is fine (no phone, no vehicle)', () => {
    expect(checkCustomer(draft({ phones: [phone('')], vehicles: [vehicle('')] })).ok).toBe(true)
  })

  it('lists every problem in screen order with Thai messages', () => {
    const result = checkCustomer(
      draft({
        name: ' ',
        note: 'ก'.repeat(201),
        phones: [phone('0812'), phone('', 'มีป้ายแต่ไม่มีเบอร์'), phone('0800000001', 'ก'.repeat(31))],
        vehicles: [vehicle('', { color: 'แดง' }), vehicle('ก'.repeat(21))],
      }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((e) => [e.id, e.message])).toEqual([
      ['customer-name', 'กรุณากรอกชื่อลูกค้า'],
      ['customer-phone-0', 'เบอร์มือถือต้องมี 10 หลัก เช่น 081-234-5678'],
      ['customer-phone-1', 'กรุณากรอกเบอร์โทร'],
      ['customer-phone-label-2', 'ยาวเกิน 30 ตัวอักษร'],
      ['customer-plate-0', 'กรุณากรอกทะเบียน'],
      ['customer-plate-1', 'ทะเบียนยาวเกิน 20 ตัวอักษร'],
      ['customer-note', 'หมายเหตุยาวเกิน 200 ตัวอักษร'],
    ])
  })

  it('refuses the same number or the same plate twice in one customer (plates also with a province)', () => {
    const result = checkCustomer(
      draft({ phones: [phone('080-000-0001'), phone('0800000001')], vehicles: [vehicle('4จฉ 1111'), vehicle('4จฉ1111ชร.')] }),
    )
    expect(result.ok ? [] : result.errors.map((e) => [e.id, e.message])).toEqual([
      ['customer-phone-1', 'เบอร์นี้ใส่ไว้แล้ว'],
      ['customer-plate-1', 'ทะเบียนนี้ใส่ไว้แล้ว'],
    ])
  })

  it('a full plate of another customer needs "ย้ายรถมาที่ลูกค้านี้"; a digits-only plate does not', () => {
    const blocked = checkCustomer(draft({ vehicles: [vehicle('2ขค-5678 ชร.')] }), { customers: [other] })
    expect(blocked.ok ? [] : blocked.errors.map((e) => e.message)).toEqual(['ทะเบียนนี้อยู่กับ ทดสอบ คุณบี'])
    expect(checkCustomer(draft({ vehicles: [vehicle('2ขค-5678 ชร.')] }), { customers: [other], moves: new Set(['2ขค5678']) }).ok).toBe(true)
    expect(checkCustomer(draft({ vehicles: [vehicle('7777')] }), { customers: [other] }).ok).toBe(true)
    // Editing B itself is not a clash
    expect(checkCustomer(draft({ vehicles: [vehicle('2ขค 5678')] }), { customers: [other], selfId: 'other' }).ok).toBe(true)
  })
})
