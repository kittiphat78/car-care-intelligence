import { listBetween } from '@/features/records/api'
import { ok, type Result } from '@/lib/result'
import { bangkokMonthRange, bangkokYearRange } from '@/lib/time/bangkok'
import type { Expense, Record as AppRecord } from '@/types'

/** All income and expenses of a Bangkok calendar year, newest first. Each side can fail on its own. */
export async function loadYear(year: number): Promise<{ records: Result<AppRecord[]>; expenses: Result<Expense[]> }> {
  const { start, end } = bangkokYearRange(year)
  const [records, expenses] = await Promise.all([
    listBetween<AppRecord>('records', start, end, { ascending: false }),
    listBetween<Expense>('expenses', start, end, { ascending: false }),
  ])
  return { records, expenses }
}

/**
 * Rows for an Excel export from the first day of (startYear, startMonth) to the end of
 * (endYear, endMonth), oldest first. Fails as a whole if either side fails (ER-07), so a
 * file is never built from partial data.
 */
export async function loadExportRange(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
): Promise<Result<{ records: AppRecord[]; expenses: Expense[] }>> {
  const start = bangkokMonthRange(startYear, startMonth).start
  const end = bangkokMonthRange(endYear, endMonth).end
  const [records, expenses] = await Promise.all([
    listBetween<AppRecord>('records', start, end, { ascending: true }),
    listBetween<Expense>('expenses', start, end, { ascending: true }),
  ])
  if (!records.ok) return records
  if (!expenses.ok) return expenses
  return ok({ records: records.data, expenses: expenses.data })
}
