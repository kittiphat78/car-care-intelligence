import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Shared server-side Supabase auth check for API routes.
 * Eliminates ~20 lines of duplicated boilerplate per route.
 *
 * @returns { user } on success, or a 401 NextResponse on failure
 */
export async function authenticateRequest(): Promise<
  { user: User; error?: never } | { user?: never; error: NextResponse }
> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }
    return { user }
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
}
