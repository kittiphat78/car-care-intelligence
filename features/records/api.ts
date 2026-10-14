import { supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'
import { fetchAllPages } from '@/lib/fetch-all-pages'
import { addDays, startOfBangkokDay } from '@/lib/time/bangkok'
import type { Expense, Record as AppRecord } from '@/types'

export type EntryTable = 'records' | 'expenses'

export interface IncomeInsert {
  type: AppRecord['type']
  plate: string
  services: string[]
  price: number
  seq_number: number
  created_at: string
  created_by: string | null
  created_by_email: string
  payment_method: 'cash'
  customer_name: string
  payment_status: AppRecord['payment_status']
  job_status: AppRecord['job_status']
}

export interface ExpenseInsert {
  title: string
  amount: number
  note: string
  created_at: string
  created_by: string | null
  created_by_email: string
}

export type EntryPatch = Partial<AppRecord & Expense>

type QueryResult<T> = PromiseLike<{ data: T; error: unknown; count?: number | null }>

/** Await a Supabase call and turn its `{ data, error }` (or a thrown error) into a Result. */
export async function run<T>(query: QueryResult<T>): Promise<Result<T>> {
  try {
    const { data, error } = await query
    return error ? err(toAppError(error)) : ok(data)
  } catch (e) {
    return err(toAppError(e))
  }
}

async function runCount(query: QueryResult<unknown>): Promise<Result<number>> {
  try {
    const { error, count } = await query
    return error ? err(toAppError(error)) : ok(count ?? 0)
  } catch (e) {
    return err(toAppError(e))
  }
}

const done = <T>(result: Result<T>): Result<void> => (result.ok ? ok(undefined) : result)

/** Number of income records on a Bangkok day (used for the daily sequence number). */
export function countIncomeOn(day: string): Promise<Result<number>> {
  return runCount(
    supabase.from('records').select('*', { count: 'exact', head: true })
      .gte('created_at', startOfBangkokDay(day).toISOString())
      .lt('created_at', startOfBangkokDay(addDays(day, 1)).toISOString()),
  )
}

/** How many times a plate has visited (all time). */
export function countVisitsByPlate(plate: string): Promise<Result<number>> {
  return runCount(supabase.from('records').select('*', { count: 'exact', head: true }).eq('plate', plate))
}

export async function createIncome(row: IncomeInsert): Promise<Result<void>> {
  return done(await run(supabase.from('records').insert(row)))
}

export async function createExpense(row: ExpenseInsert): Promise<Result<void>> {
  return done(await run(supabase.from('expenses').insert(row)))
}

export async function updateEntry(table: EntryTable, id: string, patch: EntryPatch): Promise<Result<void>> {
  return done(await run(supabase.from(table).update(patch).eq('id', id)))
}

export async function deleteEntry(table: EntryTable, id: string): Promise<Result<void>> {
  return done(await run(supabase.from(table).delete().eq('id', id)))
}

/** Every row of `table` created in [start, end) (no upper bound when `end` is null), in a stable order (all pages, ER-02). */
export function listBetween<T>(
  table: EntryTable,
  start: Date,
  end: Date | null,
  { ascending, columns = '*' }: { ascending: boolean; columns?: string },
): Promise<Result<T[]>> {
  return fetchAllPages<T>((from, to) => {
    let query = supabase.from(table).select(columns, { count: 'exact' }).gte('created_at', start.toISOString())
    if (end) query = query.lt('created_at', end.toISOString())
    return query
      .order('created_at', { ascending })
      .order('id', { ascending })
      .range(from, to)
      .overrideTypes<T[], { merge: false }>()
  })
}
