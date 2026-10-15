import { describe, it, expect } from 'vitest'
import { changedFields, expenseSchema, incomeSchema, newIncomeSchema, validate } from '@/features/records/schema'

const income = { type: 'wash', plate: ' กข 1234 ', price: '250', customerName: ' เต็นท์ ก ', note: ' ', paymentStatus: 'paid' }

describe('record rules (shared by add and edit)', () => {
  it('trims text and turns the price into whole baht', () => {
    expect(validate(incomeSchema, income)).toEqual({
      ok: true,
      data: { type: 'wash', plate: 'กข 1234', price: 250, customerName: 'เต็นท์ ก', note: '', paymentStatus: 'paid' },
    })
  })

  it('keeps text as typed: no HTML escaping (ADR-10)', () => {
    const r = validate(incomeSchema, { ...income, note: 'ราคา <500 & ล้างใน' })
    expect(r.ok && r.data.note).toBe('ราคา <500 & ล้างใน')
  })

  it.each([
    [{ plate: '   ' }, 'กรุณากรอกป้ายทะเบียน'],
    [{ plate: 'x'.repeat(21) }, 'ป้ายทะเบียนยาวเกินไป'],
    [{ price: '' }, 'กรุณากรอกราคา'],
    [{ price: '-5' }, 'ราคาต้องมากกว่าหรือเท่ากับ 0'],
    [{ price: '2.5' }, 'กรุณากรอกจำนวนเต็ม'],
    [{ customerName: 'x'.repeat(51) }, 'ชื่อลูกค้ายาวเกินไป'],
    [{ note: 'x'.repeat(201) }, 'หมายเหตุยาวเกินไป'],
  ])('rejects %o', (change, message) => {
    expect(validate(incomeSchema, { ...income, ...change })).toEqual({ ok: false, message })
  })

  it('needs a car type only for new income (old records may have none)', () => {
    expect(validate(newIncomeSchema, { ...income, carType: '' })).toEqual({ ok: false, message: 'กรุณาเลือกประเภทรถ' })
    expect(validate(newIncomeSchema, { ...income, carType: 'sedan' }).ok).toBe(true)
  })

  it('checks expenses', () => {
    expect(validate(expenseSchema, { title: ' ค่าน้ำ ', amount: '471', note: '' })).toEqual({ ok: true, data: { title: 'ค่าน้ำ', amount: 471, note: '' } })
    expect(validate(expenseSchema, { title: 'x', amount: '0', note: '' })).toEqual({ ok: false, message: 'จำนวนเงินต้องมากกว่า 0' })
    expect(validate(expenseSchema, { title: '', amount: '1', note: '' })).toEqual({ ok: false, message: 'กรุณาระบุรายการจ่าย' })
  })
})

describe('changedFields', () => {
  it('returns only what differs, treating null and empty text as the same', () => {
    const stored = { plate: 'กข 1234', price: 250, customer_name: null, services: ['รถเก๋ง', 'HONDA', ''], created_at: '2026-10-14T03:00:00+00:00' }
    expect(changedFields(stored, {
      plate: 'กข 1234', price: 300, customer_name: '', services: ['รถเก๋ง', 'HONDA', ''], created_at: '2026-10-14T03:00:00+00:00',
    })).toEqual({ price: 300 })
    expect(changedFields(stored, { services: ['รถเก๋ง', 'TOYOTA', ''] })).toEqual({ services: ['รถเก๋ง', 'TOYOTA', ''] })
    expect(changedFields(stored, { plate: 'กข 1234' })).toEqual({})
  })
})
