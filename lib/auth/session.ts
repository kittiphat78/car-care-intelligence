import { cache } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * The signed-in user for this request, or null. Server only. Wrapped in cache() so the
 * (app) layout and a page asking in the same request make a single call to Supabase Auth.
 * getUser() checks the token with Supabase instead of trusting the cookie.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
