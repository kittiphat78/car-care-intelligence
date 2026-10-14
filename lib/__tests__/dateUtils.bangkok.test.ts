/**
 * Regression tests for ER-01: editing a record created between 00:00 and 06:59
 * Asia/Bangkok moved created_at back one day, because splitDateTime took the
 * calendar date from UTC and the hour from local time.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { splitDateTime, mergeDateTime, resolveCreatedAt } from '@/lib/dateUtils'

const ORIGINAL_TZ = process.env.TZ

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ
})

// Bangkok wall-clock times around the UTC date boundary (07:00 Bangkok = 00:00 UTC)
const CASES = [
  { iso: '2026-10-14T00:00:00+07:00', date: '2026-10-14', time: '00:00' },
  { iso: '2026-10-14T03:30:00+07:00', date: '2026-10-14', time: '03:30' },
  { iso: '2026-10-14T06:59:00+07:00', date: '2026-10-14', time: '06:59' },
  { iso: '2026-10-14T07:00:00+07:00', date: '2026-10-14', time: '07:00' },
  { iso: '2026-10-14T23:59:00+07:00', date: '2026-10-14', time: '23:59' },
  { iso: '2026-12-31T23:59:00+07:00', date: '2026-12-31', time: '23:59' },
  { iso: '2027-01-01T00:30:00+07:00', date: '2027-01-01', time: '00:30' },
]

describe.each(['Asia/Bangkok', 'UTC', 'America/New_York'])('Bangkok date/time helpers with device TZ=%s', (tz) => {
  it.each(CASES)('splitDateTime($iso) returns the Bangkok date and time', ({ iso, date, time }) => {
    process.env.TZ = tz
    expect(splitDateTime(new Date(iso).toISOString())).toEqual({ date, time })
  })

  it.each(CASES)('mergeDateTime round-trips $iso without shifting the instant', ({ iso }) => {
    process.env.TZ = tz
    const stored = new Date(iso).toISOString()
    const { date, time } = splitDateTime(stored)
    expect(mergeDateTime(date, time)).toBe(stored)
  })
})

describe('resolveCreatedAt', () => {
  const stored = '2026-10-13T20:30:37.123Z' // 2026-10-14 03:30:37 Bangkok

  it('keeps the stored value, seconds included, when date and time are unchanged', () => {
    expect(resolveCreatedAt(stored, '2026-10-14', '03:30')).toBe(stored)
  })

  it('returns the new Bangkok instant when the time was edited', () => {
    expect(resolveCreatedAt(stored, '2026-10-14', '09:15')).toBe('2026-10-14T02:15:00.000Z')
  })

  it('returns the new Bangkok instant when the date was edited', () => {
    expect(resolveCreatedAt(stored, '2026-10-13', '03:30')).toBe('2026-10-12T20:30:00.000Z')
  })
})
