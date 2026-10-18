import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const nav = vi.hoisted(() => ({ search: 'logout=1', replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/history',
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ replace: nav.replace, refresh: nav.refresh }),
}))

const auth = vi.hoisted(() => ({ signOut: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { auth: auth } }))

import { ToastProvider } from '@/components/ui/Toast'
import { LogoutDialog } from '../components/LogoutDialog'

const renderDialog = () =>
  render(
    <ToastProvider>
      <LogoutDialog email="owner@example.com" />
    </ToastProvider>,
  )
import { LOCAL_DRAFT_PREFIX, clearLocalDrafts } from '../drafts'

beforeEach(() => {
  nav.search = 'logout=1'
  nav.replace.mockReset()
  nav.refresh.mockReset()
  auth.signOut.mockReset()
  localStorage.clear()
  sessionStorage.clear()
})

describe('clearLocalDrafts', () => {
  it('removes only this app’s drafts', () => {
    localStorage.setItem(`${LOCAL_DRAFT_PREFIX}add-income`, '{}')
    localStorage.setItem('car-care-theme', 'light')
    localStorage.setItem('remembered_email', 'a@b.c')
    clearLocalDrafts()
    expect(localStorage.getItem(`${LOCAL_DRAFT_PREFIX}add-income`)).toBeNull()
    expect(localStorage.getItem('car-care-theme')).toBe('light')
    expect(localStorage.getItem('remembered_email')).toBe('a@b.c')
  })

  it('also clears drafts kept in this tab (sessionStorage)', () => {
    sessionStorage.setItem(`${LOCAL_DRAFT_PREFIX}user-1:income`, '{}')
    sessionStorage.setItem('other', 'x')
    clearLocalDrafts()
    expect(sessionStorage.getItem(`${LOCAL_DRAFT_PREFIX}user-1:income`)).toBeNull()
    expect(sessionStorage.getItem('other')).toBe('x')
  })
})

describe('LogoutDialog', () => {
  it('is closed without ?logout=1', () => {
    nav.search = ''
    renderDialog()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('asks first, with the account and the safe choice focused', () => {
    renderDialog()
    expect(screen.getByRole('alertdialog', { name: 'ออกจากระบบ?' })).toHaveTextContent('บัญชี owner@example.com')
    expect(screen.getByRole('alertdialog')).toHaveTextContent('ออกเฉพาะเครื่องนี้')
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toHaveFocus()
  })

  it('cancel removes only the logout parameter', () => {
    nav.search = 'tab=expense&logout=1'
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }))
    expect(nav.replace).toHaveBeenCalledWith('/history?tab=expense', { scroll: false })
    expect(auth.signOut).not.toHaveBeenCalled()
  })

  it('signs out, clears drafts and goes to /login', async () => {
    auth.signOut.mockResolvedValue({ error: null })
    localStorage.setItem(`${LOCAL_DRAFT_PREFIX}add-income`, '{}')
    renderDialog()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ออกจากระบบ' }))
    })
    expect(auth.signOut).toHaveBeenCalledOnce()
    expect(localStorage.getItem(`${LOCAL_DRAFT_PREFIX}add-income`)).toBeNull()
    expect(nav.replace).toHaveBeenCalledWith('/login')
  })

  it('signs this device out even when the server cannot be reached (UF-AUTH-04)', async () => {
    auth.signOut.mockResolvedValue({ error: new TypeError('Failed to fetch') })
    renderDialog()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ออกจากระบบ' }))
    })
    expect(screen.getByRole('status')).toHaveTextContent('ออกจากระบบในเครื่องนี้แล้ว')
    expect(nav.replace).toHaveBeenCalledWith('/login')
  })

  it('stays open with a Thai message and reference when sign-out fails', async () => {
    auth.signOut.mockResolvedValue({ error: Object.assign(new Error('boom'), { code: 'unexpected_failure', status: 500 }) })
    renderDialog()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ออกจากระบบ' }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('ออกจากระบบไม่สำเร็จ')
    expect(screen.getByRole('alert')).toHaveTextContent(/รหัส [A-Z0-9]+/)
    expect(nav.replace).not.toHaveBeenCalled()
  })
})
