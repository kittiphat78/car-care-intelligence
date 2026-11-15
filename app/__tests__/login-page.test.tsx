import { act, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/auth/components/LoginForm', () => ({ LoginForm: () => <form aria-label="เข้าสู่ระบบ" /> }))

import LoginPage from '../(auth)/login/page'

const setOnline = (value: boolean) => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value })
  act(() => {
    window.dispatchEvent(new Event(value ? 'online' : 'offline'))
  })
}

afterEach(() => setOnline(true))

describe('login page (screen-specifications.md §1)', () => {
  it('keeps the name and the description, and has the form', () => {
    render(<LoginPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'คาร์แคร์' })).toBeInTheDocument()
    // The description reads as one phrase even though part of it is drawn in a gradient
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'ระบบจัดการร้านล้างรถ')).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument()
  })

  it('names only things the app does, with no figures', () => {
    render(<LoginPage />)
    const items = within(screen.getByRole('list', { name: 'ทำอะไรได้บ้าง' })).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['บันทึกรายการ', 'ค้างชำระ', 'ส่งออก Excel'])
  })

  it('says online only while the browser has a connection', () => {
    render(<LoginPage />)
    expect(screen.getByText('ออนไลน์')).toBeInTheDocument()
    setOnline(false)
    expect(screen.getByText('ไม่มีอินเทอร์เน็ต')).toBeInTheDocument()
    expect(screen.queryByText('ออนไลน์')).not.toBeInTheDocument()
  })
})
