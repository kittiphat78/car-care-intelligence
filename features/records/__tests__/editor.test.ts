import { describe, expect, it } from 'vitest'
import {
  EMPTY_EXPENSE,
  EMPTY_INCOME,
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
  type IncomeDraft,
} from '../editor'
import { dayKind, formatThousands, thaiDate, toDigits } from '@/components/patterns/fields'

const filled: IncomeDraft = { ...EMPTY_INCOME, plate: ' กข 1234 ', carType: 'sedan', brand: 'toyota', price: '150', note: 'ราคา <500 & ส่วนลด' }
const ctx = { day: '2026-10-13', userId: 'u1', email: 'a@b.c', requestId: 'req-1', now: new Date('2026-10-15T03:15:00Z') }

describe('checkIncome (AC-04-2)', () => {
  it('reports every missing required field in screen order', () => {
    const result = checkIncome(EMPTY_INCOME)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.errors).toEqual([
      { id: 'income-plate', label: 'ป้ายทะเบียน', message: 'กรุณากรอกป้ายทะเบียน' },
      { id: 'income-car-type', label: 'ประเภทรถ', message: 'กรุณาเลือกประเภทรถ' },
      { id: 'income-price', label: 'ราคา', message: 'กรุณากรอกราคา' },
    ])
  })

  it('rejects a 21-character plate and accepts a price of 0 (v1 rule)', () => {
    const long = checkIncome({ ...filled, plate: 'x'.repeat(21) })
    expect(!long.ok && long.errors.map((e) => e.id)).toEqual(['income-plate'])
    expect(checkIncome({ ...filled, price: '0' }).ok).toBe(true)
  })
})

describe('checkExpense (AC-10-2)', () => {
  it('needs an amount above 0 and a title', () => {
    const result = checkExpense({ ...EMPTY_EXPENSE, amount: '0' })
    expect(!result.ok && result.errors.map((e) => [e.id, e.message])).toEqual([
      ['expense-amount', 'จำนวนเงินต้องมากกว่า 0'],
      ['expense-title', 'กรุณาระบุรายการจ่าย'],
    ])
    expect(checkExpense({ title: 'ค่าน้ำยา', amount: '300', note: '' }).ok).toBe(true)
  })
})

describe('incomeRow', () => {
  it('builds the v1 row shape, upper-cases the plate and keeps the note as typed (AC-13-1)', () => {
    const checked = checkIncome(filled)
    if (!checked.ok) throw new Error('should pass')
    const row = incomeRow(checked.data, filled, ctx)
    expect(row).toMatchObject({
      type: 'wash',
      plate: 'กข 1234',
      price: 150,
      services: ['รถเก๋ง', 'TOYOTA', 'ราคา <500 & ส่วนลด'],
      payment_status: 'paid',
      customer_name: '',
      client_request_id: 'req-1',
      created_by_email: 'a@b.c',
    })
  })

  it('leaves the daily number to the database (S07-33)', () => {
    const checked = checkIncome(filled)
    if (!checked.ok) throw new Error('should pass')
    expect(incomeRow(checked.data, filled, ctx)).not.toHaveProperty('seq_number')
  })

  it('puts the record on the chosen Bangkok day at the current time (AC-11-1)', () => {
    const checked = checkIncome(filled)
    if (!checked.ok) throw new Error('should pass')
    // now = 10:15 Bangkok on the 15th; chosen day = 13th
    expect(incomeRow(checked.data, filled, ctx).created_at).toBe('2026-10-13T03:15:00.000Z')
  })
})

describe('expenseRow', () => {
  it('builds the expense row', () => {
    const checked = checkExpense({ title: ' ค่าน้ำยา ', amount: '300', note: '' })
    if (!checked.ok) throw new Error('should pass')
    expect(expenseRow(checked.data, ctx)).toMatchObject({ title: 'ค่าน้ำยา', amount: 300, note: '', client_request_id: 'req-1' })
  })
})

describe('after saving', () => {
  it('"บันทึกแล้วทำต่อ" clears per-car fields and keeps the rest (AC-05-1)', () => {
    const draft: IncomeDraft = { ...filled, type: 'polish', paymentStatus: 'unpaid', customerName: 'เต็นท์ A' }
    expect(nextIncome(draft)).toEqual({ ...draft, plate: '', price: '', customerName: '', note: '' })
  })

  it('says what was saved', () => {
    expect(incomeSavedMessage({ plate: 'กข 1234', price: 1500 })).toBe('บันทึก กข 1234 ฿1,500 แล้ว')
    expect(expenseSavedMessage({ title: 'ค่าน้ำยา', amount: 300 })).toBe('บันทึกรายจ่าย ค่าน้ำยา ฿300 แล้ว')
  })
})

describe('warnings and drafts', () => {
  it('warns only for unpaid jobs without a name', () => {
    expect(needsNameWarning({ ...filled, paymentStatus: 'unpaid', customerName: '  ' })).toBe(true)
    expect(needsNameWarning({ ...filled, paymentStatus: 'unpaid', customerName: 'เต็นท์ A' })).toBe(false)
    expect(needsNameWarning({ ...filled, paymentStatus: 'paid' })).toBe(false)
  })

  it('treats an untouched form as nothing to restore', () => {
    expect(isIncomeDirty(EMPTY_INCOME)).toBe(false)
    expect(isIncomeDirty({ ...EMPTY_INCOME, plate: 'ก' })).toBe(true)
    expect(isExpenseDirty(EMPTY_EXPENSE)).toBe(false)
    expect(isExpenseDirty({ ...EMPTY_EXPENSE, amount: '5' })).toBe(true)
  })
})

describe('field helpers', () => {
  it('keeps digits only and formats thousands', () => {
    expect(toDigits('1,5a00')).toBe('1500')
    expect(toDigits('007')).toBe('7')
    expect(toDigits('0')).toBe('0')
    expect(formatThousands('1500000')).toBe('1,500,000')
    expect(formatThousands('')).toBe('')
  })

  it('tells today, past and future days apart and shows the Thai date', () => {
    expect(dayKind('2026-10-15', '2026-10-15')).toBe('today')
    expect(dayKind('2026-10-13', '2026-10-15')).toBe('past')
    expect(dayKind('2026-10-16', '2026-10-15')).toBe('future')
    expect(thaiDate('2026-10-14')).toBe('14 ต.ค. 2569')
  })
})
