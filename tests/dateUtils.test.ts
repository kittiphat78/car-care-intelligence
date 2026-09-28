/**
 * tests/dateUtils.test.ts
 *
 * ครอบคลุมทุกฟังก์ชันใน lib/dateUtils.ts
 * รัน: npx vitest run tests/dateUtils.test.ts
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  getStartOfDay,
  getStartOfYesterday,
  getDaysAgo,
  getStartOfWeek,
  getStartOfMonth,
  getStartOfYear,
  getYearsAgo,
  parseDateMs,
  splitDateTime,
  mergeDateTime,
} from '@/lib/dateUtils'

// คืนเวลาจริงหลังแต่ละ test
afterEach(() => {
  vi.useRealTimers()
})

// ─────────────────────────────────────────────────────────────────────────────
// getStartOfDay
// ─────────────────────────────────────────────────────────────────────────────
describe('getStartOfDay', () => {
  it('ตัดเวลาเป็น 00:00:00.000 สำหรับวันที่กำหนด', () => {
    const input = new Date('2026-09-28T14:35:22.500')
    const result = getStartOfDay(input)

    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
    expect(result.getDate()).toBe(28)
    expect(result.getMonth()).toBe(8) // September
  })

  it('ไม่กลายพันธุ์ (mutate) วันที่ต้นฉบับ', () => {
    const original = new Date('2026-06-15T10:30:00')
    const before = original.getTime()
    getStartOfDay(original)
    expect(original.getTime()).toBe(before)
  })

  it('คืน start of today เมื่อไม่ส่ง argument', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T18:45:00'))

    const result = getStartOfDay()
    expect(result.getDate()).toBe(28)
    expect(result.getMonth()).toBe(8)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getHours()).toBe(0)
  })

  // ── Edge: รอยต่อเที่ยงคืน ──
  it('23:59:59.999 ยังอยู่ในวันเดิม ไม่ข้ามไปวันถัดไป', () => {
    const almostMidnight = new Date('2026-03-31T23:59:59.999')
    const result = getStartOfDay(almostMidnight)

    expect(result.getDate()).toBe(31)   // ยังเป็นวันที่ 31
    expect(result.getMonth()).toBe(2)   // March
    expect(result.getHours()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  it('00:00:00.000 คืนค่าเหมือนเดิม', () => {
    const midnight = new Date('2026-09-01T00:00:00.000')
    const result = getStartOfDay(midnight)
    expect(result.getTime()).toBe(midnight.getTime())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getStartOfYesterday
// ─────────────────────────────────────────────────────────────────────────────
describe('getStartOfYesterday', () => {
  it('ห่างจาก start of today เท่ากับ 1 วัน (86400000 ms)', () => {
    const today = getStartOfDay()
    const yesterday = getStartOfYesterday()
    expect(today.getTime() - yesterday.getTime()).toBe(86_400_000)
  })

  // ── Edge: ข้ามเดือน ──
  it('วันที่ 1 มีนาคม → 28/29 กุมภาพันธ์', () => {
    vi.useFakeTimers()

    // 2026 ไม่ใช่ปีอธิกสุรทิน → Feb มี 28 วัน
    vi.setSystemTime(new Date('2026-03-01T09:00:00'))
    let y = getStartOfYesterday()
    expect(y.getMonth()).toBe(1)  // February
    expect(y.getDate()).toBe(28)
    vi.useRealTimers()

    // 2028 เป็นปีอธิกสุรทิน → Feb มี 29 วัน
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2028-03-01T09:00:00'))
    y = getStartOfYesterday()
    expect(y.getMonth()).toBe(1)  // February
    expect(y.getDate()).toBe(29)
  })

  // ── Edge: ข้ามปี ──
  it('1 มกราคม → 31 ธันวาคมของปีก่อน', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-01-01T00:00:01'))

    const y = getStartOfYesterday()
    expect(y.getFullYear()).toBe(2026)
    expect(y.getMonth()).toBe(11) // December
    expect(y.getDate()).toBe(31)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getDaysAgo
// ─────────────────────────────────────────────────────────────────────────────
describe('getDaysAgo', () => {
  it('n=0 คืน start of today', () => {
    const today = getStartOfDay()
    expect(getDaysAgo(0).getTime()).toBe(today.getTime())
  })

  it('n=7 ห่าง 7 วัน', () => {
    const today = getStartOfDay()
    const diff = Math.round((today.getTime() - getDaysAgo(7).getTime()) / 86_400_000)
    expect(diff).toBe(7)
  })

  it('n=365 ห่าง 365 วัน', () => {
    const today = getStartOfDay()
    const diff = Math.round((today.getTime() - getDaysAgo(365).getTime()) / 86_400_000)
    expect(diff).toBe(365)
  })

  // ── Edge: ข้ามเดือน ──
  it('กลับข้ามเดือนได้ถูกต้อง', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-05T12:00:00'))

    const result = getDaysAgo(10) // → 23 กุมภาพันธ์
    expect(result.getMonth()).toBe(1) // February
    expect(result.getDate()).toBe(23)
  })

  // ── Edge: ข้ามปี ──
  it('กลับข้ามปีได้ถูกต้อง', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-05T12:00:00'))

    const result = getDaysAgo(10) // → 26 ธันวาคม 2025
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(11) // December
    expect(result.getDate()).toBe(26)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getStartOfWeek (Monday = วันแรกของสัปดาห์)
// ─────────────────────────────────────────────────────────────────────────────
describe('getStartOfWeek', () => {
  it('วันพุธ → วันจันทร์ต้นสัปดาห์', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-30T14:00:00')) // Wednesday

    const w = getStartOfWeek()
    expect(w.getDay()).toBe(1)   // Monday
    expect(w.getDate()).toBe(28) // Sept 28
  })

  it('วันจันทร์ → คืนตัวเอง', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T09:00:00')) // Monday

    const w = getStartOfWeek()
    expect(w.getDay()).toBe(1)
    expect(w.getDate()).toBe(28)
  })

  it('วันอาทิตย์ → วันจันทร์ก่อนหน้า', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-04T09:00:00')) // Sunday

    const w = getStartOfWeek()
    expect(w.getDay()).toBe(1)
    expect(w.getDate()).toBe(28)
    expect(w.getMonth()).toBe(8) // September
  })

  // ── Edge: ข้ามเดือน ──
  it('ต้นสัปดาห์อยู่ในเดือนก่อนหน้า', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-01T12:00:00')) // Thursday Oct 1

    const w = getStartOfWeek()
    expect(w.getMonth()).toBe(8) // September
    expect(w.getDate()).toBe(28)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getStartOfMonth
// ─────────────────────────────────────────────────────────────────────────────
describe('getStartOfMonth', () => {
  it('คืนวันที่ 1 ของเดือนปัจจุบัน เวลา 00:00', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-15T18:30:00'))

    const m = getStartOfMonth()
    expect(m.getDate()).toBe(1)
    expect(m.getMonth()).toBe(8) // September
    expect(m.getHours()).toBe(0)
  })

  // ── Edge: วันสิ้นเดือน ──
  it('วันที่ 31 มกราคม → วันที่ 1 มกราคมเดียวกัน', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-31T23:59:59'))

    const m = getStartOfMonth()
    expect(m.getDate()).toBe(1)
    expect(m.getMonth()).toBe(0) // January
    expect(m.getFullYear()).toBe(2026)
  })

  it('เรียกตอนวันที่ 1 ได้ผลเหมือนเดิม', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-01T00:00:00'))

    const m = getStartOfMonth()
    expect(m.getDate()).toBe(1)
    expect(m.getMonth()).toBe(8)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getStartOfYear
// ─────────────────────────────────────────────────────────────────────────────
describe('getStartOfYear', () => {
  it('คืน 1 มกราคม 00:00 ของปีปัจจุบัน', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T14:00:00'))

    const y = getStartOfYear()
    expect(y.getMonth()).toBe(0)    // January
    expect(y.getDate()).toBe(1)
    expect(y.getFullYear()).toBe(2026)
    expect(y.getHours()).toBe(0)
  })

  // ── Edge: เรียกวันที่ 31 ธันวาคม ──
  it('31 ธันวาคม → ยังคืน 1 มกราคมของปีเดียวกัน', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-31T23:59:59'))

    const y = getStartOfYear()
    expect(y.getMonth()).toBe(0)
    expect(y.getDate()).toBe(1)
    expect(y.getFullYear()).toBe(2026)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getYearsAgo
// ─────────────────────────────────────────────────────────────────────────────
describe('getYearsAgo', () => {
  it('n=1 คืนวันเดียวกันของปีก่อน', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T12:00:00'))

    const y = getYearsAgo(1)
    expect(y.getFullYear()).toBe(2025)
    expect(y.getMonth()).toBe(8) // September
    expect(y.getDate()).toBe(28)
    expect(y.getHours()).toBe(0)
  })

  it('n=0 คืน start of today', () => {
    const today = getStartOfDay()
    expect(getYearsAgo(0).getTime()).toBe(today.getTime())
  })

  // ── Edge: ปีอธิกสุรทิน Feb 29 → JS rolls to Mar 1 ──
  it('29 กุมภาพันธ์ ปีอธิกสุรทิน ย้อนกลับ 1 ปี → JS เลื่อนเป็น 1 มีนาคม', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2028-02-29T12:00:00')) // 2028 = leap year

    const y = getYearsAgo(1) // ปีเป้าหมาย 2027 ไม่มี Feb 29
    expect(y.getFullYear()).toBe(2027)
    // JS Date.setFullYear rolls forward: Feb 29 → Mar 1
    expect(y.getMonth()).toBe(2)  // March
    expect(y.getDate()).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// parseDateMs
// ─────────────────────────────────────────────────────────────────────────────
describe('parseDateMs', () => {
  it('แปลง ISO string เป็น milliseconds ตรงกับ Date.parse', () => {
    const iso = '2026-09-28T10:00:00.000Z'
    expect(parseDateMs(iso)).toBe(Date.parse(iso))
  })

  it('รองรับ timezone offset', () => {
    const iso = '2026-09-28T10:00:00+07:00'
    expect(parseDateMs(iso)).toBe(Date.parse(iso))
  })

  it('คืน NaN เมื่อ string ไม่ถูกต้อง', () => {
    expect(parseDateMs('not-a-date')).toBeNaN()
    expect(parseDateMs('')).toBeNaN()
  })

  it('รองรับ date-only string (YYYY-MM-DD)', () => {
    const s = '2026-09-28'
    expect(parseDateMs(s)).toBe(Date.parse(s))
  })

  // ── Edge: รอยต่อเที่ยงคืน UTC ──
  it('รอยต่อเที่ยงคืน 23:59:59.999 ≠ 00:00:00.000 ของวันถัดไป', () => {
    const ms1 = parseDateMs('2026-09-28T23:59:59.999Z')
    const ms2 = parseDateMs('2026-09-29T00:00:00.000Z')
    expect(ms2 - ms1).toBe(1) // ห่างกัน 1 ms
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// splitDateTime
// ─────────────────────────────────────────────────────────────────────────────
describe('splitDateTime', () => {
  it('แยก ISO string เป็น date และ time', () => {
    const d = new Date(2026, 8, 28, 14, 30, 0) // local 14:30
    const { date, time } = splitDateTime(d.toISOString())

    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(time).toBe('14:30')
  })

  it('เติม 0 นำหน้าสำหรับชั่วโมง/นาทีหลักเดียว', () => {
    const d = new Date(2026, 8, 28, 3, 5, 0) // local 03:05
    const { time } = splitDateTime(d.toISOString())
    expect(time).toBe('03:05')
  })

  // ── Edge: เที่ยงคืน ──
  it('เที่ยงคืน 00:00 แยกถูกต้อง', () => {
    const d = new Date(2026, 8, 28, 0, 0, 0)
    const { time } = splitDateTime(d.toISOString())
    expect(time).toBe('00:00')
  })

  it('23:59 แยกถูกต้อง', () => {
    const d = new Date(2026, 8, 28, 23, 59, 0)
    const { time } = splitDateTime(d.toISOString())
    expect(time).toBe('23:59')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// mergeDateTime
// ─────────────────────────────────────────────────────────────────────────────
describe('mergeDateTime', () => {
  it('รวม date + time เป็น ISO string ที่ valid', () => {
    const iso = mergeDateTime('2026-09-28', '14:30')
    const d = new Date(iso)

    expect(d.getHours()).toBe(14)
    expect(d.getMinutes()).toBe(30)
    expect(d.getSeconds()).toBe(0)
  })

  it('round-trip กับ splitDateTime', () => {
    const dateStr = '2026-09-28'
    const timeStr = '09:15'
    const merged = mergeDateTime(dateStr, timeStr)
    const { time } = splitDateTime(merged)
    expect(time).toBe(timeStr)
  })

  // ── Edge: เที่ยงคืน ──
  it('00:00 → เที่ยงคืน', () => {
    const d = new Date(mergeDateTime('2026-09-28', '00:00'))
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
  })

  it('23:59 → ก่อนเที่ยงคืน 1 นาที', () => {
    const d = new Date(mergeDateTime('2026-09-28', '23:59'))
    expect(d.getHours()).toBe(23)
    expect(d.getMinutes()).toBe(59)
  })

  // ── Edge: วันสิ้นเดือน / เปลี่ยนปี ──
  it('วันที่ 31 ธันวาคม 23:59 ไม่ข้ามไปปีถัดไป', () => {
    const d = new Date(mergeDateTime('2026-12-31', '23:59'))
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(11) // December
    expect(d.getDate()).toBe(31)
  })
})
