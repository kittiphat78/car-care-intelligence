import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appError } from '@/lib/errors'
import { ToastProvider } from '@/components/ui/Toast'
import type { Record as AppRecord } from '@/types'

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), search: '' }))
vi.mock('next/navigation', () => ({
  useRouter: () => nav,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(nav.search),
}))

const channel = { on: () => channel, subscribe: () => channel }
vi.mock('@/lib/supabase', () => ({ supabase: { channel: () => channel, removeChannel: vi.fn() } }))
vi.mock('@/hooks/useWeather', () => ({ useWeather: () => ({ data: null, refetch: vi.fn(), isRefetching: false }) }))
vi.mock('@/lib/observability', () => ({ reportAppError: vi.fn() }))
vi.mock('@/features/records/api', () => ({ getEntry: vi.fn(), updateEntry: vi.fn(), deleteEntry: vi.fn(), countVisitsByPlate: vi.fn() }))

const load = vi.hoisted(() => ({ loadDashboard: vi.fn() }))
vi.mock('../api', () => load)

import { DashboardScreen } from '../components/DashboardScreen'

const ok = <T,>(data: T) => ({ ok: true as const, data })
const today = { totalIncome: 500, paidIncome: 350, unpaidIncome: 150, expense: 100, washCount: 3, polishCount: 1, yesterdayIncome: 400 }
const row = (id: string, at: string, over: Partial<AppRecord> = {}): AppRecord =>
  ({ id, created_at: at, type: 'wash', plate: `กข ${id}`, services: ['รถเก๋ง', '', ''], price: 150, seq_number: 1, payment_status: 'paid', job_status: 'done', ...over }) as AppRecord

function data(over = {}) {
  return {
    todayRecords: ok([row('1', '2026-10-15T01:00:00Z'), row('2', '2026-10-15T04:00:00Z', { payment_status: 'unpaid', customer_name: 'เต็นท์ A' })]),
    today: ok(today),
    series: ok([]),
    customers: ok([]),
    unpaidRecords: ok([row('2', '2026-10-15T04:00:00Z', { payment_status: 'unpaid', customer_name: 'เต็นท์ A' })]),
    ...over,
  }
}

async function renderScreen() {
  await act(async () => {
    render(
      <ToastProvider>
        <DashboardScreen email="owner@example.com" />
      </ToastProvider>,
    )
  })
}

beforeEach(() => {
  nav.push.mockReset()
  nav.search = ''
  load.loadDashboard.mockReset().mockResolvedValue(data())
  sessionStorage.clear()
})

describe('DashboardScreen', () => {
  it('shows cash today, the debt card and today’s jobs newest first', async () => {
    await renderScreen()
    expect(screen.getByRole('heading', { level: 1, name: 'ภาพรวมวันนี้' })).toBeInTheDocument()
    const hero = screen.getByRole('region', { name: 'เงินสดสุทธิวันนี้' })
    expect(hero).toHaveTextContent('฿250')
    expect(hero).toHaveTextContent('25%')
    expect(screen.getByRole('link', { name: /ค้างชำระ/ })).toHaveAttribute('href', '/debts')
    const list = screen.getByRole('region', { name: /รายการวันนี้ \(2\)/ })
    const rows = within(list).getAllByRole('button', { name: /แตะเพื่อแก้ไข/ })
    // The name is the text on screen in the same order, plus a hint (WCAG 2.5.3 Label in Name)
    expect(rows[0]).toHaveAccessibleName(/^กข 2.*ค้างชำระ.*฿150.*แตะเพื่อแก้ไข$/)
  })

  it('keeps a place for the debt card while loading, so the cards below do not jump (O-09)', async () => {
    load.loadDashboard.mockReturnValue(new Promise(() => {}))
    await renderScreen()
    expect(screen.getByText('กำลังโหลดยอดค้างชำระ…')).toBeInTheDocument()
  })

  it('opens the edit dialog through the URL so the back button closes it, with no server request', async () => {
    const pushState = vi.spyOn(window.history, 'pushState')
    await renderScreen()
    fireEvent.click(screen.getAllByRole('button', { name: /แตะเพื่อแก้ไข/ })[0])
    expect(pushState).toHaveBeenCalledWith(null, '', '/?edit=income%3A2')
    expect(nav.push).not.toHaveBeenCalled()
    pushState.mockRestore()
  })
  it('shows an error in the failing card only, never ฿0', async () => {
    load.loadDashboard.mockResolvedValue(data({ today: { ok: false, error: appError('NETWORK') } }))
    await renderScreen()
    const hero = screen.getByRole('region', { name: 'เงินสดสุทธิวันนี้' })
    expect(within(hero).getByRole('alert')).toHaveTextContent('โหลดข้อมูลไม่สำเร็จ')
    expect(hero).not.toHaveTextContent('฿0')
    expect(screen.getByRole('region', { name: /รายการวันนี้/ })).toHaveTextContent('กข 1')
  })

  it('invites the first job on an empty day and says nothing is owed, in the same place (D-09)', async () => {
    load.loadDashboard.mockResolvedValue(data({ todayRecords: ok([]), unpaidRecords: ok([]), today: ok({ ...today, totalIncome: 0, paidIncome: 0 }) }))
    await renderScreen()
    expect(screen.getByText('ยังไม่มีงานวันนี้')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'บันทึกรายการแรก' })).toHaveAttribute('href', '/add')
    const card = screen.getByRole('link', { name: /ค้างชำระ.*ไม่มียอดค้าง/ })
    expect(card).toHaveAttribute('href', '/debts')
    expect(card).not.toHaveTextContent('฿')
  })

  it('highlights the record just saved on /add', async () => {
    load.loadDashboard.mockResolvedValue(data({ todayRecords: ok([row('9', '2026-10-15T05:00:00Z', { client_request_id: 'req-9' })]) }))
    sessionStorage.setItem('car-care-last-saved', 'req-9')
    await renderScreen()
    expect(screen.getByRole('button', { name: /กข 9/ })).toHaveAttribute('data-highlight', 'true')
    expect(sessionStorage.getItem('car-care-last-saved')).toBeNull()
  })
})
