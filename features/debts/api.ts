import { supabase } from '@/lib/supabase'
import { fetchAllPages } from '@/lib/fetch-all-pages'
import { ok, type Result } from '@/lib/result'
import { run } from '@/features/records/api'
import type { Record as AppRecord } from '@/types'

/** Every unpaid income record, oldest first (all pages, ER-02) */
export function listUnpaid(): Promise<Result<AppRecord[]>> {
  return fetchAllPages<AppRecord>((from, to) =>
    supabase
      .from('records')
      .select('*', { count: 'exact' })
      .eq('payment_status', 'unpaid')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
      .overrideTypes<AppRecord[], { merge: false }>(),
  )
}

/** Bigint columns arrive as numbers or, if ever beyond 2^53, as strings */
const num = (value: unknown) => Number(value ?? 0)

export interface SettleResult {
  /** Rows that were still unpaid and are now paid */
  updatedCount: number
  /** Their total in baht */
  total: number
}

/**
 * "เคลียร์ยอด": mark exactly these records as paid (settle_records, M007).
 * Rows already paid, deleted or not visible to the user are skipped, so
 * `updatedCount` can be lower than `ids.length`.
 */
export async function settleRecords(ids: string[]): Promise<Result<SettleResult>> {
  const result = await run(supabase.rpc('settle_records', { p_ids: ids }))
  if (!result.ok) return result
  const row = (result.data as { updated_count: number; total: number }[] | null)?.[0]
  return ok({ updatedCount: num(row?.updated_count), total: num(row?.total) })
}
