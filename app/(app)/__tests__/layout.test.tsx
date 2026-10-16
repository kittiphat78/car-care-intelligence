import { beforeEach, describe, expect, it, vi } from 'vitest'

// The server guard of the signed-in area (ADR-13)

const state = vi.hoisted(() => ({
  user: null as { id: string; email?: string } | null,
  path: null as string | null,
}))

vi.mock('@/lib/auth/session', () => ({ getSessionUser: async () => state.user }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers(state.path === null ? {} : { 'x-app-path': state.path }),
}))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`)
  },
}))
// The shell itself is covered by its own tests
vi.mock('@/components/patterns/nav/AppShell', () => ({ AppShell: () => null }))
vi.mock('@/features/auth/components/LogoutDialog', () => ({ LogoutDialog: () => null }))

import AppLayout from '../layout'

describe('(app) layout guard', () => {
  beforeEach(() => {
    state.user = null
    state.path = null
  })

  it.each([
    ['/history?tab=expense', '/login?next=%2Fhistory%3Ftab%3Dexpense'],
    ['/', '/login'],
    ['//evil.example', '/login'],
  ])('sends a signed-out request for %s to %s', async (path, target) => {
    state.path = path
    await expect(AppLayout({ children: null })).rejects.toThrow(`REDIRECT:${target}`)
  })

  it('falls back to /login when the path header is missing', async () => {
    await expect(AppLayout({ children: null })).rejects.toThrow('REDIRECT:/login')
  })

  it('renders the shell with the account email for a member', async () => {
    state.user = { id: 'u1', email: 'owner@example.com' }
    const element = await AppLayout({ children: 'page' })
    expect(element.props.email).toBe('owner@example.com')
    expect(element.props.children).toBe('page')
  })
})
