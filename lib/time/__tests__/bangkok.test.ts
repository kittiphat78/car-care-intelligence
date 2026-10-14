/**
 * Asia/Bangkok calendar helpers must give the same answer on every device (ER-10, ER-11).
 * Each case runs with the device time zone set to Bangkok, UTC and New York.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  addDays,
  bangkokMonthRange,
  bangkokParts,
  bangkokTimestampOn,
  bangkokToday,
  bangkokYearRange,
  daysBetween,
  formatBangkok,
  joinBangkok,
  splitBangkok,
  startOfBangkokDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toBangkokDay,
  yearsBefore,
} from '@/lib/time/bangkok'
import {
  getDaysAgo,
  getStartOfDay,
  getStartOfMonth,
  getStartOfWeek,
  getStartOfYear,
  getStartOfYesterday,
  getYearsAgo,
} from '@/lib/dateUtils'

const ORIGINAL_TZ = process.env.TZ

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ
  vi.useRealTimers()
})

const iso = (bangkokWallClock: string) => new Date(`${bangkokWallClock}+07:00`).toISOString()

describe.each(['Asia/Bangkok', 'UTC', 'America/New_York'])('device TZ=%s', (tz) => {
  const setTz = () => { process.env.TZ = tz }

  it.each([
    ['2026-10-14T00:00:00', '2026-10-14', 0],
    ['2026-10-14T06:59:59', '2026-10-14', 6],
    ['2026-10-14T07:00:00', '2026-10-14', 7],
    ['2026-10-14T23:59:59', '2026-10-14', 23],
    ['2027-01-01T00:30:00', '2027-01-01', 0],
  ])('%s Bangkok falls on %s', (wall, day, hour) => {
    setTz()
    expect(toBangkokDay(iso(wall))).toBe(day)
    expect(bangkokParts(iso(wall)).hour).toBe(hour)
  })

  it('today follows the Bangkok calendar, not the device', () => {
    setTz()
    // 2026-10-14 01:00 Bangkok is still 13 Oct in UTC and New York
    expect(bangkokToday(new Date(iso('2026-10-14T01:00:00')))).toBe('2026-10-14')
  })

  it('a day starts at 00:00 Bangkok (17:00 UTC the day before)', () => {
    setTz()
    expect(startOfBangkokDay('2026-10-14').toISOString()).toBe('2026-10-13T17:00:00.000Z')
  })

  it('month and year ranges cover whole Bangkok periods', () => {
    setTz()
    expect(bangkokMonthRange(2026, 12)).toEqual({
      start: new Date('2026-11-30T17:00:00.000Z'),
      end: new Date('2026-12-31T17:00:00.000Z'),
    })
    expect(bangkokYearRange(2026)).toEqual({
      start: new Date('2025-12-31T17:00:00.000Z'),
      end: new Date('2026-12-31T17:00:00.000Z'),
    })
  })

  it('a date filter from/to includes 00:00–06:59 of the first day (ER-10)', () => {
    setTz()
    const from = startOfBangkokDay('2026-10-14').getTime()
    const to = startOfBangkokDay(addDays('2026-10-14', 1)).getTime() - 1
    for (const wall of ['2026-10-14T00:00:00', '2026-10-14T06:59:00', '2026-10-14T23:59:59']) {
      const t = Date.parse(iso(wall))
      expect(t >= from && t <= to).toBe(true)
    }
    expect(Date.parse(iso('2026-10-15T00:00:00')) <= to).toBe(false)
    expect(Date.parse(iso('2026-10-13T23:59:59')) >= from).toBe(false)
  })

  it('split and join round-trip form fields', () => {
    setTz()
    const stored = iso('2026-10-14T03:30:00')
    expect(splitBangkok(stored)).toEqual({ date: '2026-10-14', time: '03:30' })
    expect(joinBangkok('2026-10-14', '03:30')).toBe(stored)
  })

  it('a new record dated another day keeps the current Bangkok time of day', () => {
    setTz()
    const now = new Date(iso('2026-10-14T23:30:15.678'))
    expect(bangkokTimestampOn('2026-10-10', now)).toBe(iso('2026-10-10T23:30:15'))
    expect(bangkokTimestampOn('2026-10-14', new Date(iso('2026-10-14T02:05:09')))).toBe(iso('2026-10-14T02:05:09'))
  })

  it('formats in Bangkok time', () => {
    setTz()
    expect(formatBangkok(iso('2026-10-14T00:30:00'), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, 'en-GB')).toBe('00:30')
    expect(formatBangkok(iso('2026-10-14T00:30:00'), { day: 'numeric' }, 'en-GB')).toBe('14')
  })

  it('dateUtils boundaries are Bangkok periods (ER-11)', () => {
    setTz()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(iso('2026-10-14T03:00:00'))) // Wednesday
    expect(getStartOfDay().toISOString()).toBe(iso('2026-10-14T00:00:00'))
    expect(getStartOfYesterday().toISOString()).toBe(iso('2026-10-13T00:00:00'))
    expect(getDaysAgo(30).toISOString()).toBe(iso('2026-09-14T00:00:00'))
    expect(getStartOfWeek().toISOString()).toBe(iso('2026-10-12T00:00:00'))
    expect(getStartOfMonth().toISOString()).toBe(iso('2026-10-01T00:00:00'))
    expect(getStartOfYear().toISOString()).toBe(iso('2026-01-01T00:00:00'))
    expect(getYearsAgo(1).toISOString()).toBe(iso('2025-10-14T00:00:00'))
  })
})

describe('calendar arithmetic', () => {
  it('adds days across month, year and leap-day boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-10-14', -29)).toBe('2026-09-15')
  })

  it('counts whole days between two days', () => {
    expect(daysBetween('2026-10-01', '2026-10-14')).toBe(13)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
    expect(daysBetween('2026-10-14', '2026-10-14')).toBe(0)
    expect(daysBetween('2026-10-14', '2026-10-10')).toBe(-4)
  })

  it('weeks start on Monday', () => {
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12') // Monday
    expect(startOfWeek('2026-10-14')).toBe('2026-10-12') // Wednesday
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12') // Sunday
    expect(startOfWeek('2027-01-01')).toBe('2026-12-28') // Friday across the year
  })

  it('month and year starts', () => {
    expect(startOfMonth('2026-10-14')).toBe('2026-10-01')
    expect(startOfYear('2026-10-14')).toBe('2026-01-01')
  })

  it('years before keeps the date and rolls 29 Feb to 1 Mar', () => {
    expect(yearsBefore('2026-10-14', 1)).toBe('2025-10-14')
    expect(yearsBefore('2028-02-29', 1)).toBe('2027-03-01')
  })

  it('rejects malformed days', () => {
    expect(() => addDays('14/10/2026', 1)).toThrow(RangeError)
    expect(() => startOfBangkokDay('2026-1-4')).toThrow(RangeError)
  })
})
