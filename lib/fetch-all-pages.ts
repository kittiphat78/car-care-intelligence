import { appError, toAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

/** One page of a Supabase select built with `{ count: 'exact' }`, a stable order and `.range(from, to)`. */
export type PageQuery<T> = (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown; count?: number | null }>

export interface FetchAllPagesOptions {
  pageSize?: number
  /** Stop with ROW_LIMIT instead of loading without end */
  maxRows?: number
}

/**
 * Load every row of a query page by page (ER-02).
 *
 * The server caps rows per response ("Max rows"), so a single select can be cut
 * short without an error. This helper keeps requesting the next range until it has
 * as many rows as the exact count, and returns ROW_LIMIT rather than a partial list.
 * `fetchPage` must build a fresh query for each call.
 */
export async function fetchAllPages<T>(
  fetchPage: PageQuery<T>,
  { pageSize = 1000, maxRows = 100_000 }: FetchAllPagesOptions = {},
): Promise<Result<T[]>> {
  const rows: T[] = []
  let total: number | null = null
  let complete = false

  try {
    while (!complete && rows.length < maxRows) {
      const from = rows.length
      const { data, error, count } = await fetchPage(from, from + pageSize - 1)
      if (error) return err(toAppError(error))
      if (typeof count === 'number') total = count

      const page = data ?? []
      rows.push(...page)

      complete = page.length === 0 || (total !== null ? rows.length >= total : page.length < pageSize)
    }
  } catch (e) {
    return err(toAppError(e))
  }

  if (!complete || (total !== null && rows.length < total)) {
    return err(appError('ROW_LIMIT', new Error(`Loaded ${rows.length} of ${total ?? 'unknown'} rows`)))
  }
  return ok(rows)
}
