import { supabase } from '@/lib/supabase'
import { appError, toAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'
import { fetchAllPages } from '@/lib/fetch-all-pages'
import type { Expense, Record as AppRecord } from '@/types'

export type EntryTable = 'records' | 'expenses'

export interface IncomeInsert {
  type: AppRecord['type']
  plate: string
  services: string[]
  price: number
  created_at: string
  created_by: string | null
  created_by_email: string
  payment_method: 'cash'
  customer_name: string
  payment_status: AppRecord['payment_status']
  job_status: AppRecord['job_status']
  /** One id per save; retrying with the same id cannot create a second row (M004) */
  client_request_id: string
}

export interface ExpenseInsert {
  title: string
  amount: number
  note: string
  created_at: string
  created_by: string | null
  created_by_email: string
  client_request_id: string
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

/** How many times a plate has visited (all time). */
export function countVisitsByPlate(plate: string): Promise<Result<number>> {
  return runCount(supabase.from('records').select('*', { count: 'exact', head: true }).eq('plate', plate))
}

/**
 * A retried save whose first attempt did reach the database fails with DUPLICATE on
 * client_request_id: the row exists, so that counts as saved.
 */
const savedOnce = (result: Result<unknown>): Result<void> =>
  result.ok || result.error.code === 'DUPLICATE' ? ok(undefined) : result

export async function createIncome(row: IncomeInsert): Promise<Result<void>> {
  return savedOnce(await run(supabase.from('records').insert(row)))
}

export async function createExpense(row: ExpenseInsert): Promise<Result<void>> {
  return savedOnce(await run(supabase.from('expenses').insert(row)))
}

/**
 * Save an edit only if nobody changed the row since it was loaded (ADR-07):
 * `expectedUpdatedAt` is the row's updated_at as loaded (null if never edited).
 * 0 rows updated → CONFLICT when the row still exists, NOT_FOUND when it was deleted.
 * updated_at / updated_by_email are set by the database (M005).
 */
export async function updateEntry(
  table: EntryTable,
  id: string,
  patch: EntryPatch,
  expectedUpdatedAt: string | null | undefined,
): Promise<Result<void>> {
  let query = supabase.from(table).update(patch).eq('id', id)
  query = expectedUpdatedAt ? query.eq('updated_at', expectedUpdatedAt) : query.is('updated_at', null)
  const updated = await run(query.select('id'))
  if (!updated.ok) return updated
  if ((updated.data as unknown[] | null)?.length) return ok(undefined)

  const still = await run(supabase.from(table).select('id').eq('id', id))
  if (!still.ok) return still
  return err(appError((still.data as unknown[] | null)?.length ? 'CONFLICT' : 'NOT_FOUND'))
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
