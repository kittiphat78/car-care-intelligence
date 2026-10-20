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
const customersApi = vi.hoisted(() => ({ listCustomers: vi.fn(), saveCustomer: vi.fn(), deleteCustomer: vi.fn(), getCustomer: vi.fn() }))
vi.mock('@/features/customers/api', () => customersApi)
vi.mock('@/lib/observability', () => ({ reportAppError: vi.fn() }))

import { DebtsScreen } from '../components/DebtsScreen'
import { groupDebts, platePreview, settleOutcome, sortDebts, debtTotals, URGENT_DAYS, UNNAMED_KEY } from '../logic'
import { forgetCustomers } from '@/features/customers/memory'
import { plateCore, plateKey } from '@/features/customers/logic'
import type { Customer } from '@/features/customers/types'

/** A directory customer (customer directory, US-10) */
const dirCustomer = (id: string, name: string, phone: string | null, plates: string[] = []): Customer => ({
  id,
  name,
  note: null,
  created_at: '2026-10-20T03:00:00Z',
  created_by_email: null,
  updated_at: null,
  updated_by_email: null,
  customer_phones: phone ? [{ id: `${id}-p`, number: phone, label: null, is_primary: true, position: 0 }] : [],
  customer_vehicles: plates.map((plate, i) => ({
    id: `${id}-v${i}`, plate, plate_key: plateKey(plate), plate_core: plateCore(plate), car_type: null, brand: null, model: null, color: null, note: null, position: i,
  })),
})

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
  customersApi.listCustomers.mockReset().mockResolvedValue({ ok: true, data: [] })
  forgetCustomers()
})

describe('DebtsScreen', () => {
  it('shows the total and one card per customer, largest first', async () => {
    await renderScreen()
    expect(screen.getByRole('heading', { level: 1, name: 'ค้างชำระ' })).toBeInTheDocument()
    const cards = screen.getAllByRole('article')
    expect(cards.map((c) => within(c).getByRole('heading').textContent)).toEqual(['เต็นท์ B', 'เต็นท์ A', 'ลูกค้าทั่วไป (ไม่ระบุชื่อ)'])
    expect(within(cards[1]).getByText(/เร่งด่วน · ค้างนานสุด/)).toBeInTheDocument()
  })

  it('opens the settle dialog through the URL, with no server request', async () => {
    const pushState = vi.spyOn(window.history, 'pushState')
    await renderScreen()
    fireEvent.click(screen.getByRole('button', { name: 'เคลียร์ยอด เต็นท์ A' }))
    expect(pushState).toHaveBeenCalledWith(null, '', '/debts?settle=%E0%B9%80%E0%B8%95%E0%B9%87%E0%B8%99%E0%B8%97%E0%B9%8C+A')
    expect(nav.push).not.toHaveBeenCalled()
    pushState.mockRestore()
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
  })

  it('refreshes the nav badge only once ?settle= has left the URL (D-12)', async () => {
    nav.search = 'settle=เต็นท์ A'
    api.settleRecords.mockResolvedValue({ ok: true, data: { updatedCount: 2, total: 1300 } })
    const replaceState = vi.spyOn(window.history, 'replaceState')
    await renderScreen()
    await act(async () => {
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'เคลียร์ยอด' }))
    })
    // Closing: the URL still has ?settle= — a refresh now would be for that old URL
    expect(replaceState).toHaveBeenCalledWith(null, '', '/debts')
    replaceState.mockRestore()
    expect(nav.refresh).not.toHaveBeenCalled()
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()

    // The URL has changed (seen on the next render): now the refresh is for /debts
    nav.search = ''
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'เพิ่มเบอร์ เต็นท์ B' }))
    })
    expect(nav.refresh).toHaveBeenCalledOnce()
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

  it('calls the customer from the directory, by name or by plate (US-10)', async () => {
    customersApi.listCustomers.mockResolvedValue({
      ok: true,
      data: [dirCustomer('a', 'เต็นท์ A', '0800000001'), dirCustomer('d', 'ทดสอบ คุณดี', '0800000004', ['กข-4 ชร.'])],
    })
    await renderScreen()
    const [b, a, unnamed] = screen.getAllByRole('article')
    // Same name
    expect(within(a).getByRole('link', { name: 'โทร 080-000-0001 เต็นท์ A' })).toHaveAttribute('href', 'tel:0800000001')
    // The unnamed group, by the plate of its job; says who is called
    expect(within(unnamed).getByRole('link', { name: 'โทร 080-000-0004 ทดสอบ คุณดี' })).toBeInTheDocument()
    expect(within(unnamed).getByText(/ในสมุดลูกค้า:/)).toHaveTextContent('ทดสอบ คุณดี')
    // Not in the directory: add the number from the card (AC-10-3)
    const pushState = vi.spyOn(window.history, 'pushState')
    fireEvent.click(within(b).getByRole('button', { name: 'เพิ่มเบอร์ เต็นท์ B' }))
    expect(pushState).toHaveBeenCalledWith(null, '', '/debts?customer=new')
    pushState.mockRestore()
  })

  it('opens the new-customer form with the name and plates of the card', async () => {
    await renderScreen()
    // The click adds ?customer=new (the mocked router only sees it on the next render)
    nav.search = 'customer=new'
    fireEvent.click(within(screen.getAllByRole('article')[0]).getByRole('button', { name: 'เพิ่มเบอร์ เต็นท์ B' }))
    const form = await screen.findByRole('dialog', { name: 'เพิ่มลูกค้า' })
    expect(within(form).getByRole('textbox', { name: /ชื่อลูกค้า/ })).toHaveValue('เต็นท์ B')
    expect(within(form).getByRole('textbox', { name: 'ทะเบียน' })).toHaveValue('กข 3')
  })

  it('lets the user pick when several customers match (AC-10-2)', async () => {
    customersApi.listCustomers.mockResolvedValue({
      ok: true,
      data: [dirCustomer('x', 'ทดสอบ คนที่ 1', '0800000005', ['กข 1']), dirCustomer('y', 'เต็นท์ A', null)],
    })
    await renderScreen()
    const a = screen.getAllByRole('article')[1]
    fireEvent.click(within(a).getByRole('button', { name: 'โทร… (2 ราย) เต็นท์ A' }))
    const picker = screen.getByRole('dialog', { name: 'โทรหา เต็นท์ A' })
    expect(within(picker).getByRole('link', { name: 'โทร 080-000-0005 ทดสอบ คนที่ 1' })).toBeInTheDocument()
    expect(within(picker).getByText('ยังไม่มีเบอร์')).toBeInTheDocument()
  })

  it('shows the cards without contact buttons when the directory cannot load', async () => {
    customersApi.listCustomers.mockResolvedValue({ ok: false, error: appError('SERVER') })
    await renderScreen()
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /เพิ่มเบอร์/ })).toBeNull()
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
