// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }
type CookieAdapter = {
  getAll: () => { name: string; value: string }[]
  setAll: (cookies: CookieToSet[], headers?: Record<string, string>) => void
}

const mockState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  refreshedCookies: [] as CookieToSet[],
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: CookieAdapter }) => ({
    auth: {
      getUser: async () => {
        if (mockState.refreshedCookies.length > 0) {
          options.cookies.setAll(mockState.refreshedCookies, { 'Cache-Control': 'private, no-store' })
        }
        return { data: { user: mockState.user }, error: null }
      },
    },
  }),
}))

import { proxy, config } from '@/proxy'

const request = (path: string) => new NextRequest(new URL(path, 'https://shop.example'))

describe('proxy', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
    mockState.user = null
    mockState.refreshedCookies = []
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(['/', '/history', '/add', '/history/anything'])('redirects a signed-out visitor from %s to /login', async (path) => {
    const res = await proxy(request(path))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://shop.example/login')
  })

  it('lets a signed-out visitor open /login', async () => {
    const res = await proxy(request('/login'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('lets a signed-out visitor open unprotected paths', async () => {
    const res = await proxy(request('/manifest.json'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('lets a signed-in user open protected pages', async () => {
    mockState.user = { id: 'user-1' }
    const res = await proxy(request('/history'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('sends a signed-in user away from /login to /', async () => {
    mockState.user = { id: 'user-1' }
    const res = await proxy(request('/login'))
    expect(res.headers.get('location')).toBe('https://shop.example/')
  })

  it('passes refreshed session cookies and cache headers to the response', async () => {
    mockState.user = { id: 'user-1' }
    mockState.refreshedCookies = [{ name: 'sb-token', value: 'new', options: { path: '/' } }]
    const res = await proxy(request('/'))
    expect(res.cookies.get('sb-token')?.value).toBe('new')
    expect(res.headers.get('cache-control')).toBe('private, no-store')
  })

  it('keeps refreshed session cookies on a redirect', async () => {
    mockState.user = { id: 'user-1' }
    mockState.refreshedCookies = [{ name: 'sb-token', value: 'new', options: { path: '/' } }]
    const res = await proxy(request('/login'))
    expect(res.headers.get('location')).toBe('https://shop.example/')
    expect(res.cookies.get('sb-token')?.value).toBe('new')
  })

  it('redirects protected pages to /login when Supabase env is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const res = await proxy(request('/add'))
    expect(res.headers.get('location')).toBe('https://shop.example/login')
    expect((await proxy(request('/login'))).headers.get('location')).toBeNull()
    warn.mockRestore()
  })

  it('does not run on API routes or static assets', () => {
    const pattern = new RegExp(`^${config.matcher[0]}$`)
    expect(pattern.test('/api/client-errors')).toBe(false)
    expect(pattern.test('/_next/static/chunk.js')).toBe(false)
    expect(pattern.test('/favicon.ico')).toBe(false)
    expect(pattern.test('/history')).toBe(true)
  })
})
