/**
 * Date utility functions for consistent date boundary computations.
 * Eliminates duplicated `new Date(); d.setHours(0,0,0,0)` patterns across hooks.
 */

/** Get start of today (00:00:00.000 local time) */
export function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Get start of yesterday (00:00:00.000 local time) */
export function getStartOfYesterday(): Date {
  const d = getStartOfDay()
  d.setDate(d.getDate() - 1)
  return d
}

/** Get date N days ago at 00:00:00.000 local time */
export function getDaysAgo(n: number): Date {
  const d = getStartOfDay()
  d.setDate(d.getDate() - n)
  return d
}

/** Get start of current week (Monday 00:00:00.000 local time) */
export function getStartOfWeek(): Date {
  const d = getStartOfDay()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}

/** Get start of current month (1st day, 00:00:00.000 local time) */
export function getStartOfMonth(): Date {
  const d = getStartOfDay()
  d.setDate(1)
  return d
}

/** Get start of current year (Jan 1st, 00:00:00.000 local time) */
export function getStartOfYear(): Date {
  const d = getStartOfDay()
  d.setMonth(0, 1)
  return d
}

/** Get a date N years ago at 00:00:00.000 local time */
export function getYearsAgo(n: number): Date {
  const d = getStartOfDay()
  d.setFullYear(d.getFullYear() - n)
  return d
}

/**
 * Fast millisecond parser for ISO date strings.
 * Uses `Date.parse()` which avoids constructing a full Date object.
 * ~2-3x faster than `new Date(str).getTime()` in tight loops.
 */
export function parseDateMs(isoString: string): number {
  return Date.parse(isoString)
}

/** Shop time zone. Thailand has no daylight saving time, so the offset is fixed. */
const SHOP_TIME_ZONE = 'Asia/Bangkok'
const SHOP_UTC_OFFSET = '+07:00'

const shopDateTimeParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: SHOP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/**
 * Split an ISO datetime string into { date, time } for form fields,
 * both in Asia/Bangkok wall-clock time regardless of the device time zone.
 */
export function splitDateTime(iso: string): { date: string; time: string } {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {}
  for (const part of shopDateTimeParts.formatToParts(new Date(iso))) parts[part.type] = part.value
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  }
}

/**
 * Merge Asia/Bangkok date (YYYY-MM-DD) and time (HH:mm) strings back into an ISO datetime string.
 */
export function mergeDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00${SHOP_UTC_OFFSET}`).toISOString()
}

/**
 * Value to save as created_at after editing: the stored value untouched when the
 * date and time fields were not changed, otherwise the newly entered Bangkok time.
 */
export function resolveCreatedAt(storedIso: string, date: string, time: string): string {
  const original = splitDateTime(storedIso)
  return original.date === date && original.time === time ? storedIso : mergeDateTime(date, time)
}
