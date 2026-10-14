import { supabase } from '@/lib/supabase'
import { fetchAllPages } from '@/lib/fetch-all-pages'
import { ok, type Result } from '@/lib/result'
import { listBetween, run } from '@/features/records/api'
import { getDaysAgo, getYearsAgo } from '@/lib/dateUtils'
import type { Expense, Record as AppRecord } from '@/types'

export interface DashboardData {
  /** Income of the last 30 days, oldest first */
  recentRecords: Result<AppRecord[]>
  /** Expenses of the last 30 days */
  recentExpenses: Result<Expense[]>
  /** All unpaid income, oldest first */
  unpaidRecords: Result<AppRecord[]>
  /** Income of the last year (only the columns the customer breakdown needs), oldest first */
  yearRecords: Result<AppRecord[]>
}

/** Everything the dashboard shows. Each part can fail on its own so the rest still renders. */
export async function loadDashboard(): Promise<DashboardData> {
  const thirtyDaysAgo = getDaysAgo(30)
  const oneYearAgo = getYearsAgo(1)

  const [recentRecords, recentExpenses, unpaidRecords, yearRecords] = await Promise.all([
    listBetween<AppRecord>('records', thirtyDaysAgo, null, { ascending: true }),
    listBetween<Expense>('expenses', thirtyDaysAgo, null, { ascending: true }),
    fetchAllPages<AppRecord>((from, to) =>
      supabase.from('records').select('*', { count: 'exact' })
        .eq('payment_status', 'unpaid')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
        .overrideTypes<AppRecord[], { merge: false }>(),
    ),
    listBetween<AppRecord>('records', oneYearAgo, null, {
      ascending: true,
      columns: 'id,created_at,type,price,customer_name',
    }),
  ])

  return { recentRecords, recentExpenses, unpaidRecords, yearRecords }
}

/**
 * Mark all unpaid income of one customer as paid ("เคลียร์ยอด").
 * `customerName` is the stored name; '' means the unnamed general customer.
 */
export async function markCustomerPaid(customerName: string, updatedByEmail: string): Promise<Result<void>> {
  const result = await run(
    supabase.from('records')
      .update({ payment_status: 'paid', updated_at: new Date().toISOString(), updated_by_email: updatedByEmail })
      .eq('payment_status', 'unpaid')
      .eq('customer_name', customerName),
  )
  return result.ok ? ok(undefined) : result
}
