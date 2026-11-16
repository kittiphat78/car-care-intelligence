import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'

export const supabase = createBrowserClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

/** A Supabase client: this one in the browser, the request's one on the server (lib/supabase/server.ts) */
export type Db = typeof supabase
