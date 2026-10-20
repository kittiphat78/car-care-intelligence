import { supabase } from '@/lib/supabase'
import { fetchAllPages } from '@/lib/fetch-all-pages'
import { appError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'
import { run } from '@/features/records/api'
import type { CustomerPayload } from './schema'
import type { Customer } from './types'

// Data access for the customer directory (M010-M012). Every function returns a Result
// and never throws. Shop members only: row level security decides, not this code.

const COLUMNS =
  'id,name,note,created_at,created_by_email,updated_at,updated_by_email,' +
  'customer_phones(id,number,label,is_primary,position),' +
  'customer_vehicles(id,plate,plate_key,plate_core,car_type,brand,color,note,position)'

/** The whole directory with phones and vehicles (hundreds of rows: loaded once, searched in the browser, ADR-23) */
export function listCustomers(): Promise<Result<Customer[]>> {
  return fetchAllPages<Customer>((from, to) =>
    supabase
      .from('customers')
      .select(COLUMNS, { count: 'exact' })
      .order('name')
      .order('id')
      .range(from, to)
      .overrideTypes<Customer[], { merge: false }>(),
  )
}

/** One customer, or null when it no longer exists (or is not visible to this account) */
export async function getCustomer(id: string): Promise<Result<Customer | null>> {
  const result = await run(
    supabase.from('customers').select(COLUMNS).eq('id', id).overrideTypes<Customer[], { merge: false }>(),
  )
  return result.ok ? ok((result.data ?? [])[0] ?? null) : result
}

export interface SaveOptions {
  /** null for a new customer */
  id: string | null
  /** updated_at of the customer as loaded (ADR-07); null for a new or never-changed one */
  expectedUpdatedAt: string | null
  /** One id per save of a new customer, re-sent on retry (M004 / useRequestId) */
  requestId: string | null
  /** plate_core values the user agreed to move from another customer */
  moves: readonly string[]
}

export interface SavedCustomer {
  id: string
  updated_at: string | null
}

/**
 * Save the customer with all phones and vehicles in one transaction (save_customer).
 * CONFLICT: changed on another device · NOT_FOUND: deleted meanwhile ·
 * VALIDATION with field 'plate': a full plate belongs to another customer.
 */
export async function saveCustomer(payload: CustomerPayload, options: SaveOptions): Promise<Result<SavedCustomer>> {
  const result = await run(
    supabase.rpc('save_customer', {
      p_id: options.id,
      p_expected_updated_at: options.expectedUpdatedAt,
      p_name: payload.name,
      p_note: payload.note,
      p_phones: payload.phones,
      p_vehicles: payload.vehicles,
      p_move_plates: [...options.moves],
      p_client_request_id: options.requestId,
    }),
  )
  if (!result.ok) return result
  const row = ((result.data as SavedCustomer[] | null) ?? [])[0]
  return row ? ok(row) : err(appError('SERVER', new Error('save_customer returned no row')))
}

/** Delete a customer; its phones and vehicles go with it (cascade). Records are not touched. */
export async function deleteCustomer(id: string): Promise<Result<void>> {
  const result = await run(supabase.from('customers').delete().eq('id', id).select('id'))
  if (!result.ok) return result
  return (result.data as unknown[] | null)?.length ? ok(undefined) : err(appError('NOT_FOUND'))
}
