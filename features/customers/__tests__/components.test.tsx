import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appError } from '@/lib/errors'
import { ToastProvider } from '@/components/ui/Toast'

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), search: '', pathname: '/customers' }))
vi.mock('next/navigation', () => ({
  useRouter: () => nav,
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}))
const api = vi.hoisted(() => ({ listCustomers: vi.fn(), getCustomer: vi.fn(), saveCustomer: vi.fn(), deleteCustomer: vi.fn(), getCustomerHistory: vi.fn() }))
vi.mock('../api', () => api)
vi.mock('@/features/records/api', () => ({ countVisitsByPlate: vi.fn() }))
vi.mock('@/lib/observability', () => ({ reportAppError: vi.fn() }))

import { plateCore, plateKey } from '../logic'
import { forgetCustomers } from '../memory'
import { customerDraftKey } from '../hooks'
import type { Customer, CustomerPhone, CustomerVehicle } from '../types'
import { CallLink, CopyNumberButton } from '../components/CallButton'
import { CustomerFormDialog, type CustomerFormDialogProps } from '../components/CustomerFormDialog'
import { CustomersScreen } from '../components/CustomersScreen'
import { CustomerDetailScreen } from '../components/CustomerDetailScreen'

// Test data follows the spec: names "ทดสอบ …", numbers 080-000-000x

const phone = (id: string, number: string, extra: Partial<CustomerPhone> = {}): CustomerPhone => ({ id, number, label: null, is_primary: false, position: 0, ...extra })
const vehicle = (id: string, plate: string, position = 0): CustomerVehicle => ({
  id,
  plate,
  plate_key: plateKey(plate),
  plate_core: plateCore(plate),
  car_type: null,
  brand: null,
  model: null,
  color: null,
  note: null,
  position,
})
const customer = (id: string, name: string, phones: CustomerPhone[], vehicles: CustomerVehicle[], extra: Partial<Customer> = {}): Customer => ({
  id,
  name,
  note: null,
  created_at: '2026-10-20T03:00:00Z',
  created_by_email: 'owner@example.com',
  updated_at: null,
  updated_by_email: null,
  customer_phones: phones,
  customer_vehicles: vehicles,
  ...extra,
})

const A = customer(
  'a',
  'ทดสอบ เต็นท์ A',
  [phone('p1', '0800000001', { is_primary: true, label: 'เจ้าของ' }), phone('p2', '0800000002', { position: 1, label: 'เซลส์' })],
  [{ ...vehicle('v1', '1กข 1234'), car_type: 'pickup', brand: 'toyota', model: 'Hilux Revo' }, vehicle('v2', '2ขค 5678', 1), vehicle('v3', '3คง 9', 2)],
)
const B = customer('b', 'ทดสอบ คุณบี', [phone('p3', '0800000003', { is_primary: true })], [vehicle('v4', '4จฉ 1111'), vehicle('v5', '7777', 1)])

const noHistory = { visits: 0, lastVisit: null, total: 0, unpaidTotal: 0, unpaidCount: 0, digitsOnly: 0, recent: [] }
const job = (id: string, plate: string, price: number, payment_status: 'paid' | 'unpaid', created_at: string) =>
  ({ id, plate, price, payment_status, created_at, type: 'wash', services: ['', '', ''], customer_name: 'ทดสอบ เต็นท์ A', job_status: 'done', seq_number: null }) as never

const textbox = (name: string | RegExp) => screen.getByRole('textbox', { name })
const type = (name: string | RegExp, value: string) => fireEvent.change(textbox(name), { target: { value } })
const press = async (name: string | RegExp) => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }))
  })
}

beforeEach(() => {
  for (const fn of [nav.push, nav.replace, nav.back]) fn.mockReset()
  nav.search = ''
  nav.pathname = '/customers'
  api.listCustomers.mockReset().mockResolvedValue({ ok: true, data: [A, B] })
  api.saveCustomer.mockReset().mockResolvedValue({ ok: true, data: { id: 'new-id', updated_at: null } })
  api.deleteCustomer.mockReset().mockResolvedValue({ ok: true, data: undefined })
  api.getCustomerHistory.mockReset().mockResolvedValue({ ok: true, data: noHistory })
  sessionStorage.clear()
  localStorage.clear()
  forgetCustomers()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── Call and copy ────────────────────────────────────────────────────────────

describe('CallLink and CopyNumberButton', () => {
  it('dials the stored number; the name read aloud starts with the visible text (AC-03-1)', () => {
    render(<CallLink number="0800000001" who="ทดสอบ เต็นท์ A" />)
    const link = screen.getByRole('link', { name: 'โทร 080-000-0001 ทดสอบ เต็นท์ A' })
    expect(link).toHaveAttribute('href', 'tel:0800000001')
    expect(link).toHaveTextContent('โทร 080-000-0001')
  })

  it('renders nothing for a number that cannot be dialled', () => {
    const { container } = render(<CallLink number="12345" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('copies the digits and says so; tells the user what to do when the browser refuses (AC-04-1)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(
      <ToastProvider>
        <CopyNumberButton number="0800000001" who="ทดสอบ เต็นท์ A" />
      </ToastProvider>,
    )
    await press('คัดลอกเบอร์ 080-000-0001 ทดสอบ เต็นท์ A')
    expect(writeText).toHaveBeenCalledWith('0800000001')
    expect(screen.getByRole('status')).toHaveTextContent('คัดลอก 080-000-0001 แล้ว')

    writeText.mockRejectedValueOnce(new Error('denied'))
    await press('คัดลอกเบอร์ 080-000-0001 ทดสอบ เต็นท์ A')
    expect(screen.getAllByRole('status').at(-1)).toHaveTextContent('แตะค้างที่เบอร์')
  })
})

// ── Form ─────────────────────────────────────────────────────────────────────

function renderForm(props: Partial<CustomerFormDialogProps> = {}) {
  const handlers = { onSaved: vi.fn(), onClose: vi.fn(), onReload: vi.fn() }
  const view = render(
    <ToastProvider>
      <CustomerFormDialog open customer={null} customers={[A, B]} userId="user-1" {...handlers} {...props} />
    </ToastProvider>,
  )
  return { ...handlers, ...view }
}

describe('CustomerFormDialog', () => {
  it('Enter moves to the next field and never saves (AC-01-4)', () => {
    renderForm()
    const name = textbox(/ชื่อลูกค้า/)
    name.focus()
    fireEvent.keyDown(name, { key: 'Enter' })
    expect(api.saveCustomer).not.toHaveBeenCalled()
    expect(textbox('เบอร์')).toHaveFocus()
  })

  it('does not save without a name or with a wrong number, and lists what to fix (AC-01-2)', async () => {
    renderForm()
    type('เบอร์', '0812')
    await press('บันทึก')
    expect(api.saveCustomer).not.toHaveBeenCalled()
    const summary = screen.getByText('กรุณาแก้ไข 2 ช่อง').closest('[role="alert"]')!
    expect(summary).toHaveFocus()
    expect(summary).toHaveTextContent('กรุณากรอกชื่อลูกค้า')
    expect(summary).toHaveTextContent('เบอร์มือถือต้องมี 10 หลัก')
    expect(textbox(/ชื่อลูกค้า/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('saves a customer with 2 numbers and 2 vehicles in one call, once (AC-01-1, AC-01-3)', async () => {
    let finish: (value: unknown) => void = () => {}
    api.saveCustomer.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
    const { onSaved } = renderForm()

    type(/ชื่อลูกค้า/, 'ทดสอบ เต็นท์ C')
    type('เบอร์', '080-000-0005')
    await press('เพิ่มเบอร์')
    expect(textbox('เบอร์ 2')).toHaveFocus()
    type('เบอร์ 2', '080 000 0006')
    fireEvent.click(screen.getByRole('radio', { name: 'เบอร์หลัก: เบอร์ 2' }))
    type('ทะเบียน', '5ชซ 2222')
    fireEvent.click(screen.getByRole('radio', { name: 'รถกระบะ' }))
    fireEvent.change(screen.getByLabelText('ยี่ห้อ'), { target: { value: 'toyota' } })
    type('รุ่น', ' Hilux Revo ')
    await press('เพิ่มรถ')
    fireEvent.change(screen.getAllByRole('textbox', { name: 'ทะเบียน' })[1], { target: { value: '6ญฎ 3333' } })

    await press('บันทึก')
    // A second press while saving does nothing
    fireEvent.click(screen.getByRole('button', { name: /บันทึก/ }))
    expect(api.saveCustomer).toHaveBeenCalledOnce()
    const [payload, options] = api.saveCustomer.mock.calls[0]
    expect(payload).toEqual({
      name: 'ทดสอบ เต็นท์ C',
      note: null,
      phones: [
        { number: '0800000005', label: null, is_primary: false },
        { number: '0800000006', label: null, is_primary: true },
      ],
      vehicles: [
        { plate: '5ชซ 2222', car_type: 'pickup', brand: 'toyota', model: 'Hilux Revo', color: null, note: null },
        { plate: '6ญฎ 3333', car_type: null, brand: null, model: null, color: null, note: null },
      ],
    })
    expect(options).toEqual({ id: null, expectedUpdatedAt: null, requestId: expect.any(String), moves: [] })

    await act(async () => finish({ ok: true, data: { id: 'new-id', updated_at: null } }))
    expect(onSaved).toHaveBeenCalledWith({ id: 'new-id', updated_at: null }, true)
    expect(screen.getByRole('status')).toHaveTextContent('เพิ่มลูกค้า ทดสอบ เต็นท์ C แล้ว')
    expect(sessionStorage.getItem(customerDraftKey('user-1'))).toBeNull()
  })

  it('retrying after a lost connection sends the same request id (AC-01-3)', async () => {
    api.saveCustomer.mockResolvedValueOnce({ ok: false, error: appError('NETWORK') })
    renderForm()
    type(/ชื่อลูกค้า/, 'ทดสอบ เต็นท์ C')
    await press('บันทึก')
    expect(screen.getByText('บันทึกไม่สำเร็จ ข้อมูลยังอยู่ในฟอร์ม')).toBeInTheDocument()
    await press('บันทึก')
    const [first, second] = api.saveCustomer.mock.calls.map((call) => call[1].requestId)
    expect(second).toBe(first)
  })

  it('a full plate of another customer needs "ย้ายรถมาที่ลูกค้านี้" (AC-08-1, AC-08-2)', async () => {
    renderForm()
    type(/ชื่อลูกค้า/, 'ทดสอบ เต็นท์ C')
    type('ทะเบียน', '4จฉ-1111 ชร.')
    expect(screen.getByText('ทะเบียนนี้อยู่กับ ทดสอบ คุณบี')).toBeInTheDocument()
    await press('บันทึก')
    expect(api.saveCustomer).not.toHaveBeenCalled()

    await press('ย้ายรถมาที่ลูกค้านี้')
    expect(screen.getByText(/จะย้ายรถคันนี้จาก ทดสอบ คุณบี/)).toBeInTheDocument()
    await press('บันทึก')
    expect(api.saveCustomer.mock.calls[0][1].moves).toEqual(['4จฉ1111'])
  })

  it('a digits-only plate or a number another customer has only warns (AC-08-3, AC-09-2)', async () => {
    renderForm()
    type(/ชื่อลูกค้า/, 'ทดสอบ เต็นท์ C')
    type('ทะเบียน', '7777')
    type('เบอร์', '080-000-0001')
    expect(screen.getByText(/ทะเบียน 7777 มีกับ ทดสอบ คุณบี ด้วย/)).toBeInTheDocument()
    expect(screen.getByText(/เบอร์นี้เป็นของ ทดสอบ เต็นท์ A ด้วย/)).toBeInTheDocument()
    await press('บันทึก')
    expect(api.saveCustomer).toHaveBeenCalledOnce()
    expect(api.saveCustomer.mock.calls[0][1].moves).toEqual([])
  })

  it('cannot save offline and says why (AC-01-4)', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    renderForm()
    expect(screen.getByRole('button', { name: /รอเชื่อมต่อ/ })).toBeDisabled()
    expect(screen.getByText(/ไม่มีอินเทอร์เน็ต/)).toBeInTheDocument()
  })

  it('keeps what was typed through a reload, and "ล้างฟอร์ม" forgets it (AC-01-5)', () => {
    const first = renderForm()
    type(/ชื่อลูกค้า/, 'ทดสอบ เต็นท์ D')
    first.unmount()

    renderForm()
    expect(textbox(/ชื่อลูกค้า/)).toHaveValue('ทดสอบ เต็นท์ D')
    expect(screen.getByText('กู้ข้อมูลที่กรอกค้างไว้แล้ว')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ล้างฟอร์ม' }))
    expect(textbox(/ชื่อลูกค้า/)).toHaveValue('')
    expect(sessionStorage.getItem(customerDraftKey('user-1'))).toBeNull()
  })

  it('starts from the search text in the matching field (AC-02-5)', () => {
    const view = renderForm({ start: { query: '081-234' } })
    expect(textbox('เบอร์')).toHaveValue('081234')
    view.unmount()
    sessionStorage.clear()
    renderForm({ start: { query: '1กข' } })
    expect(textbox('ทะเบียน')).toHaveValue('1กข')
  })

  it('asks before throwing away what was typed', async () => {
    const { onClose } = renderForm()
    type(/ชื่อลูกค้า/, 'ทดสอบ เต็นท์ D')
    await press('ยกเลิก')
    const confirm = screen.getByRole('alertdialog', { name: 'ทิ้งข้อมูลที่กรอก?' })
    expect(within(confirm).getByRole('button', { name: 'กลับไปกรอกต่อ' })).toHaveFocus()
    fireEvent.click(within(confirm).getByRole('button', { name: 'ทิ้งข้อมูล' }))
    expect(onClose).toHaveBeenCalled()
    expect(sessionStorage.getItem(customerDraftKey('user-1'))).toBeNull()
  })

  it('edits with the loaded version and is disabled until something changes (AC-06-1)', async () => {
    const { onSaved } = renderForm({ customer: { ...A, updated_at: '2026-10-20T05:00:00Z' } })
    expect(screen.getByRole('heading', { name: 'แก้ไขลูกค้า' })).toBeInTheDocument()
    expect(textbox('เบอร์ 1')).toHaveValue('0800000001')
    expect(screen.getAllByRole('textbox', { name: 'ทะเบียน' })).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'บันทึก' })).toBeDisabled()

    type(/ชื่อลูกค้า/, 'ทดสอบ เต็นท์ A2')
    await press('บันทึก')
    expect(api.saveCustomer.mock.calls[0][1]).toEqual({ id: 'a', expectedUpdatedAt: '2026-10-20T05:00:00Z', requestId: null, moves: [] })
    expect(onSaved).toHaveBeenCalledWith({ id: 'new-id', updated_at: null }, false)
  })

  it('a change from another device is not overwritten (AC-06-2)', async () => {
    api.saveCustomer.mockResolvedValueOnce({ ok: false, error: appError('CONFLICT') })
    const { onReload } = renderForm({ customer: A })
    type(/ชื่อลูกค้า/, 'ทดสอบ เต็นท์ A2')
    await press('บันทึก')
    expect(screen.getByText('ลูกค้านี้ถูกแก้จากเครื่องอื่น')).toBeInTheDocument()
    await press('โหลดข้อมูลล่าสุด')
    expect(onReload).toHaveBeenCalled()
  })

  it('a deleted customer closes the form; a plate taken meanwhile reloads the directory', async () => {
    api.saveCustomer.mockResolvedValueOnce({ ok: false, error: appError('NOT_FOUND') })
    const first = renderForm({ customer: A })
    type(/ชื่อลูกค้า/, 'ทดสอบ เต็นท์ A2')
    await press('บันทึก')
    expect(first.onClose).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('ไม่พบลูกค้านี้')
    first.unmount()

    api.saveCustomer.mockResolvedValueOnce({ ok: false, error: { ...appError('VALIDATION'), field: 'plate' } })
    const second = renderForm()
    type(/ชื่อลูกค้า/, 'ทดสอบ เต็นท์ C')
    await press('บันทึก')
    expect(second.onReload).toHaveBeenCalled()
    expect(screen.getByText('ทะเบียนนี้เพิ่งถูกเพิ่มให้ลูกค้าคนอื่น')).toBeInTheDocument()
  })
})

// ── List ─────────────────────────────────────────────────────────────────────

async function renderList() {
  render(
    <ToastProvider>
      <CustomersScreen userId="user-1" />
    </ToastProvider>,
  )
  await screen.findByText('ทั้งหมด 2 ราย')
}

describe('CustomersScreen', () => {
  it('lists customers with a call button and a link to each one', async () => {
    await renderList()
    expect(screen.getByRole('link', { name: /^ทดสอบ เต็นท์ A/ })).toHaveAttribute('href', '/customers/a')
    expect(screen.getByRole('link', { name: 'โทร 080-000-0001 ทดสอบ เต็นท์ A' })).toHaveAttribute('href', 'tel:0800000001')
    // The first vehicle with its brand and model (owner request, M013)
    expect(screen.getByText('1กข 1234 · TOYOTA Hilux Revo · +2 คัน')).toBeInTheDocument()
  })

  it.each([
    ['เต็นท์', 'ตรงกับ: ชื่อ'],
    ['0002', 'ตรงกับ: เบอร์ 080-000-0002'],
    ['000-0002', 'ตรงกับ: เบอร์ 080-000-0002'],
    ['1 กข', 'ตรงกับ: ทะเบียน 1กข 1234'],
    ['5678', 'ตรงกับ: ทะเบียน 2ขค 5678'],
  ])('finds "%s" and says which field matched (AC-02-1..3)', async (query, match) => {
    await renderList()
    fireEvent.change(screen.getByRole('searchbox', { name: 'ค้นหาชื่อ เบอร์ หรือทะเบียน' }), { target: { value: query } })
    expect(screen.getByText(match)).toBeInTheDocument()
    expect(screen.getByText('พบ 1 ราย')).toBeInTheDocument()
    expect(screen.queryByText('ทดสอบ คุณบี')).toBeNull()
  })

  it('writes the search to the URL without a server request (AC-02-4)', async () => {
    const replaceState = vi.spyOn(window.history, 'replaceState')
    await renderList()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '0002' } })
    await waitFor(() => expect(replaceState).toHaveBeenCalledWith(null, '', '/customers?q=0002'))
    expect(nav.push).not.toHaveBeenCalled()
    expect(nav.replace).not.toHaveBeenCalled()
  })

  it('opening a customer right after typing writes the search at once and never later (AC-02-4)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const replaceState = vi.spyOn(window.history, 'replaceState')
    await renderList()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'เต็นท์' } })
    fireEvent.click(screen.getByRole('link', { name: /^ทดสอบ เต็นท์ A/ }))
    expect(replaceState).toHaveBeenCalledWith(null, '', '/customers?q=%E0%B9%80%E0%B8%95%E0%B9%87%E0%B8%99%E0%B8%97%E0%B9%8C')
    replaceState.mockClear()
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    // A late change would cancel the navigation that is under way
    expect(replaceState).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('offers to add the customer that was not found, with the search filled in (AC-02-5)', async () => {
    const pushState = vi.spyOn(window.history, 'pushState')
    nav.search = 'q=0812'
    await renderList()
    expect(screen.getByText('ไม่พบ “0812”')).toBeInTheDocument()
    await press('เพิ่มลูกค้าใหม่ด้วยเบอร์ 0812')
    expect(pushState).toHaveBeenCalledWith(null, '', '/customers?q=0812&new=search')
  })

  it('opens the form from the URL and goes to the new customer after saving', async () => {
    nav.search = 'q=0812&new=search'
    await renderList()
    // The dialog opens once the directory has loaded
    expect(await screen.findByRole('heading', { name: 'เพิ่มลูกค้า' })).toBeInTheDocument()
    expect(textbox('เบอร์')).toHaveValue('0812')
    type('เบอร์', '080-000-0007')
    type(/ชื่อลูกค้า/, 'ทดสอบ เต็นท์ E')
    await press('บันทึก')
    expect(nav.replace).toHaveBeenCalledWith('/customers/new-id')
  })

  it('an empty directory invites the first customer, and a search in it still offers to add', async () => {
    api.listCustomers.mockResolvedValue({ ok: true, data: [] })
    render(
      <ToastProvider>
        <CustomersScreen userId="user-1" />
      </ToastProvider>,
    )
    expect(await screen.findByText('ยังไม่มีลูกค้า')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ทดสอบ เต็นท์ F' } })
    expect(screen.getByText('ไม่พบ “ทดสอบ เต็นท์ F”')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'เพิ่มลูกค้าใหม่ชื่อ ทดสอบ เต็นท์ F' })).toBeInTheDocument()
  })

  it('shows a load failure with a retry instead of an empty list', async () => {
    api.listCustomers.mockResolvedValueOnce({ ok: false, error: appError('SERVER') })
    render(
      <ToastProvider>
        <CustomersScreen userId="user-1" />
      </ToastProvider>,
    )
    expect(await screen.findByText('โหลดรายชื่อลูกค้าไม่สำเร็จ')).toBeInTheDocument()
    await press('ลองอีกครั้ง')
    expect(await screen.findByText('ทั้งหมด 2 ราย')).toBeInTheDocument()
  })
})

// ── Customer page ────────────────────────────────────────────────────────────

async function renderDetail(id = 'a') {
  nav.pathname = `/customers/${id}`
  render(
    <ToastProvider>
      <CustomerDetailScreen id={id} />
    </ToastProvider>,
  )
  await waitFor(() => expect(api.listCustomers).toHaveBeenCalled())
}

describe('CustomerDetailScreen', () => {
  it('shows every number with call and copy, the main one marked, and every vehicle (AC-05-1)', async () => {
    await renderDetail()
    expect(await screen.findByRole('heading', { level: 1, name: 'ทดสอบ เต็นท์ A' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'โทร 080-000-0001 ทดสอบ เต็นท์ A' })).toHaveAttribute('href', 'tel:0800000001')
    expect(screen.getByRole('link', { name: 'โทร 080-000-0002 ทดสอบ เต็นท์ A' })).toHaveAttribute('href', 'tel:0800000002')
    expect(screen.getAllByRole('button', { name: /คัดลอกเบอร์/ })).toHaveLength(2)
    expect(screen.getByText('เบอร์หลัก')).toBeInTheDocument()
    for (const plate of ['1กข 1234', '2ขค 5678', '3คง 9']) expect(screen.getByText(plate)).toBeInTheDocument()
    expect(screen.getByText('รถกระบะ · TOYOTA Hilux Revo')).toBeInTheDocument()
  })

  it('says when the customer does not exist (AC-05-2)', async () => {
    await renderDetail('missing')
    expect(await screen.findByText('ไม่พบลูกค้านี้')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'กลับรายชื่อลูกค้า' })).toHaveAttribute('href', '/customers')
  })

  it('deletes after a confirmation that says what goes and what stays (AC-07-1, AC-07-2)', async () => {
    await renderDetail()
    await screen.findByRole('heading', { level: 1 })
    await press('ลบลูกค้า')
    const confirm = screen.getByRole('alertdialog', { name: 'ลบ ทดสอบ เต็นท์ A?' })
    expect(confirm).toHaveTextContent('เบอร์ 2 เบอร์ · รถ 3 คัน จะถูกลบด้วย')
    expect(confirm).toHaveTextContent('ประวัติการล้างรถไม่ถูกลบ')
    expect(within(confirm).getByRole('button', { name: 'ยกเลิก' })).toHaveFocus()

    await act(async () => {
      fireEvent.click(within(confirm).getByRole('button', { name: 'ลบลูกค้า' }))
    })
    expect(api.deleteCustomer).toHaveBeenCalledWith('a')
    expect(nav.replace).toHaveBeenCalledWith('/customers')
    expect(screen.getByRole('status')).toHaveTextContent('ลบ ทดสอบ เต็นท์ A แล้ว')
  })

  it('opens the edit form from the URL (AC-06-3)', async () => {
    nav.search = 'edit=customer:a'
    await renderDetail()
    expect(await screen.findByRole('heading', { name: 'แก้ไขลูกค้า' })).toBeInTheDocument()
    expect(textbox(/ชื่อลูกค้า/)).toHaveValue('ทดสอบ เต็นท์ A')
  })
})

describe('CustomerHistoryCard on the customer page (US-12)', () => {
  it('shows visits, last visit, totals and the latest jobs; a job opens the edit dialog', async () => {
    api.getCustomerHistory.mockResolvedValue({
      ok: true,
      data: {
        visits: 23,
        lastVisit: '2026-10-18T05:00:00Z',
        total: 5200,
        unpaidTotal: 600,
        unpaidCount: 2,
        digitsOnly: 1,
        recent: [
          { record: job('r1', '1กข 1234', 300, 'unpaid', '2026-10-18T05:00:00Z'), sure: true },
          { record: job('r2', '1234', 300, 'unpaid', '2026-10-10T05:00:00Z'), sure: false },
        ],
      },
    })
    await renderDetail()
    const card = await screen.findByRole('region', { name: 'ประวัติการมาใช้บริการ' })
    await waitFor(() => expect(card).toHaveTextContent('23 ครั้ง'))
    expect(api.getCustomerHistory).toHaveBeenCalledWith('a', 10)
    expect(card).toHaveTextContent('18 ต.ค. 2569')
    expect(card).toHaveTextContent('฿5,200')
    expect(card).toHaveTextContent('฿600 (2 รายการ)')
    expect(card).toHaveTextContent('รวม 1 รายการที่ทะเบียนตรงแค่ตัวเลข')
    expect(card).toHaveTextContent('รายการล่าสุด (2 จาก 23)')
    expect(within(card).getByRole('button', { name: /^1234.*ทะเบียนตรงแค่ตัวเลข/ })).toBeInTheDocument()
    const pushState = vi.spyOn(window.history, 'pushState')
    fireEvent.click(within(card).getByRole('button', { name: /^1กข 1234/ }))
    expect(pushState).toHaveBeenCalledWith(null, '', '/customers/a?edit=income%3Ar1')
    pushState.mockRestore()
  })

  it('says when no job matches, and shows a load failure with a retry', async () => {
    await renderDetail()
    expect(await screen.findByText('ยังไม่มีรายการที่ตรงกับทะเบียนหรือชื่อของลูกค้านี้')).toBeInTheDocument()
  })

  it('a failed load can be retried without leaving the page', async () => {
    api.getCustomerHistory.mockResolvedValueOnce({ ok: false, error: appError('SERVER') })
    await renderDetail()
    expect(await screen.findByText('โหลดประวัติไม่สำเร็จ')).toBeInTheDocument()
    await press('ลองอีกครั้ง')
    expect(await screen.findByText('ยังไม่มีรายการที่ตรงกับทะเบียนหรือชื่อของลูกค้านี้')).toBeInTheDocument()
  })
})
