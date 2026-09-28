import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Environment validation module', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('validates NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY successfully', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://valid-supabase-url.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'super-secret-anon-key-with-enough-length'

    const { env } = await import('../env')
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://valid-supabase-url.supabase.co')
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('super-secret-anon-key-with-enough-length')
    expect(env.NEXT_PUBLIC_WEATHER_LAT).toBe('19.91')
    expect(env.NEXT_PUBLIC_WEATHER_LON).toBe('99.84')
  })

  it('throws an error if NEXT_PUBLIC_SUPABASE_URL is not a valid URL', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-valid-url'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key'

    await expect(async () => {
      await import('../env')
    }).rejects.toThrow(/ENV VALIDATION FAILED/)
  })

  it('throws an error if NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or too short', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://valid.supabase.co'
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    await expect(async () => {
      await import('../env')
    }).rejects.toThrow(/ENV VALIDATION FAILED/)
  })

  it('throws an error when accessing GEMINI_API_KEY if not configured', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://valid.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key-123456789'
    delete process.env.GEMINI_API_KEY

    const { env } = await import('../env')
    expect(() => env.GEMINI_API_KEY).toThrow(/GEMINI_API_KEY is required/)
  })

  it('returns GEMINI_API_KEY on the server when configured', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://valid.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key-123456789'
    process.env.GEMINI_API_KEY = 'test-gemini-key'

    const { env } = await import('../env')
    expect(env.GEMINI_API_KEY).toBe('test-gemini-key')
  })
})
