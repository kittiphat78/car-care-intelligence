/**
 * Environment separation guard (ADR-12, security-design.md §6).
 *
 * Runs at build time from next.config.ts, so a Preview or Development build that
 * points at the production database fails instead of letting tests write real data.
 * Pure and dependency-free so next.config.ts can import it.
 */

export type AppEnv = 'production' | 'preview' | 'development'

const APP_ENVS: readonly AppEnv[] = ['production', 'preview', 'development']

export interface EnvironmentInput {
  /** NEXT_PUBLIC_APP_ENV (optional; derived from VERCEL_ENV when unset) */
  appEnv?: string
  /** VERCEL_ENV, set by Vercel during builds */
  vercelEnv?: string
  /** NEXT_PUBLIC_SUPABASE_URL */
  supabaseUrl?: string
  /** PRODUCTION_SUPABASE_PROJECT_REF: the production project's ref, the same in every scope */
  productionRef?: string
}

export interface EnvironmentCheck {
  appEnv: AppEnv
  /** Which database the build talks to; 'unknown' until PRODUCTION_SUPABASE_PROJECT_REF is set */
  database: 'production' | 'other' | 'unknown'
  errors: string[]
  warnings: string[]
}

const isAppEnv = (value: string | undefined): value is AppEnv => APP_ENVS.includes(value as AppEnv)

/** `abc123` for `https://abc123.supabase.co`, otherwise null. */
export function supabaseProjectRef(url: string | undefined): string | null {
  if (!url) return null
  try {
    const host = new URL(url).hostname
    return host.endsWith('.supabase.co') ? host.slice(0, -'.supabase.co'.length) : null
  } catch {
    return null
  }
}

export function checkEnvironment({ appEnv, vercelEnv, supabaseUrl, productionRef }: EnvironmentInput): EnvironmentCheck {
  const errors: string[] = []
  const warnings: string[] = []

  if (appEnv && !isAppEnv(appEnv)) {
    errors.push(`NEXT_PUBLIC_APP_ENV must be one of ${APP_ENVS.join(', ')} (got "${appEnv}")`)
  }
  if (appEnv && isAppEnv(appEnv) && isAppEnv(vercelEnv) && appEnv !== vercelEnv) {
    errors.push(`NEXT_PUBLIC_APP_ENV is "${appEnv}" but this is a Vercel ${vercelEnv} build`)
  }

  const resolved: AppEnv = isAppEnv(appEnv) ? appEnv : isAppEnv(vercelEnv) ? vercelEnv : 'development'

  const ref = supabaseProjectRef(supabaseUrl)
  let database: EnvironmentCheck['database'] = 'unknown'
  if (!productionRef) {
    warnings.push('PRODUCTION_SUPABASE_PROJECT_REF is not set, so the build cannot check which database it uses')
  } else {
    database = ref === productionRef ? 'production' : 'other'
    if (resolved !== 'production' && database === 'production') {
      errors.push(`This ${resolved} build points at the production database (${productionRef}). Use the staging project for ${resolved}.`)
    }
    if (resolved === 'production' && database !== 'production') {
      errors.push(`This production build points at "${ref ?? supabaseUrl}" instead of the production database (${productionRef}).`)
    }
  }

  return { appEnv: resolved, database, errors, warnings }
}
