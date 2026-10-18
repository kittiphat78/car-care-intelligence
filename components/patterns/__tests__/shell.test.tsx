import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const nav = vi.hoisted(() => ({ pathname: '/', search: '' }))
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}))

import { BottomNav } from '../nav/BottomNav'
import { SideNav } from '../nav/SideNav'
import { badgeText, isActivePath, withLogoutParam } from '../nav/items'
import { StatusBar, envLabel } from '../StatusBar'
import { useTheme } from '../theme'

beforeEach(() => {
  nav.pathname = '/'
  nav.search = ''
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('nav helpers', () => {
  it('matches a section and its sub-pages but not look-alikes', () => {
    expect(isActivePath('/', '/')).toBe(true)
    expect(isActivePath('/history', '/')).toBe(false)
    expect(isActivePath('/history/2026', '/history')).toBe(true)
    expect(isActivePath('/historyx', '/history')).toBe(false)
  })

  it('caps badge numbers at 9+', () => {
    expect(badgeText(3)).toBe('3')
    expect(badgeText(9)).toBe('9')
    expect(badgeText(12)).toBe('9+')
  })

  it('adds ?logout=1 and keeps other parameters', () => {
    expect(withLogoutParam('/history', 'tab=expense')).toBe('/history?tab=expense&logout=1')
    expect(withLogoutParam('/', '')).toBe('/?logout=1')
  })
})

describe('BottomNav', () => {
  it('has five destinations in one labelled nav and marks the current page', () => {
    nav.pathname = '/history'
    render(<BottomNav />)
    const menu = screen.getByRole('navigation', { name: 'เมนูหลัก' })
    const links = within(menu).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['ภาพรวม', 'ค้างชำระ', 'บันทึก', 'ประวัติ', 'เพิ่มเติม'])
    expect(within(menu).getByRole('link', { name: 'ประวัติ' })).toHaveAttribute('aria-current', 'page')
    expect(within(menu).getByRole('link', { name: 'ภาพรวม' })).not.toHaveAttribute('aria-current')
  })

  it('shows a debts badge with the full number for screen readers', () => {
    render(<BottomNav badges={{ '/debts': 12 }} />)
    const debts = screen.getByRole('link', { name: /ค้างชำระ/ })
    expect(debts).toHaveTextContent('9+')
    expect(debts).toHaveTextContent('12 ราย')
  })
})

describe('SideNav', () => {
  it('links to /add as a button, shows the account and opens sign-out by URL', () => {
    nav.pathname = '/history'
    nav.search = 'tab=expense'
    render(<SideNav email="owner@example.com" />)
    expect(screen.getByRole('link', { name: 'บันทึกรายการ' })).toHaveAttribute('href', '/add')
    expect(screen.getByText('owner@example.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ออกจากระบบ' })).toHaveAttribute('href', '/history?tab=expense&logout=1')
    // /add is the button above, not repeated in the list
    expect(within(screen.getByRole('navigation')).queryByRole('link', { name: 'บันทึก' })).toBeNull()
  })
})

describe('StatusBar', () => {
  it('says which system this is outside production, and nothing on production', () => {
    expect(envLabel('production', 'production')).toBeNull()
    expect(envLabel('preview', 'other')).toBe('ระบบทดสอบ (Preview) · ข้อมูลในหน้านี้ไม่ใช่ข้อมูลจริง')
    expect(envLabel('development', 'production')).toContain('กำลังใช้ฐานข้อมูลจริงของร้าน')

    const { container } = render(<StatusBar appEnv="production" database="production" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows an offline bar while the device has no connection', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    render(<StatusBar appEnv="production" database="production" />)
    expect(screen.queryByRole('status')).toBeNull()

    onLine.mockReturnValue(false)
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByRole('status')).toHaveTextContent('ไม่มีอินเทอร์เน็ต')
    onLine.mockRestore()
  })
})

describe('theme', () => {
  function Toggle() {
    const { theme, toggle } = useTheme()
    return <button onClick={toggle}>{theme}</button>
  }

  it('keeps the v1 storage key and updates the page and browser colour', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)

    render(<Toggle />)
    expect(screen.getByRole('button')).toHaveTextContent('dark')
    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByRole('button')).toHaveTextContent('light')
    expect(localStorage.getItem('car-care-theme')).toBe('light')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(meta).toHaveAttribute('content', '#F4F6F9')
    meta.remove()
  })
})
