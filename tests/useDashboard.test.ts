/**
 * tests/useDashboard.test.ts
 *
 * ทดสอบ Pure Computation Logic ของ useDashboard hook:
 *   - คำนวณ Total Revenue, Net Profit, Unpaid Balance
 *   - Edge cases: [], null/undefined, ทศนิยม, ค่าใช้จ่ายติดลบ
 *
 * รัน: npx vitest run tests/useDashboard.test.ts
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseDateMs, getStartOfDay, getStartOfYesterday, getDaysAgo, getStartOfWeek, getStartOfMonth, getStartOfYear } from '@/lib/dateUtils'
import type { Record as AppRecord, Expense } from '@/types'
import { DEFAULT_CUSTOMER_NAME, DEFAULT_CUSTOMER_NAME_UNPAID } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────────────────────────────────────

let _seq = 0
function makeRecord(overrides: Partial<AppRecord> & { created_at: string; price: number }): AppRecord {
  return {
    id: `r-${++_seq}`,
    type: 'wash',
    plate: 'กข 0000',
    services: ['ล้าง'],
    seq_number: _seq,
    payment_status: 'paid',
    job_status: 'done',
    ...overrides,
  }
}

function makeExpense(overrides: Partial<Expense> & { created_at: string; amount: number }): Expense {
  return {
    id: `e-${++_seq}`,
    title: 'ค่าใช้จ่าย',
    note: null,
    ...overrides,
  }
}

afterEach(() => {
  vi.useRealTimers()
  _seq = 0
})

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (mirrors useDashboard computations)
// ─────────────────────────────────────────────────────────────────────────────

interface Stats {
  todayTotalIncome: number
  todayPaid:        number
  todayUnpaid:      number
  todayExpense:     number
  netProfit:        number
  washCount:        number
  polishCount:      number
  diffAmount:       number
  diffPct:          number
  isUp:             boolean
}

/**
 * คำนวณสถิติประจำวัน (logic เดียวกับ useDashboard.stats useMemo)
 * ใช้ allRecords เรียงจากเก่า→ใหม่ (ascending created_at)
 */
function computeStats(allRecords: AppRecord[], expenses: Expense[]): Stats {
  const todayMs     = getStartOfDay().getTime()
  const yesterdayMs = getStartOfYesterday().getTime()

  const todayRecords: AppRecord[] = []
  let yesterdayIncome = 0

  // วน reverse เพราะ sorted ascending — ของวันนี้อยู่ท้าย
  for (let i = allRecords.length - 1; i >= 0; i--) {
    const t = parseDateMs(allRecords[i].created_at)
    if (t >= todayMs)      { todayRecords.push(allRecords[i]); continue }
    if (t >= yesterdayMs)  { yesterdayIncome += allRecords[i].price; continue }
    break
  }

  let todayTotalIncome = 0, todayPaid = 0, todayUnpaid = 0
  let washCount = 0, polishCount = 0

  for (const r of todayRecords) {
    todayTotalIncome += r.price
    if (r.payment_status === 'paid')   todayPaid   += r.price
    if (r.payment_status === 'unpaid') todayUnpaid += r.price
    if (r.type === 'wash')   washCount++
    if (r.type === 'polish') polishCount++
  }

  const todayExpense = expenses
    .filter(e => parseDateMs(e.created_at) >= todayMs)
    .reduce((s, e) => s + e.amount, 0)

  const diffAmount = todayTotalIncome - yesterdayIncome

  return {
    todayTotalIncome,
    todayPaid,
    todayUnpaid,
    todayExpense,
    netProfit: todayPaid - todayExpense,
    washCount,
    polishCount,
    diffAmount,
    diffPct: yesterdayIncome > 0 ? Math.round((diffAmount / yesterdayIncome) * 100) : 0,
    isUp: diffAmount >= 0,
  }
}

/** คำนวณยอดหนี้รวม */
function totalUnpaid(unpaidRecords: AppRecord[]): number {
  return unpaidRecords.reduce((s, r) => s + r.price, 0)
}

/** จัดกลุ่มหนี้ค้างชำระตามลูกค้า */
function groupUnpaid(unpaidRecords: AppRecord[]) {
  const map: Record<string, AppRecord[]> = {}
  for (const r of unpaidRecords) {
    const name = (r.customer_name ?? '').trim() || DEFAULT_CUSTOMER_NAME_UNPAID
    if (!map[name]) map[name] = []
    map[name].push(r)
  }
  return Object.entries(map)
    .map(([name, items]) => ({
      customerName: name,
      items,
      total: items.reduce((s, r) => s + r.price, 0),
    }))
    .sort((a, b) => b.total - a.total)
}

/** คำนวณ Customer Breakdown (week / month / year) */
interface Period { washCount: number; washAmount: number; polishCount: number; polishAmount: number; total: number }
function emptyPeriod(): Period { return { washCount:0, washAmount:0, polishCount:0, polishAmount:0, total:0 } }

function computeBreakdown(yearRecords: AppRecord[]) {
  const weekMs  = getStartOfWeek().getTime()
  const monthMs = getStartOfMonth().getTime()
  const yearMs  = getStartOfYear().getTime()

  const g: Record<string, { week: Period; month: Period; year: Period }> = {}

  for (const r of yearRecords) {
    const name = (r.customer_name ?? '').trim() || DEFAULT_CUSTOMER_NAME
    const t = parseDateMs(r.created_at)
    if (t < yearMs) continue

    if (!g[name]) g[name] = { week: emptyPeriod(), month: emptyPeriod(), year: emptyPeriod() }
    const periods: Period[] = [g[name].year]
    if (t >= monthMs) periods.push(g[name].month)
    if (t >= weekMs)  periods.push(g[name].week)

    for (const p of periods) {
      if (r.type === 'wash') { p.washCount++; p.washAmount += r.price }
      else                   { p.polishCount++; p.polishAmount += r.price }
      p.total += r.price
    }
  }

  return Object.entries(g)
    .map(([cn, v]) => ({ customerName: cn, ...v }))
    .sort((a, b) => b.month.total - a.month.total)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Total Revenue (รายรับรวม)
// ─────────────────────────────────────────────────────────────────────────────
describe('Total Revenue', () => {
  it('รวมรายรับทั้งหมดของวันนี้ถูกต้อง', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 200 }),
      makeRecord({ created_at: '2026-09-28T10:00:00', price: 350 }),
      makeRecord({ created_at: '2026-09-28T13:00:00', price: 150 }),
    ]
    expect(computeStats(records, []).todayTotalIncome).toBe(700)
  })

  it('แยก wash กับ polish ได้ถูกต้อง', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 200, type: 'wash' }),
      makeRecord({ created_at: '2026-09-28T09:00:00', price: 500, type: 'polish' }),
      makeRecord({ created_at: '2026-09-28T10:00:00', price: 200, type: 'wash' }),
    ]
    const s = computeStats(records, [])
    expect(s.washCount).toBe(2)
    expect(s.polishCount).toBe(1)
    expect(s.todayTotalIncome).toBe(900)
  })

  // ── Edge: ข้อมูลว่าง ──
  it('[]  → todayTotalIncome = 0', () => {
    expect(computeStats([], []).todayTotalIncome).toBe(0)
  })

  // ── Edge: ทศนิยม ──
  it('ราคาทศนิยม รวมถูกต้อง (floating-point aware)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 99.50 }),
      makeRecord({ created_at: '2026-09-28T09:00:00', price: 0.50 }),
    ]
    expect(computeStats(records, []).todayTotalIncome).toBeCloseTo(100, 5)
  })

  it('ไม่นับรายรับของวันก่อนหน้า', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records = [
      makeRecord({ created_at: '2026-09-26T10:00:00', price: 9999 }), // 2 วันก่อน
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 200 }),   // วันนี้
    ]
    expect(computeStats(records, []).todayTotalIncome).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. Net Profit (กำไรสุทธิ = paid - expenses)
// ─────────────────────────────────────────────────────────────────────────────
describe('Net Profit', () => {
  it('กำไรสุทธิ = paid - expense', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records  = [makeRecord({ created_at: '2026-09-28T08:00:00', price: 500, payment_status: 'paid' })]
    const expenses = [makeExpense({ created_at: '2026-09-28T09:00:00', amount: 120 })]

    expect(computeStats(records, expenses).netProfit).toBe(380)
  })

  it('มีค่าใช้จ่ายมากกว่ารายรับ → กำไรติดลบ', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records  = [makeRecord({ created_at: '2026-09-28T08:00:00', price: 100, payment_status: 'paid' })]
    const expenses = [makeExpense({ created_at: '2026-09-28T09:00:00', amount: 500 })]

    expect(computeStats(records, expenses).netProfit).toBe(-400)
  })

  // ── Edge: ค่าใช้จ่ายติดลบ (เช่น เครดิตคืน) ──
  it('ค่าใช้จ่ายติดลบ (refund) เพิ่มกำไรสุทธิ', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records  = [makeRecord({ created_at: '2026-09-28T08:00:00', price: 400, payment_status: 'paid' })]
    const expenses = [
      makeExpense({ created_at: '2026-09-28T07:00:00', amount: -50 }), // refund
    ]

    // netProfit = paid(400) - expense(-50) = 450
    expect(computeStats(records, expenses).netProfit).toBe(450)
  })

  // ── Edge: ข้อมูลว่าง ──
  it('records=[], expenses=[] → netProfit = 0', () => {
    expect(computeStats([], []).netProfit).toBe(0)
  })

  // ── Edge: ทศนิยม ──
  it('กำไรทศนิยม', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records  = [makeRecord({ created_at: '2026-09-28T08:00:00', price: 99.99, payment_status: 'paid' })]
    const expenses = [makeExpense({ created_at: '2026-09-28T07:00:00', amount: 9.99 })]

    expect(computeStats(records, expenses).netProfit).toBeCloseTo(90, 5)
  })

  it('ค่าใช้จ่ายเมื่อวาน ไม่ถูกหักออก', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records  = [makeRecord({ created_at: '2026-09-28T08:00:00', price: 300, payment_status: 'paid' })]
    const expenses = [makeExpense({ created_at: '2026-09-27T20:00:00', amount: 999 })] // เมื่อวาน

    // expense เมื่อวานไม่ถูกนับ → netProfit = 300 - 0 = 300
    expect(computeStats(records, expenses).netProfit).toBe(300)
  })

  it('unpaid ไม่ถูกนับเป็น paid', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 300, payment_status: 'paid' }),
      makeRecord({ created_at: '2026-09-28T09:00:00', price: 200, payment_status: 'unpaid' }),
    ]

    const s = computeStats(records, [])
    expect(s.todayPaid).toBe(300)
    expect(s.todayUnpaid).toBe(200)
    expect(s.netProfit).toBe(300) // netProfit = paid only
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. Day-over-Day Comparison (เปรียบเทียบเมื่อวาน)
// ─────────────────────────────────────────────────────────────────────────────
describe('Day-over-Day Comparison', () => {
  it('diffAmount และ diffPct ถูกต้อง (+20%)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    // เมื่อวาน 1000, วันนี้ 1200
    const records = [
      makeRecord({ created_at: '2026-09-27T10:00:00', price: 1000 }),
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 1200 }),
    ]
    const s = computeStats(records, [])
    expect(s.diffAmount).toBe(200)
    expect(s.diffPct).toBe(20)
    expect(s.isUp).toBe(true)
  })

  it('รายรับลดลง → isUp = false', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records = [
      makeRecord({ created_at: '2026-09-27T10:00:00', price: 1000 }),
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 600 }),
    ]
    const s = computeStats(records, [])
    expect(s.diffAmount).toBe(-400)
    expect(s.diffPct).toBe(-40)
    expect(s.isUp).toBe(false)
  })

  it('เมื่อวาน = 0 → diffPct = 0 (ไม่หารด้วยศูนย์)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records = [makeRecord({ created_at: '2026-09-28T08:00:00', price: 500 })]
    const s = computeStats(records, [])
    expect(s.diffPct).toBe(0)
    expect(s.isUp).toBe(true)
  })

  // ── Edge: diffAmount = 0 → isUp = true ──
  it('รายรับเท่ากันทั้งสองวัน → isUp = true (>= 0)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records = [
      makeRecord({ created_at: '2026-09-27T10:00:00', price: 500 }),
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 500 }),
    ]
    const s = computeStats(records, [])
    expect(s.diffAmount).toBe(0)
    expect(s.isUp).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Unpaid Balance (ยอดหนี้ค้างชำระ)
// ─────────────────────────────────────────────────────────────────────────────
describe('Unpaid Balance', () => {
  it('รวมยอดหนี้ทั้งหมดถูกต้อง', () => {
    const unpaid = [
      makeRecord({ created_at: '2026-09-25T10:00:00', price: 200, payment_status: 'unpaid' }),
      makeRecord({ created_at: '2026-09-26T10:00:00', price: 350, payment_status: 'unpaid' }),
      makeRecord({ created_at: '2026-09-27T10:00:00', price: 150, payment_status: 'unpaid' }),
    ]
    expect(totalUnpaid(unpaid)).toBe(700)
  })

  // ── Edge: ข้อมูลว่าง ──
  it('[] → 0', () => {
    expect(totalUnpaid([])).toBe(0)
  })

  // ── Edge: ทศนิยม ──
  it('ยอดหนี้ทศนิยม', () => {
    const unpaid = [
      makeRecord({ created_at: '2026-09-25T10:00:00', price: 99.99, payment_status: 'unpaid' }),
      makeRecord({ created_at: '2026-09-26T10:00:00', price: 0.01, payment_status: 'unpaid' }),
    ]
    expect(totalUnpaid(unpaid)).toBeCloseTo(100, 5)
  })

  // ── Edge: price = 0 ──
  it('price = 0 ไม่กระทบยอดรวม', () => {
    const unpaid = [
      makeRecord({ created_at: '2026-09-25T10:00:00', price: 0,   payment_status: 'unpaid' }),
      makeRecord({ created_at: '2026-09-26T10:00:00', price: 300, payment_status: 'unpaid' }),
    ]
    expect(totalUnpaid(unpaid)).toBe(300)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. Grouped Unpaid (จัดกลุ่มหนี้ตามลูกค้า)
// ─────────────────────────────────────────────────────────────────────────────
describe('Grouped Unpaid', () => {
  it('จัดกลุ่มและรวมยอดต่อลูกค้าถูกต้อง', () => {
    const records = [
      makeRecord({ created_at: '2026-09-25T10:00:00', price: 200, payment_status: 'unpaid', customer_name: 'เต็นท์ A' }),
      makeRecord({ created_at: '2026-09-26T10:00:00', price: 300, payment_status: 'unpaid', customer_name: 'เต็นท์ A' }),
      makeRecord({ created_at: '2026-09-27T10:00:00', price: 150, payment_status: 'unpaid', customer_name: 'เต็นท์ B' }),
    ]
    const grouped = groupUnpaid(records)

    expect(grouped).toHaveLength(2)
    expect(grouped[0].customerName).toBe('เต็นท์ A') // ยอดสูงสุดอยู่ก่อน
    expect(grouped[0].total).toBe(500)
    expect(grouped[1].customerName).toBe('เต็นท์ B')
    expect(grouped[1].total).toBe(150)
  })

  // ── Edge: customer_name = undefined / '' ──
  it('customer_name undefined → default name', () => {
    const records = [
      makeRecord({ created_at: '2026-09-25T10:00:00', price: 100, payment_status: 'unpaid' }),
    ]
    const grouped = groupUnpaid(records)
    expect(grouped[0].customerName).toBe(DEFAULT_CUSTOMER_NAME_UNPAID)
  })

  it('customer_name = "" (empty string) → default name', () => {
    const records = [
      makeRecord({ created_at: '2026-09-25T10:00:00', price: 100, payment_status: 'unpaid', customer_name: '' }),
    ]
    const grouped = groupUnpaid(records)
    expect(grouped[0].customerName).toBe(DEFAULT_CUSTOMER_NAME_UNPAID)
  })

  it('customer_name = "   " (whitespace only) → default name', () => {
    const records = [
      makeRecord({ created_at: '2026-09-25T10:00:00', price: 100, payment_status: 'unpaid', customer_name: '   ' }),
    ]
    const grouped = groupUnpaid(records)
    expect(grouped[0].customerName).toBe(DEFAULT_CUSTOMER_NAME_UNPAID)
  })

  // ── Edge: ข้อมูลว่าง ──
  it('[] → []', () => {
    expect(groupUnpaid([])).toHaveLength(0)
  })

  it('เรียงตาม total สูงไปต่ำ', () => {
    const records = [
      makeRecord({ created_at: '2026-09-25T10:00:00', price: 100, payment_status: 'unpaid', customer_name: 'น้อย' }),
      makeRecord({ created_at: '2026-09-26T10:00:00', price: 500, payment_status: 'unpaid', customer_name: 'มาก' }),
      makeRecord({ created_at: '2026-09-27T10:00:00', price: 300, payment_status: 'unpaid', customer_name: 'กลาง' }),
    ]
    const grouped = groupUnpaid(records)
    expect(grouped.map(g => g.customerName)).toEqual(['มาก', 'กลาง', 'น้อย'])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. Customer Breakdown (สรุปรายลูกค้า แยก week/month/year)
// ─────────────────────────────────────────────────────────────────────────────
describe('Customer Breakdown', () => {
  it('record ปัจจุบัน → นับใน week, month, year ทั้งหมด', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-30T15:00:00')) // Wednesday

    const records = [
      makeRecord({ created_at: '2026-09-30T08:00:00', price: 200, type: 'wash', customer_name: 'A' }),
    ]
    const bd = computeBreakdown(records)

    expect(bd[0].week.total).toBe(200)
    expect(bd[0].month.total).toBe(200)
    expect(bd[0].year.total).toBe(200)
  })

  it('record เดือนนี้แต่ไม่ใช่สัปดาห์นี้ → นับใน month, year เท่านั้น', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-30T15:00:00')) // week starts Sept 28

    const records = [
      makeRecord({ created_at: '2026-09-15T08:00:00', price: 300, customer_name: 'A' }),
    ]
    const bd = computeBreakdown(records)

    expect(bd[0].week.total).toBe(0)
    expect(bd[0].month.total).toBe(300)
    expect(bd[0].year.total).toBe(300)
  })

  it('record ปีนี้แต่ไม่ใช่เดือนนี้ → นับเฉพาะ year', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records = [
      makeRecord({ created_at: '2026-03-01T08:00:00', price: 400, customer_name: 'A' }),
    ]
    const bd = computeBreakdown(records)

    expect(bd[0].week.total).toBe(0)
    expect(bd[0].month.total).toBe(0)
    expect(bd[0].year.total).toBe(400)
  })

  // ── Edge: record ก่อนต้นปี → ไม่ถูกนับ ──
  it('record ก่อน Jan 1 ของปีนี้ → ไม่ถูกนับ', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records = [
      makeRecord({ created_at: '2025-12-31T23:59:59', price: 9999, customer_name: 'A' }),
    ]
    expect(computeBreakdown(records)).toHaveLength(0)
  })

  // ── Edge: ข้อมูลว่าง ──
  it('[] → []', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))
    expect(computeBreakdown([])).toHaveLength(0)
  })

  // ── Edge: customer_name = undefined → DEFAULT_CUSTOMER_NAME ──
  it('ไม่มีชื่อ → DEFAULT_CUSTOMER_NAME', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records = [makeRecord({ created_at: '2026-09-28T08:00:00', price: 100 })]
    const bd = computeBreakdown(records)
    expect(bd[0].customerName).toBe(DEFAULT_CUSTOMER_NAME)
  })

  it('นับ wash และ polish แยกกัน', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 200, type: 'wash',   customer_name: 'A' }),
      makeRecord({ created_at: '2026-09-28T09:00:00', price: 500, type: 'polish', customer_name: 'A' }),
    ]
    const bd = computeBreakdown(records)

    expect(bd[0].year.washCount).toBe(1)
    expect(bd[0].year.washAmount).toBe(200)
    expect(bd[0].year.polishCount).toBe(1)
    expect(bd[0].year.polishAmount).toBe(500)
    expect(bd[0].year.total).toBe(700)
  })

  it('เรียง sort ตาม month.total สูงสุดก่อน', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 100, customer_name: 'น้อย' }),
      makeRecord({ created_at: '2026-09-28T09:00:00', price: 900, customer_name: 'มาก' }),
    ]
    const bd = computeBreakdown(records)
    expect(bd[0].customerName).toBe('มาก')
    expect(bd[1].customerName).toBe('น้อย')
  })

  // ── Edge: ทศนิยม ──
  it('ราคาทศนิยม รวมถูกต้อง', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T15:00:00'))

    const records = [
      makeRecord({ created_at: '2026-09-28T08:00:00', price: 99.75, customer_name: 'A' }),
      makeRecord({ created_at: '2026-09-28T09:00:00', price: 0.25,  customer_name: 'A' }),
    ]
    const bd = computeBreakdown(records)
    expect(bd[0].year.total).toBeCloseTo(100, 5)
  })
})
