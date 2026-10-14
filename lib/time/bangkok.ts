/**
 * Calendar and clock helpers for the shop's time zone (ADR-06).
 *
 * Every "day", "week", "month" and "year" in the app is an Asia/Bangkok calendar
 * period, whatever time zone the device is set to. Thailand has no daylight saving
 * time, so the UTC offset is a constant and plain arithmetic on it is exact.
 *
 * A day is passed around as a `YYYY-MM-DD` string; instants are `Date` objects or
 * ISO strings from the database.
 */

export const SHOP_TIME_ZONE = 'Asia/Bangkok'
export const SHOP_UTC_OFFSET = '+07:00'
const OFFSET_MS = 7 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

type Instant = Date | string | number

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

/** Bangkok wall-clock fields of an instant. `weekday`: 0 = Sunday … 6 = Saturday. */
export function bangkokParts(at: Instant = new Date()) {
  // Shift the instant by the offset, then read it as UTC to get Bangkok wall-clock fields
  const shifted = new Date(new Date(at).getTime() + OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    weekday: shifted.getUTCDay(),
  }
}

/** Bangkok calendar day (`YYYY-MM-DD`) of an instant. */
export function toBangkokDay(at: Instant = new Date()): string {
  const { year, month, day } = bangkokParts(at)
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`
}

/** Today in Bangkok. */
export function bangkokToday(now: Date = new Date()): string {
  return toBangkokDay(now)
}

function parseDay(day: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) throw new RangeError(`Invalid day: ${day}`)
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

/** The day `n` days after `day` (negative `n` goes back). */
export function addDays(day: string, n: number): string {
  const p = parseDay(day)
  return new Date(Date.UTC(p.year, p.month - 1, p.day) + n * DAY_MS).toISOString().slice(0, 10)
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const a = parseDay(from)
  const b = parseDay(to)
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY_MS)
}

/** First instant (00:00:00.000 Bangkok) of a day. */
export function startOfBangkokDay(day: string): Date {
  parseDay(day)
  return new Date(`${day}T00:00:00${SHOP_UTC_OFFSET}`)
}

/** Monday of the week containing `day` (weeks start on Monday). */
export function startOfWeek(day: string): string {
  const p = parseDay(day)
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()
  return addDays(day, weekday === 0 ? -6 : 1 - weekday)
}

export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`
}

export function startOfYear(day: string): string {
  return `${day.slice(0, 4)}-01-01`
}

/** Same calendar date `n` years earlier; 29 Feb falls back to 1 Mar like `Date#setFullYear`. */
export function yearsBefore(day: string, n: number): string {
  const p = parseDay(day)
  return new Date(Date.UTC(p.year - n, p.month - 1, p.day)).toISOString().slice(0, 10)
}

/** [start, end) instants of a Bangkok month (`month` 1–12). */
export function bangkokMonthRange(year: number, month: number): { start: Date; end: Date } {
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  return {
    start: startOfBangkokDay(`${pad(year, 4)}-${pad(month)}-01`),
    end: startOfBangkokDay(`${pad(next.year, 4)}-${pad(next.month)}-01`),
  }
}

/** [start, end) instants of a Bangkok calendar year. */
export function bangkokYearRange(year: number): { start: Date; end: Date } {
  return {
    start: startOfBangkokDay(`${pad(year, 4)}-01-01`),
    end: startOfBangkokDay(`${pad(year + 1, 4)}-01-01`),
  }
}

/** Split an instant into Bangkok `{ date: 'YYYY-MM-DD', time: 'HH:mm' }` for form fields. */
export function splitBangkok(at: Instant): { date: string; time: string } {
  const p = bangkokParts(at)
  return { date: toBangkokDay(at), time: `${pad(p.hour)}:${pad(p.minute)}` }
}

/** Join Bangkok form fields back into an ISO instant (UTC, as stored by the database). */
export function joinBangkok(date: string, time: string): string {
  parseDay(date)
  return new Date(`${date}T${time}:00${SHOP_UTC_OFFSET}`).toISOString()
}

/**
 * Timestamp for a new record dated `day`: the chosen day with the current Bangkok
 * time of day (seconds kept, milliseconds dropped).
 */
export function bangkokTimestampOn(day: string, now: Date = new Date()): string {
  parseDay(day)
  const p = bangkokParts(now)
  return new Date(`${day}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}${SHOP_UTC_OFFSET}`).toISOString()
}

/** Format an instant in Bangkok time (adds the time zone to `toLocaleString` options). */
export function formatBangkok(at: Instant, options: Intl.DateTimeFormatOptions, locale = 'th-TH'): string {
  return new Date(at).toLocaleString(locale, { ...options, timeZone: SHOP_TIME_ZONE })
}
