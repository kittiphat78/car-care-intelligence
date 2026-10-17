import { supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

export async function signOut(): Promise<Result<null>> {
  const { error } = await supabase.auth.signOut()
  return error ? err(toAppError(error)) : ok(null)
}
