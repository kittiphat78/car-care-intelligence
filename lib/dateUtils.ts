/**
 * Date boundary helpers used by the dashboard.
 *
 * All boundaries are Asia/Bangkok calendar periods (ER-11), computed by
 * lib/time/bangkok.ts, so the result does not depend on the device time zone.
 * New code should use lib/time/bangkok.ts directly; these wrappers keep the
 * existing Date-returning API until the dashboard moves to RPCs (B3).
 */
import {
  addDays,
  bangkokToday,
  joinBangkok,
  splitBangkok,
  startOfBangkokDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toBangkokDay,
  yearsBefore,
} from '@/lib/time/bangkok'

/** Start (00:00 Bangkok) of the Bangkok day containing `date` */
export function getStartOfDay(date: Date = new Date()): Date {
  return startOfBangkokDay(toBangkokDay(date))
}

/** Start of yesterday (00:00 Bangkok) */
export function getStartOfYesterday(): Date {
  return startOfBangkokDay(addDays(bangkokToday(), -1))
}

/** Start of the day N days ago (00:00 Bangkok) */
export function getDaysAgo(n: number): Date {
  return startOfBangkokDay(addDays(bangkokToday(), -n))
}

/** Start of the current week (Monday 00:00 Bangkok) */
export function getStartOfWeek(): Date {
  return startOfBangkokDay(startOfWeek(bangkokToday()))
}

/** Start of the current month (1st day, 00:00 Bangkok) */
export function getStartOfMonth(): Date {
  return startOfBangkokDay(startOfMonth(bangkokToday()))
}

/** Start of the current year (Jan 1st, 00:00 Bangkok) */
export function getStartOfYear(): Date {
  return startOfBangkokDay(startOfYear(bangkokToday()))
}

/** Start of the same calendar day N years ago (00:00 Bangkok) */
export function getYearsAgo(n: number): Date {
  return startOfBangkokDay(yearsBefore(bangkokToday(), n))
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
 * Split an ISO datetime string into { date, time } for form fields,
 * both in Asia/Bangkok wall-clock time regardless of the device time zone.
 */
export function splitDateTime(iso: string): { date: string; time: string } {
  return splitBangkok(iso)
}

/**
 * Merge Asia/Bangkok date (YYYY-MM-DD) and time (HH:mm) strings back into an ISO datetime string.
 */
export function mergeDateTime(date: string, time: string): string {
  return joinBangkok(date, time)
}

/**
 * Value to save as created_at after editing: the stored value untouched when the
 * date and time fields were not changed, otherwise the newly entered Bangkok time.
 */
export function resolveCreatedAt(storedIso: string, date: string, time: string): string {
  const original = splitDateTime(storedIso)
  return original.date === date && original.time === time ? storedIso : mergeDateTime(date, time)
}
