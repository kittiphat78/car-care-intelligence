import { historyKey, load, peek } from '@/lib/data-store'
import type { Result } from '@/lib/result'
import type { Expense, Record as AppRecord } from '@/types'
import { loadPeriod } from './api'

/** Rows of one Bangkok month, or of the whole year when month is 0 */
export interface PeriodData {
  year: number
  month: number
  records: Result<AppRecord[]>
  expenses: Result<Expense[]>
}

/** A month (or the year, month 0) through the shared store: /history and a prefetch share it */
export function loadHistoryPeriod(year: number, month: number, { fresh = false } = {}): Promise<PeriodData> {
  return load(historyKey(year, month), async (): Promise<PeriodData> => ({ year, month, ...(await loadPeriod(year, month)) }), {
    keep: (d) => d.records.ok && d.expenses.ok,
    fresh,
  })
}

export const keptPeriod = (year: number, month: number) => peek<PeriodData>(historyKey(year, month))
