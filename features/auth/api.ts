import { supabase } from '@/lib/supabase'
import { toAppError } from '@/lib/errors'
import { err, ok, type Result } from '@/lib/result'

// ── Sign in (user-flows UF-AUTH-01) ──────────────────────────────────────────

export type SignInFailure = 'invalid' | 'rate_limited' | 'network' | 'unknown'

/** Supabase Auth error → what the login form says. One message for a wrong email or password (AC-01-2). */
export function classifySignInError(error: unknown): SignInFailure {
  const e = error as { status?: number; code?: string; name?: string; message?: string }
  if (e?.status === 429 || e?.code === 'over_request_rate_limit' || e?.code === 'over_email_send_rate_limit') return 'rate_limited'
  if (e?.status === 400 || e?.code === 'invalid_credentials' || e?.code === 'email_not_confirmed') return 'invalid'
  const app = toAppError(error)
  if (app.code === 'NETWORK' || app.code === 'TIMEOUT' || e?.name === 'AuthRetryableFetchError') return 'network'
  return 'unknown'
}

export const SIGN_IN_MESSAGES: Record<SignInFailure, string> = {
  invalid: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  rate_limited: 'ลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่',
  network: 'เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่',
  unknown: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
}

export async function signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; reason: SignInFailure }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, reason: classifySignInError(error) }
    return data.session ? { ok: true } : { ok: false, reason: 'unknown' }
  } catch (e) {
    return { ok: false, reason: classifySignInError(e) }
  }
}

// ── Sign out (UF-AUTH-04) ────────────────────────────────────────────────────

/** Set while this tab signs out on purpose, so the "session expired" dialog stays quiet */
let signingOut = false
export const isSigningOut = () => signingOut

/**
 * Ends the session. If the server cannot be reached the session is still removed from
 * this device (`local`), so the person is signed out here either way.
 * `localOnly` tells the caller to say "ออกจากระบบในเครื่องนี้แล้ว".
 */
export async function signOut(): Promise<Result<{ localOnly: boolean }>> {
  signingOut = true
  try {
    const { error } = await supabase.auth.signOut()
    if (!error) return ok({ localOnly: false })
    const local = await supabase.auth.signOut({ scope: 'local' })
    return local.error ? err(toAppError(local.error)) : ok({ localOnly: true })
  } catch (e) {
    return err(toAppError(e))
  } finally {
    signingOut = false
  }
}
