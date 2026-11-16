import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Db } from '@/lib/supabase'
import type { ServerData } from '@/lib/data-store'

// Server pages load what their screen shows first, with the request's Supabase client
// (RLS applies as in the browser), so the page arrives with its data (speed work 3e,
// ADR-31). Server only. A failure gives null: the screen then loads in the browser as
// before, and shows its own error if that fails too.

export async function fromServer<T>(load: (client: Db) => Promise<T>): Promise<ServerData<T> | null> {
  try {
    const client: Db = await createSupabaseServerClient()
    const takenAt = Date.now()
    return { value: await load(client), takenAt }
  } catch {
    return null
  }
}
