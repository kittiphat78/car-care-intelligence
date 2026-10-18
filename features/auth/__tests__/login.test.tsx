import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const nav = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), search: '' }))
vi.mock('next/navigation', () => ({
  useRouter: () => nav,
  usePathname: () => '/history',
  useSearchParams: () => new URLSearchParams(nav.search),
}))

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  listener: null as null | ((event: string) => void),
  onAuthStateChange: vi.fn(),
}))
auth.onAuthStateChange.mockImplementation((cb: (event: string) => void) => {
  auth.listener = cb
  return { data: { subscription: { unsubscribe: vi.fn() } } }
})
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }))

import { LoginForm, checkLogin } from '../components/LoginForm'
import { SessionExpiredDialog } from '../components/SessionExpiredDialog'
import { classifySignInError, signOut } from '../api'

beforeEach(() => {
  nav.replace.mockReset()
  nav.refresh.mockReset()
  nav.search = ''
  auth.signInWithPassword.mockReset()
  auth.signOut.mockReset()
  localStorage.clear()
})

const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: password } })
}
const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))
  })
}

describe('sign-in rules', () => {
  it('checks empty fields and the email format', () => {
    expect(checkLogin('', '')).toEqual({ email: 'กรุณากรอกอีเมล', password: 'กรุณากรอกรหัสผ่าน' })
    expect(checkLogin('owner@', 'x')).toEqual({ email: 'รูปแบบอีเมลไม่ถูกต้อง' })
    expect(checkLogin('owner@example.com', 'x')).toEqual({})
  })

  it('gives one message for a wrong email or password, and spots rate limits and network trouble', () => {
    expect(classifySignInError({ status: 400, code: 'invalid_credentials' })).toBe('invalid')
    expect(classifySignInError({ status: 429 })).toBe('rate_limited')
    expect(classifySignInError(new TypeError('Failed to fetch'))).toBe('network')
  })
})

describe('LoginForm', () => {
  it('does not call Supabase with an empty form and focuses the first problem', async () => {
    render(<LoginForm />)
    await submit()
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
    expect(screen.getByLabelText('อีเมล')).toHaveFocus()
    expect(screen.getByText('กรุณากรอกอีเมล')).toBeInTheDocument()
  })

  it('on wrong details clears the password and puts the cursor there (UF-AUTH-01)', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: { status: 400, code: 'invalid_credentials' } })
    render(<LoginForm />)
    fill('owner@example.com', 'wrong')
    await submit()
    expect(screen.getByRole('alert')).toHaveTextContent('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    expect(screen.getByLabelText('รหัสผ่าน')).toHaveValue('')
    expect(screen.getByLabelText('รหัสผ่าน')).toHaveFocus()
    expect(screen.getByLabelText('อีเมล')).toHaveValue('owner@example.com')
  })

  it('signs in, remembers the email and goes back to the page that asked (same site only)', async () => {
    nav.search = 'next=%2Fhistory%3Ftab%3Dexpense'
    auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null })
    render(<LoginForm />)
    fill(' owner@example.com ', 'secret')
    fireEvent.click(screen.getByRole('checkbox', { name: 'จดจำอีเมล' }))
    await submit()
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'owner@example.com', password: 'secret' })
    expect(localStorage.getItem('remembered_email')).toBe('owner@example.com')
    expect(nav.replace).toHaveBeenCalledWith('/history?tab=expense')
  })

  it('ignores a next link to another website', async () => {
    nav.search = 'next=https%3A%2F%2Fevil.example'
    auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null })
    render(<LoginForm />)
    fill('owner@example.com', 'secret')
    await submit()
    expect(nav.replace).toHaveBeenCalledWith('/')
  })

  it('fills in a remembered email', () => {
    localStorage.setItem('remembered_email', 'saved@example.com')
    render(<LoginForm />)
    expect(screen.getByLabelText('อีเมล')).toHaveValue('saved@example.com')
    expect(screen.getByRole('checkbox', { name: 'จดจำอีเมล' })).toBeChecked()
  })

  it('shows or hides the password with a focusable button', () => {
    render(<LoginForm />)
    const toggle = screen.getByRole('button', { name: 'แสดงรหัสผ่าน' })
    expect(toggle).not.toHaveAttribute('tabindex', '-1')
    fireEvent.click(toggle)
    expect(screen.getByLabelText('รหัสผ่าน')).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'ซ่อนรหัสผ่าน' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('SessionExpiredDialog (UF-AUTH-03)', () => {
  it('asks to sign in again when the session ends by itself, and returns to the same page', () => {
    nav.search = 'tab=expense'
    render(<SessionExpiredDialog />)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    act(() => auth.listener?.('SIGNED_OUT'))
    expect(screen.getByRole('alertdialog', { name: 'กรุณาเข้าสู่ระบบอีกครั้ง' })).toHaveTextContent('ข้อมูลที่กรอกไว้ยังอยู่')
    expect(screen.getByRole('button', { name: 'เข้าสู่ระบบ' })).toHaveFocus()
  })

  it('stays quiet when this tab signs out on purpose', async () => {
    render(<SessionExpiredDialog />)
    auth.signOut.mockImplementation(async () => {
      auth.listener?.('SIGNED_OUT')
      return { error: null }
    })
    await act(async () => {
      await signOut()
    })
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})

describe('signOut (UF-AUTH-04)', () => {
  afterEach(() => {
    document.cookie = 'sb-test-auth-token=; Max-Age=0; path=/'
    document.cookie = 'remembered=; Max-Age=0; path=/'
  })

  it('ends this device only, never every device of the account (D-03)', async () => {
    auth.signOut.mockResolvedValue({ error: null })
    expect(await signOut()).toEqual({ ok: true, data: { localOnly: false } })
    expect(auth.signOut).toHaveBeenCalledOnce()
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('still signs this device out when the server cannot be reached', async () => {
    document.cookie = 'sb-test-auth-token=session; path=/'
    document.cookie = 'remembered=yes; path=/'
    // What Supabase returns when the request fails: the session is left in place
    auth.signOut.mockResolvedValue({ error: Object.assign(new Error('Failed to fetch'), { name: 'AuthRetryableFetchError', status: 0 }) })
    expect(await signOut()).toEqual({ ok: true, data: { localOnly: true } })
    expect(document.cookie).not.toContain('sb-test-auth-token')
    expect(document.cookie).toContain('remembered=yes')
  })

  it('reports other failures and keeps the session', async () => {
    document.cookie = 'sb-test-auth-token=session; path=/'
    auth.signOut.mockResolvedValue({ error: Object.assign(new Error('boom'), { code: 'unexpected_failure', status: 500 }) })
    const result = await signOut()
    expect(result.ok).toBe(false)
    expect(document.cookie).toContain('sb-test-auth-token')
  })
})
