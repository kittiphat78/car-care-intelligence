import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

/**
 * Supabase client bound to the current request's cookies.
 * Server only: Route Handlers and Server Components (never import from a client component).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components cannot set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  })
}
