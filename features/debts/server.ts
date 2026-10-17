import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Customers with something unpaid, for the nav badge. Server only (the (app) layout).
 * Unnamed jobs count as one customer. Returns 0 if the lookup fails: a missing badge is
 * better than a page that does not open.
 */
export async function countUnpaidCustomers(): Promise<number> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.from('records').select('customer_name').eq('payment_status', 'unpaid').limit(5000)
    if (error || !data) return 0
    return new Set(data.map((r: { customer_name: string | null }) => (r.customer_name ?? '').trim())).size
  } catch {
    return 0
  }
}
