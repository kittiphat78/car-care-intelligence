import { describe, it, expect } from 'vitest'
import { checkEnvironment, supabaseProjectRef } from '@/lib/env-guard'

const PROD = 'prodref000000000000a'
const STAGING = 'stagingref0000000000'
const url = (ref: string) => `https://${ref}.supabase.co`

describe('supabaseProjectRef', () => {
  it('reads the project ref from a Supabase URL', () => {
    expect(supabaseProjectRef(url(PROD))).toBe(PROD)
    expect(supabaseProjectRef(`${url(PROD)}/`)).toBe(PROD)
  })

  it('returns null for anything else', () => {
    expect(supabaseProjectRef(undefined)).toBeNull()
    expect(supabaseProjectRef('not a url')).toBeNull()
    expect(supabaseProjectRef('https://example.com')).toBeNull()
  })
})

describe('checkEnvironment', () => {
  it('fails a Preview build that points at the production database', () => {
    const result = checkEnvironment({ vercelEnv: 'preview', supabaseUrl: url(PROD), productionRef: PROD })
    expect(result.appEnv).toBe('preview')
    expect(result.database).toBe('production')
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(/production database/)
  })

  it('fails a Development build that points at the production database', () => {
    expect(checkEnvironment({ supabaseUrl: url(PROD), productionRef: PROD }).errors).toHaveLength(1)
  })

  it('fails a production build that points anywhere but production', () => {
    const result = checkEnvironment({ vercelEnv: 'production', supabaseUrl: url(STAGING), productionRef: PROD })
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(STAGING)
  })

  it('passes the intended pairs', () => {
    for (const [vercelEnv, ref] of [['production', PROD], ['preview', STAGING], ['development', STAGING]] as const) {
      const result = checkEnvironment({ vercelEnv, supabaseUrl: url(ref), productionRef: PROD })
      expect(result).toMatchObject({ appEnv: vercelEnv, errors: [], warnings: [] })
    }
  })

  it('fails when NEXT_PUBLIC_APP_ENV contradicts the Vercel environment', () => {
    const result = checkEnvironment({ appEnv: 'production', vercelEnv: 'preview', supabaseUrl: url(STAGING), productionRef: PROD })
    expect(result.errors.some(e => /contradicts|but this is a Vercel preview build/.test(e))).toBe(true)
  })

  it('rejects an unknown NEXT_PUBLIC_APP_ENV', () => {
    expect(checkEnvironment({ appEnv: 'staging' }).errors[0]).toMatch(/must be one of/)
  })

  it('only warns while PRODUCTION_SUPABASE_PROJECT_REF is unset, so current builds keep working', () => {
    const result = checkEnvironment({ vercelEnv: 'production', supabaseUrl: url(PROD) })
    expect(result).toMatchObject({ appEnv: 'production', database: 'unknown', errors: [] })
    expect(result.warnings).toHaveLength(1)
  })

  it('treats a build outside Vercel without NEXT_PUBLIC_APP_ENV as development (CI, local)', () => {
    expect(checkEnvironment({ supabaseUrl: 'https://ci-placeholder.supabase.co' }).appEnv).toBe('development')
  })
})
