import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appError } from '@/lib/errors'
import { ToastProvider } from '@/components/ui/Toast'

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))

const api = vi.hoisted(() => ({ createIncome: vi.fn(), createExpense: vi.fn(), countVisitsByPlate: vi.fn() }))
vi.mock('../api', () => api)
vi.mock('@/lib/observability', () => ({ reportAppError: vi.fn() }))

import { ExpenseEditor, IncomeEditor } from '../components/RecordEditor'

const renderIncome = () =>
  render(
    <ToastProvider>
      <IncomeEditor userId="user-1" email="owner@example.com" />
    </ToastProvider>,
  )

const renderExpense = () =>
  render(
    <ToastProvider>
      <ExpenseEditor userId="user-1" email="owner@example.com" />
    </ToastProvider>,
  )

function fillIncome() {
  fireEvent.change(screen.getByLabelText(/ป้ายทะเบียน/), { target: { value: 'กข 1234' } })
  fireEvent.click(screen.getByRole('radio', { name: 'รถเก๋ง' }))
  fireEvent.change(screen.getByLabelText(/ราคา \(บาท\)/), { target: { value: '150' } })
}

const press = async (name: string | RegExp) => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }))
  })
}

beforeEach(() => {
  router.push.mockReset()
  api.createIncome.mockReset().mockResolvedValue({ ok: true, data: undefined })
  api.createExpense.mockReset().mockResolvedValue({ ok: true, data: undefined })
  api.countVisitsByPlate.mockReset().mockResolvedValue({ ok: true, data: 0 })
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('IncomeEditor', () => {
  it('does not save an empty form and lists what to fix (AC-04-2)', async () => {
    renderIncome()
    await press('บันทึก')
    expect(api.createIncome).not.toHaveBeenCalled()
    const summary = screen.getByRole('alert')
    expect(summary).toHaveTextContent('กรุณาแก้ไข 3 ช่อง')
    expect(summary).toHaveFocus()
    expect(screen.getByLabelText(/ป้ายทะเบียน/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('saves one record and goes to the dashboard with a toast (AC-04-1)', async () => {
    renderIncome()
    fillIncome()
    await press('บันทึก')
    expect(api.createIncome).toHaveBeenCalledOnce()
    const row = api.createIncome.mock.calls[0][0]
    expect(row).toMatchObject({ type: 'wash', plate: 'กข 1234', price: 150, payment_status: 'paid', created_by: 'user-1' })
    expect(row).not.toHaveProperty('seq_number')
    expect(router.push).toHaveBeenCalledWith('/')
    expect(screen.getByRole('status')).toHaveTextContent('บันทึก กข 1234 ฿150 แล้ว')
  })

  it('"บันทึกแล้วทำต่อ" keeps the job settings and focuses the plate (AC-05-1)', async () => {
    renderIncome()
    fireEvent.click(screen.getByRole('radio', { name: /ขัดสี/ }))
    fillIncome()
    await press('บันทึกแล้วทำต่อ')
    expect(router.push).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/ป้ายทะเบียน/)).toHaveValue('')
    expect(screen.getByLabelText(/ป้ายทะเบียน/)).toHaveFocus()
    expect(screen.getByLabelText(/ราคา \(บาท\)/)).toHaveValue('')
    expect(screen.getByRole('radio', { name: /ขัดสี/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'รถเก๋ง' })).toHaveAttribute('aria-checked', 'true')
  })

  it('pressing save again while saving sends one request (AC-06-1)', async () => {
    let finish: (v: unknown) => void = () => {}
    api.createIncome.mockReturnValue(new Promise((r) => (finish = r)))
    renderIncome()
    fillIncome()
    fireEvent.click(screen.getByRole('button', { name: 'บันทึก' }))
    fireEvent.click(screen.getByRole('button', { name: /กำลังบันทึก/ }))
    fireEvent.click(screen.getByRole('button', { name: /กำลังบันทึก/ }))
    await act(async () => finish({ ok: true, data: undefined }))
    expect(api.createIncome).toHaveBeenCalledOnce()
  })

  it('keeps the form after a network failure and retries with the same request id (AC-35-1)', async () => {
    api.createIncome.mockResolvedValueOnce({ ok: false, error: appError('NETWORK') })
    renderIncome()
    fillIncome()
    await press('บันทึก')
    const banner = screen.getByRole('alert')
    expect(banner).toHaveTextContent('บันทึกไม่สำเร็จ ข้อมูลยังอยู่ในฟอร์ม')
    expect(banner).toHaveTextContent('เชื่อมต่ออินเทอร์เน็ตไม่ได้')
    expect(screen.getByLabelText(/ป้ายทะเบียน/)).toHaveValue('กข 1234')

    await press('บันทึก')
    const [first, second] = api.createIncome.mock.calls.map((c) => c[0].client_request_id)
    expect(second).toBe(first)
    expect(router.push).toHaveBeenCalledWith('/')
  })

  it('warns before saving an unpaid job without a name', async () => {
    renderIncome()
    fillIncome()
    fireEvent.click(screen.getByRole('radio', { name: 'ค้างชำระ' }))
    await press('บันทึก')
    const dialog = screen.getByRole('alertdialog', { name: 'ยังไม่ได้ใส่ชื่อลูกค้า' })
    expect(within(dialog).getByRole('button', { name: 'ใส่ชื่อลูกค้า' })).toHaveFocus()
    expect(api.createIncome).not.toHaveBeenCalled()

    await press('บันทึกโดยไม่ใส่ชื่อ')
    expect(api.createIncome).toHaveBeenCalledOnce()
    expect(api.createIncome.mock.calls[0][0]).toMatchObject({ payment_status: 'unpaid', customer_name: '' })
  })

  it('keeps a draft through a reload and can clear it (AC-12-1)', async () => {
    const first = renderIncome()
    fillIncome()
    first.unmount()

    renderIncome()
    expect(await screen.findByText('กู้ข้อมูลที่กรอกค้างไว้แล้ว')).toBeInTheDocument()
    expect(screen.getByLabelText(/ป้ายทะเบียน/)).toHaveValue('กข 1234')
    fireEvent.click(screen.getByRole('button', { name: 'ล้างฟอร์ม' }))
    expect(screen.getByLabelText(/ป้ายทะเบียน/)).toHaveValue('')
  })

  it('a saved record leaves no draft behind (AC-12-2)', async () => {
    renderIncome()
    fillIncome()
    await press('บันทึก')
    await waitFor(() => expect(Object.keys(sessionStorage).filter((k) => k.startsWith('car-care-draft:'))).toEqual([]))
    // …and remembers it so the dashboard can highlight the new row
    expect(sessionStorage.getItem('car-care-last-saved')).toBe(api.createIncome.mock.calls[0][0].client_request_id)
  })

  it('shows a regular customer after the plate lookup (AC-08-1)', async () => {
    vi.useFakeTimers()
    api.countVisitsByPlate.mockResolvedValue({ ok: true, data: 2 })
    renderIncome()
    fireEvent.change(screen.getByLabelText(/ป้ายทะเบียน/), { target: { value: 'กข 1234' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700)
    })
    expect(screen.getByText(/ลูกค้าประจำ · ครั้งที่ 3/)).toBeInTheDocument()
    expect(api.countVisitsByPlate).toHaveBeenCalledWith('กข 1234')
  })

  it('Enter in a field moves to the next field and never saves (interaction-specifications §2)', async () => {
    renderIncome()
    fillIncome()
    const price = screen.getByLabelText(/ราคา \(บาท\)/)
    price.focus()
    await act(async () => {
      fireEvent.keyDown(price, { key: 'Enter' })
    })
    expect(api.createIncome).not.toHaveBeenCalled()
    expect(price).not.toHaveFocus()
  })

  it('cannot save while offline and says why', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    renderIncome()
    expect(screen.getByRole('button', { name: 'รอเชื่อมต่อ' })).toBeDisabled()
    expect(screen.getByText(/ไม่มีอินเทอร์เน็ต/)).toBeInTheDocument()
    onLine.mockRestore()
  })
})

describe('ExpenseEditor', () => {
  it('saves a shortcut expense (AC-10-1)', async () => {
    renderExpense()
    fireEvent.change(screen.getByLabelText(/จำนวนเงินที่จ่าย/), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('radio', { name: 'ค่าน้ำยา' }))
    expect(screen.getByLabelText(/จ่ายค่าอะไร/)).toHaveValue('ค่าน้ำยา')
    await press('บันทึกรายจ่าย')
    expect(api.createExpense).toHaveBeenCalledOnce()
    expect(api.createExpense.mock.calls[0][0]).toMatchObject({ title: 'ค่าน้ำยา', amount: 300 })
    expect(router.push).toHaveBeenCalledWith('/')
  })

  it('refuses an empty amount (AC-10-2)', async () => {
    renderExpense()
    fireEvent.click(screen.getByRole('radio', { name: 'ค่าไฟ' }))
    await press('บันทึกรายจ่าย')
    expect(api.createExpense).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('กรุณาแก้ไข 1 ช่อง')
  })
})
