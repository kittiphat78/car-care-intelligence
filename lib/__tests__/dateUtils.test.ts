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
} from '../dateUtils'

afterEach(() => {
  vi.useRealTimers()
})

// ─── getStartOfDay ──────────────────────────────────────────────────────────

describe('getStartOfDay', () => {
  it('sets time to 00:00:00.000 for a given date', () => {
    const d = new Date('2026-09-28T14:35:22.500')
    const start = getStartOfDay(d)
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getSeconds()).toBe(0)
    expect(start.getMilliseconds()).toBe(0)
  })

  it('returns start of today when no argument is given', () => {
    const start = getStartOfDay()
    const now = new Date()
    expect(start.getFullYear()).toBe(now.getFullYear())
    expect(start.getMonth()).toBe(now.getMonth())
    expect(start.getDate()).toBe(now.getDate())
    expect(start.getHours()).toBe(0)
  })

  it('does NOT mutate the original date', () => {
    const original = new Date('2026-06-15T10:30:00')
    const originalTime = original.getTime()
    getStartOfDay(original)
    expect(original.getTime()).toBe(originalTime)
  })

  it('handles midnight boundary (23:59:59.999)', () => {
    const almostMidnight = new Date('2026-03-15T23:59:59.999')
    const start = getStartOfDay(almostMidnight)
    expect(start.getDate()).toBe(15)
    expect(start.getHours()).toBe(0)
    expect(start.getMilliseconds()).toBe(0)
  })

  it('handles exactly midnight (00:00:00.000)', () => {
    const midnight = new Date('2026-03-15T00:00:00.000')
    const start = getStartOfDay(midnight)
    expect(start.getTime()).toBe(midnight.getTime())
  })
})

// ─── getStartOfYesterday ────────────────────────────────────────────────────

describe('getStartOfYesterday', () => {
  it('returns exactly 1 day before start of today', () => {
    const today = getStartOfDay()
    const yesterday = getStartOfYesterday()
    const diffMs = today.getTime() - yesterday.getTime()
    expect(diffMs).toBe(24 * 60 * 60 * 1000)
  })

  it('crosses month boundary correctly (March 1 → Feb 28/29)', () => {
    // Fake "today" as March 1, 2026
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-01T10:00:00'))

    const yesterday = getStartOfYesterday()
    expect(yesterday.getMonth()).toBe(1) // February
    expect(yesterday.getDate()).toBe(28) // 2026 is not a leap year
  })

  it('crosses month boundary in leap year (March 1, 2028 → Feb 29)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2028-03-01T10:00:00'))

    const yesterday = getStartOfYesterday()
    expect(yesterday.getMonth()).toBe(1) // February
    expect(yesterday.getDate()).toBe(29) // 2028 IS a leap year
  })

  it('crosses year boundary (Jan 1 → Dec 31)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-01-01T15:00:00'))

    const yesterday = getStartOfYesterday()
    expect(yesterday.getFullYear()).toBe(2026)
    expect(yesterday.getMonth()).toBe(11) // December
    expect(yesterday.getDate()).toBe(31)
  })
})

// ─── getDaysAgo ─────────────────────────────────────────────────────────────

describe('getDaysAgo', () => {
  it('calculates correct day offset for 5 days', () => {
    const today = getStartOfDay()
    const fiveDaysAgo = getDaysAgo(5)
    const diffDays = Math.round((today.getTime() - fiveDaysAgo.getTime()) / (24 * 60 * 60 * 1000))
    expect(diffDays).toBe(5)
  })

  it('returns start of today when n = 0', () => {
    const today = getStartOfDay()
    const zeroDaysAgo = getDaysAgo(0)
    expect(zeroDaysAgo.getTime()).toBe(today.getTime())
  })

  it('handles large offsets (365 days)', () => {
    const today = getStartOfDay()
    const yearAgo = getDaysAgo(365)
    const diffDays = Math.round((today.getTime() - yearAgo.getTime()) / (24 * 60 * 60 * 1000))
    expect(diffDays).toBe(365)
  })

  it('crosses month boundary correctly', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-05T12:00:00'))

    const tenDaysAgo = getDaysAgo(10)
    expect(tenDaysAgo.getMonth()).toBe(1) // February
    expect(tenDaysAgo.getDate()).toBe(23)
  })
})

// ─── getStartOfWeek ─────────────────────────────────────────────────────────

describe('getStartOfWeek', () => {
  it('returns Monday for a mid-week date (Wednesday)', () => {
    vi.useFakeTimers()
    // 2026-09-30 is a Wednesday
    vi.setSystemTime(new Date('2026-09-30T14:00:00'))

    const weekStart = getStartOfWeek()
    expect(weekStart.getDay()).toBe(1) // Monday
    expect(weekStart.getDate()).toBe(28) // Monday Sept 28
    expect(weekStart.getHours()).toBe(0)
  })

  it('returns the same day if today is Monday', () => {
    vi.useFakeTimers()
    // 2026-09-28 is a Monday
    vi.setSystemTime(new Date('2026-09-28T09:00:00'))

    const weekStart = getStartOfWeek()
    expect(weekStart.getDate()).toBe(28)
    expect(weekStart.getDay()).toBe(1) // Monday
  })

  it('returns previous Monday if today is Sunday', () => {
    vi.useFakeTimers()
    // 2026-10-04 is a Sunday
    vi.setSystemTime(new Date('2026-10-04T09:00:00'))

    const weekStart = getStartOfWeek()
    expect(weekStart.getDay()).toBe(1) // Monday
    expect(weekStart.getDate()).toBe(28) // Sept 28 (previous Monday)
    expect(weekStart.getMonth()).toBe(8) // September
  })

  it('crosses month boundary (week starting in previous month)', () => {
    vi.useFakeTimers()
    // 2026-10-01 is a Thursday → Monday is Sept 28
    vi.setSystemTime(new Date('2026-10-01T12:00:00'))

    const weekStart = getStartOfWeek()
    expect(weekStart.getMonth()).toBe(8) // September
    expect(weekStart.getDate()).toBe(28)
  })
})

// ─── getStartOfMonth ────────────────────────────────────────────────────────

describe('getStartOfMonth', () => {
  it('returns the 1st of the current month at 00:00', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-15T18:30:00'))

    const monthStart = getStartOfMonth()
    expect(monthStart.getDate()).toBe(1)
    expect(monthStart.getMonth()).toBe(8) // September
    expect(monthStart.getHours()).toBe(0)
  })

  it('returns itself when called on the 1st', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-01T00:00:00'))

    const monthStart = getStartOfMonth()
    expect(monthStart.getDate()).toBe(1)
    expect(monthStart.getMonth()).toBe(8)
  })

  it('handles end of month (31st)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-31T23:59:59'))

    const monthStart = getStartOfMonth()
    expect(monthStart.getDate()).toBe(1)
    expect(monthStart.getMonth()).toBe(0) // January
  })
})

// ─── getStartOfYear ─────────────────────────────────────────────────────────

describe('getStartOfYear', () => {
  it('returns January 1st at 00:00', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T14:00:00'))

    const yearStart = getStartOfYear()
    expect(yearStart.getMonth()).toBe(0) // January
    expect(yearStart.getDate()).toBe(1)
    expect(yearStart.getFullYear()).toBe(2026)
    expect(yearStart.getHours()).toBe(0)
  })

  it('returns Jan 1st when already on Jan 1st', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00'))

    const yearStart = getStartOfYear()
    expect(yearStart.getMonth()).toBe(0)
    expect(yearStart.getDate()).toBe(1)
  })
})

// ─── getYearsAgo ────────────────────────────────────────────────────────────

describe('getYearsAgo', () => {
  it('returns 1 year ago at start of day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T12:00:00'))

    const oneYearAgo = getYearsAgo(1)
    expect(oneYearAgo.getFullYear()).toBe(2025)
    expect(oneYearAgo.getMonth()).toBe(8)  // September
    expect(oneYearAgo.getDate()).toBe(28)
    expect(oneYearAgo.getHours()).toBe(0)
  })

  it('handles leap year edge case (Feb 29 → Mar 1 in non-leap year)', () => {
    vi.useFakeTimers()
    // 2028 is a leap year; go back 1 year to 2027 (not a leap year)
    vi.setSystemTime(new Date('2028-02-29T12:00:00'))

    const oneYearAgo = getYearsAgo(1)
    expect(oneYearAgo.getFullYear()).toBe(2027)
    // JavaScript Date.setFullYear rolls Feb 29 → Mar 1 for non-leap years
    expect(oneYearAgo.getMonth()).toBe(2) // March (JS rolls forward)
    expect(oneYearAgo.getDate()).toBe(1)
  })

  it('returns start of today when n = 0', () => {
    const today = getStartOfDay()
    const zeroYearsAgo = getYearsAgo(0)
    expect(zeroYearsAgo.getTime()).toBe(today.getTime())
  })
})

// ─── parseDateMs ────────────────────────────────────────────────────────────

describe('parseDateMs', () => {
  it('parses ISO strings accurately', () => {
    const iso = '2026-09-28T10:00:00.000Z'
    expect(parseDateMs(iso)).toBe(Date.parse(iso))
  })

  it('parses ISO strings with timezone offset', () => {
    const iso = '2026-09-28T10:00:00+07:00'
    expect(parseDateMs(iso)).toBe(Date.parse(iso))
  })

  it('returns NaN for invalid strings', () => {
    expect(parseDateMs('not-a-date')).toBeNaN()
  })

  it('handles date-only strings', () => {
    const dateOnly = '2026-09-28'
    expect(parseDateMs(dateOnly)).toBe(Date.parse(dateOnly))
  })
})

// ─── splitDateTime ──────────────────────────────────────────────────────────

describe('splitDateTime', () => {
  it('splits a UTC ISO string into date and local time', () => {
    const iso = new Date('2026-09-28T14:30:00').toISOString()
    const result = splitDateTime(iso)
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.time).toMatch(/^\d{2}:\d{2}$/)
  })

  it('pads single-digit hours and minutes', () => {
    // Create a date at 03:05 local time
    const d = new Date(2026, 8, 28, 3, 5, 0) // Sept 28, 03:05
    const result = splitDateTime(d.toISOString())
    expect(result.time).toBe('03:05')
  })

  it('handles midnight correctly', () => {
    const d = new Date(2026, 8, 28, 0, 0, 0)
    const result = splitDateTime(d.toISOString())
    expect(result.time).toBe('00:00')
  })
})

// ─── mergeDateTime ──────────────────────────────────────────────────────────

describe('mergeDateTime', () => {
  it('merges date and time into a valid ISO string', () => {
    const result = mergeDateTime('2026-09-28', '14:30')
    expect(new Date(result).getHours()).toBe(14)
    expect(new Date(result).getMinutes()).toBe(30)
  })

  it('handles midnight time', () => {
    const result = mergeDateTime('2026-09-28', '00:00')
    const d = new Date(result)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
  })

  it('handles end-of-day time (23:59)', () => {
    const result = mergeDateTime('2026-09-28', '23:59')
    const d = new Date(result)
    expect(d.getHours()).toBe(23)
    expect(d.getMinutes()).toBe(59)
  })

  it('round-trips with splitDateTime', () => {
    const dateStr = '2026-09-28'
    const timeStr = '14:30'
    const merged = mergeDateTime(dateStr, timeStr)
    const split = splitDateTime(merged)
    expect(split.time).toBe(timeStr)
  })
})
