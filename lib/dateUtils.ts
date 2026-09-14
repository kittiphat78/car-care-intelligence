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

/**
 * Split an ISO datetime string into { date, time } for form fields.
 */
export function splitDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const date = d.toISOString().split('T')[0]
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return { date, time }
}

/**
 * Merge separate date and time strings back into an ISO datetime string.
 */
export function mergeDateTime(date: string, time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}
