import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appError } from '@/lib/errors'
import { ToastProvider } from '@/components/ui/Toast'
import type { Record as AppRecord } from '@/types'

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), search: '' }))
vi.mock('next/navigation', () => ({
  useRouter: () => nav,
  usePathname: () => '/debts',
  useSearchParams: () => new URLSearchParams(nav.search),
}))
const api = vi.hoisted(() => ({ listUnpaid: vi.fn(), settleRecords: vi.fn() }))
vi.mock('../api', () => api)
vi.mock('@/features/records/api', () => ({ getEntry: vi.fn(), updateEntry: vi.fn(), deleteEntry: vi.fn(), countVisitsByPlate: vi.fn() }))
vi.mock('@/lib/observability', () => ({ reportAppError: vi.fn() }))

import { DebtsScreen } from '../components/DebtsScreen'
import { groupDebts, platePreview, settleOutcome, sortDebts, debtTotals, URGENT_DAYS, UNNAMED_KEY } from '../logic'

const rec = (id: string, day: string, price: number, customer = ''): AppRecord =>
  ({ id, created_at: `${day}T03:00:00.000Z`, type: 'wash', plate: `กข ${id}`, services: ['', '', ''], price, seq_number: 1, payment_status: 'unpaid', job_status: 'done', customer_name: customer }) as AppRecord

const TODAY = '2026-10-15'
const unpaid = [
  rec('1', '2026-10-13', 1000, 'เต็นท์ A'),
  rec('2', '2026-09-20', 300, ' เต็นท์ A '),
  rec('3', '2026-10-01', 2000, 'เต็นท์ B'),
  rec('4', '2026-10-14', 150, ''),
]

describe('debt rules', () => {
  it('groups by trimmed name, unnamed jobs together, oldest first', () => {
    const groups = groupDebts(unpaid, TODAY)
    const a = groups.find((g) => g.key === 'เต็นท์ A')!
    expect(a.items.map((r) => r.id)).toEqual(['2', '1'])
    expect(a).toMatchObject({ total: 1300, oldestDays: 25, urgent: true })
    expect(groups.find((g) => g.key === UNNAMED_KEY)).toMatchObject({ name: 'ลูกค้าทั่วไป (ไม่ระบุชื่อ)', urgent: false })
    expect(debtTotals(groups)).toEqual({ total: 3450, customers: 3, cars: 4 })
  })

  it(`marks ${URGENT_DAYS}+ days as urgent and sorts by amount or by age`, () => {
    const groups = groupDebts(unpaid, TODAY)
    expect(sortDebts(groups, 'amount').map((g) => g.key)).toEqual(['เต็นท์ B', 'เต็นท์ A', UNNAMED_KEY])
    expect(sortDebts(groups, 'age').map((g) => g.key)).toEqual(['เต็นท์ A', 'เต็นท์ B', UNNAMED_KEY])
  })

  it('lists up to 6 plates then "และอีก N"', () => {
    const many = Array.from({ length: 8 }, (_, i) => rec(String(i), TODAY, 1))
    expect(platePreview(many)).toEqual({ plates: many.slice(0, 6).map((r) => r.plate), more: 2 })
  })

  it('tells a full, partial or empty settle apart (UF-DEBT-02)', () => {
    expect(settleOutcome(6, 6)).toBe('all')
    expect(settleOutcome(6, 5)).toBe('some')
    expect(settleOutcome(6, 0)).toBe('none')
  })
})

async function renderScreen() {
  await act(async () => {
    render(
      <ToastProvider>
        <DebtsScreen />
      </ToastProvider>,
    )
  })
}

beforeEach(() => {
  nav.push.mockReset()
  nav.replace.mockReset()
  nav.refresh.mockReset()
  nav.search = ''
  api.listUnpaid.mockReset().mockResolvedValue({ ok: true, data: unpaid })
  api.settleRecords.mockReset()
})

describe('DebtsScreen', () => {
  it('shows the total and one card per customer, largest first', async () => {
    await renderScreen()
    expect(screen.getByRole('heading', { level: 1, name: 'ค้างชำระ' })).toBeInTheDocument()
    const cards = screen.getAllByRole('article')
    expect(cards.map((c) => within(c).getByRole('heading').textContent)).toEqual(['เต็นท์ B', 'เต็นท์ A', 'ลูกค้าทั่วไป (ไม่ระบุชื่อ)'])
    expect(within(cards[1]).getByText(/เร่งด่วน · ค้างนานสุด/)).toBeInTheDocument()
  })

  it('opens the settle dialog through the URL', async () => {
    await renderScreen()
    fireEvent.click(screen.getByRole('button', { name: 'เคลียร์ยอด เต็นท์ A' }))
    expect(nav.push).toHaveBeenCalledWith('/debts?settle=%E0%B9%80%E0%B8%95%E0%B9%87%E0%B8%99%E0%B8%97%E0%B9%8C+A', { scroll: false })
  })

  it('settles exactly the jobs shown and confirms the amount', async () => {
    nav.search = 'settle=เต็นท์ A'
    api.settleRecords.mockResolvedValue({ ok: true, data: { updatedCount: 2, total: 1300 } })
    await renderScreen()
    const dialog = screen.getByRole('alertdialog', { name: 'เคลียร์ยอด เต็นท์ A?' })
    expect(dialog).toHaveTextContent('2 คัน')
    expect(dialog).toHaveTextContent('฿1,300')
    expect(within(dialog).getByRole('button', { name: 'ยกเลิก' })).toHaveFocus()
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'เคลียร์ยอด' }))
    })
    expect(api.settleRecords).toHaveBeenCalledWith(['2', '1'])
    expect(screen.getByRole('status')).toHaveTextContent('เคลียร์ยอด เต็นท์ A ฿1,300 แล้ว')
    expect(nav.refresh).toHaveBeenCalled()
  })

  it('says so when only some jobs could be settled', async () => {
    nav.search = 'settle=เต็นท์ A'
    api.settleRecords.mockResolvedValue({ ok: true, data: { updatedCount: 1, total: 1000 } })
    await renderScreen()
    await act(async () => {
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'เคลียร์ยอด' }))
    })
    expect(screen.getByRole('alertdialog')).toHaveTextContent('เคลียร์ยอดได้ 1 จาก 2 รายการ')
  })

  it('keeps the debt when settling fails', async () => {
    nav.search = 'settle=เต็นท์ A'
    api.settleRecords.mockResolvedValue({ ok: false, error: appError('NETWORK') })
    await renderScreen()
    await act(async () => {
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'เคลียร์ยอด' }))
    })
    expect(within(screen.getByRole('alertdialog')).getByRole('alert')).toHaveTextContent('เคลียร์ยอดไม่สำเร็จ ยอดยังไม่เปลี่ยน')
    expect(nav.refresh).not.toHaveBeenCalled()
  })

  it('shows an error, not ฿0, when the list cannot load', async () => {
    api.listUnpaid.mockResolvedValue({ ok: false, error: appError('SERVER') })
    await renderScreen()
    expect(screen.getByRole('alert')).toHaveTextContent('โหลดรายการค้างชำระไม่สำเร็จ')
    expect(screen.queryByText('฿0')).toBeNull()
  })

  it('celebrates an empty list', async () => {
    api.listUnpaid.mockResolvedValue({ ok: true, data: [] })
    await renderScreen()
    expect(screen.getByText('ไม่มีรายการค้างชำระ')).toBeInTheDocument()
  })
})
