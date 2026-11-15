import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appError } from '@/lib/errors'
import { ToastProvider } from '@/components/ui/Toast'
import type { Expense, Record as AppRecord } from '@/types'

const api = vi.hoisted(() => ({ updateEntry: vi.fn(), deleteEntry: vi.fn(), countVisitsByPlate: vi.fn() }))
vi.mock('../api', () => api)
vi.mock('@/lib/observability', () => ({ reportAppError: vi.fn() }))

import { EditRecordDialog, type EditTarget } from '../components/EditRecordDialog'
import { editedCreatedAt, incomeDraftFrom, incomePatch, checkIncomeEdit } from '../editor'
import { clearOutbox, outboxSnapshot, withOutboxIncome } from '../outbox'

const record: AppRecord = {
  id: 'r1',
  created_at: '2026-10-14T02:40:00.000Z', // 09:40 Bangkok
  updated_at: '2026-10-14T03:00:00.123456+00:00',
  type: 'wash',
  plate: 'กข 1234',
  services: ['รถเก๋ง', 'TOYOTA', 'ล้างดำ'],
  price: 150,
  seq_number: 3,
  payment_status: 'paid',
  job_status: 'done',
  customer_name: '',
  created_by_email: 'owner@example.com',
}

describe('edit-mode rules', () => {
  it('reads car type, brand and note back out of services', () => {
    expect(incomeDraftFrom(record)).toMatchObject({ carType: 'sedan', brand: 'toyota', note: 'ล้างดำ', price: '150' })
  })

  it('sends only what changed', () => {
    const draft = { ...incomeDraftFrom(record), price: '200' }
    const checked = checkIncomeEdit(draft)
    if (!checked.ok) throw new Error('valid')
    expect(incomePatch(record, draft, checked.data, record.created_at)).toEqual({ price: 200 })
  })

  it('keeps a car type the catalogue no longer has', () => {
    const legacy = { ...record, services: ['รถสามล้อ', '', 'x'] }
    const draft = { ...incomeDraftFrom(legacy), note: 'y' }
    const checked = checkIncomeEdit(draft)
    if (!checked.ok) throw new Error('valid')
    expect(incomePatch(legacy, draft, checked.data, legacy.created_at)).toEqual({ services: ['รถสามล้อ', '', 'y'] })
  })

  it('keeps created_at untouched unless the date or time changed', () => {
    expect(editedCreatedAt(record.created_at, '2026-10-14', '09:40')).toBe(record.created_at)
    expect(editedCreatedAt(record.created_at, '2026-10-13', '09:40')).toBe('2026-10-13T02:40:00.000Z')
  })
})

function renderDialog(target: EditTarget = { kind: 'income', row: record }) {
  const onClose = vi.fn()
  const onChanged = vi.fn()
  render(
    <ToastProvider>
      <EditRecordDialog target={target} onClose={onClose} onChanged={onChanged} />
    </ToastProvider>,
  )
  return { onClose, onChanged }
}

const press = async (name: string | RegExp, scope: HTMLElement = document.body) => {
  await act(async () => {
    fireEvent.click(within(scope).getByRole('button', { name }))
  })
}

afterEach(() => clearOutbox())

beforeEach(() => {
  api.updateEntry.mockReset().mockResolvedValue({ ok: true, data: undefined })
  api.deleteEntry.mockReset().mockResolvedValue({ ok: true, data: undefined })
  api.countVisitsByPlate.mockReset().mockResolvedValue({ ok: true, data: 0 })
})

describe('EditRecordDialog', () => {
  it('opens with the stored values and the save button off until something changes', () => {
    renderDialog()
    const dialog = screen.getByRole('dialog', { name: 'แก้ไขรายรับ' })
    expect(within(dialog).getByLabelText(/ป้ายทะเบียน/)).toHaveValue('กข 1234')
    expect(within(dialog).getByLabelText(/^เวลา/)).toHaveValue('09:40')
    expect(within(dialog).getByRole('button', { name: 'บันทึกการแก้ไข' })).toBeDisabled()
    expect(dialog).toHaveTextContent('owner@example.com')
  })

  it('saves only the changed field, guarded by updated_at (ADR-07), closing at once (ADR-30)', async () => {
    let answer!: (value: unknown) => void
    api.updateEntry.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const { onClose, onChanged } = renderDialog()
    fireEvent.change(screen.getByLabelText(/ราคา \(บาท\)/), { target: { value: '200' } })
    await press('บันทึกการแก้ไข')
    expect(api.updateEntry).toHaveBeenCalledWith('records', 'r1', { price: 200 }, record.updated_at)
    expect(onClose).toHaveBeenCalled()
    // The lists show the new price with "กำลังส่ง" before the database answers
    expect(withOutboxIncome([record], outboxSnapshot(), () => true).map((r) => [r.price, r.outbox])).toEqual([[200, 'sending']])
    await act(async () => answer({ ok: true, data: undefined }))
    expect(screen.getByRole('status')).toHaveTextContent('บันทึกการแก้ไขแล้ว')
    // Screens reload when the database has it (useReloadWhenSent), not through onChanged
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('shows the other device’s version when it changed the record first, and "แก้อีกครั้ง" brings the edit back', async () => {
    api.updateEntry.mockResolvedValue({ ok: false, error: appError('CONFLICT') })
    const { onChanged } = renderDialog()
    fireEvent.change(screen.getByLabelText(/ราคา \(บาท\)/), { target: { value: '200' } })
    await press('บันทึกการแก้ไข')
    // Undone in the lists, reloaded, and said why
    expect(outboxSnapshot().changes).toEqual([])
    expect(onChanged).toHaveBeenCalled()
    const toast = screen.getByRole('alert')
    expect(toast).toHaveTextContent('มีการแก้ กข 1234 ฿150 จากเครื่องอื่น แสดงค่าล่าสุดแล้ว')
    const pushState = vi.spyOn(window.history, 'pushState')
    fireEvent.click(within(toast).getByRole('button', { name: 'แก้อีกครั้ง' }))
    expect(pushState).toHaveBeenCalledWith(null, '', expect.stringContaining('edit=income%3Ar1'))
    pushState.mockRestore()
  })

  it('opens again with the values that could not be saved', async () => {
    api.updateEntry.mockResolvedValue({ ok: false, error: appError('SERVER') })
    renderDialog()
    fireEvent.change(screen.getByLabelText(/ราคา \(บาท\)/), { target: { value: '200' } })
    await press('บันทึกการแก้ไข')
    expect(screen.getByRole('alert')).toHaveTextContent('แก้ กข 1234 ฿150 ไม่สำเร็จ ค่ากลับเป็นเดิมแล้ว')
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'แก้อีกครั้ง' }))
    // The page opens the dialog again from the URL
    cleanup()
    renderDialog()
    const reopened = screen.getByRole('dialog', { name: 'แก้ไขรายรับ' })
    expect(within(reopened).getByLabelText(/ราคา \(บาท\)/)).toHaveValue('200')
    expect(within(reopened).getByRole('button', { name: 'บันทึกการแก้ไข' })).toBeEnabled()
  })

  it('does not save an emptied plate (AC-26-2)', async () => {
    renderDialog()
    fireEvent.change(screen.getByLabelText(/ป้ายทะเบียน/), { target: { value: '' } })
    await press('บันทึกการแก้ไข')
    expect(api.updateEntry).not.toHaveBeenCalled()
    expect(screen.getByText('กรุณาแก้ไข 1 ช่อง')).toBeInTheDocument()
  })

  it('asks inline before deleting, with the safe choice focused', async () => {
    const { onChanged } = renderDialog()
    await press('ลบ')
    expect(screen.getByText(/ลบ กข 1234 ฿150 \(14 ต\.ค\.\)\?/)).toBeInTheDocument()
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)))
    })
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toHaveFocus()
    await press('ลบรายการ')
    expect(api.deleteEntry).toHaveBeenCalledWith('records', 'r1')
    expect(screen.getByRole('status')).toHaveTextContent('ลบ กข 1234 ฿150 แล้ว')
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('takes a deleted row out at once and brings it back if the delete fails (ADR-30)', async () => {
    let answer!: (value: unknown) => void
    api.deleteEntry.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const { onClose } = renderDialog()
    await press('ลบ')
    await press('ลบรายการ')
    expect(onClose).toHaveBeenCalled()
    expect(withOutboxIncome([record], outboxSnapshot(), () => true)).toEqual([])
    await act(async () => answer({ ok: false, error: appError('NETWORK') }))
    expect(withOutboxIncome([record], outboxSnapshot(), () => true).map((r) => r.id)).toEqual(['r1'])
    const toast = screen.getByRole('alert')
    expect(toast).toHaveTextContent('ลบ กข 1234 ฿150 ไม่สำเร็จ รายการกลับมาแล้ว')
    api.deleteEntry.mockResolvedValue({ ok: true, data: undefined })
    await act(async () => {
      fireEvent.click(within(toast).getByRole('button', { name: 'ลองอีกครั้ง' }))
    })
    expect(api.deleteEntry).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status')).toHaveTextContent('ลบ กข 1234 ฿150 แล้ว')
  })

  it('asks before throwing away unsaved changes', async () => {
    const { onClose } = renderDialog()
    fireEvent.change(screen.getByLabelText(/ราคา \(บาท\)/), { target: { value: '999' } })
    await press('ปิด')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog', { name: 'ยกเลิกการแก้ไข?' })).toBeInTheDocument()
    await press('ยกเลิกการแก้ไข', screen.getByRole('alertdialog'))
    expect(onClose).toHaveBeenCalled()
  })

  it('edits an expense', async () => {
    const expense: Expense = { id: 'e1', created_at: '2026-10-14T05:00:00.000Z', title: 'ค่าน้ำยา', amount: 300, note: null }
    renderDialog({ kind: 'expense', row: expense })
    expect(screen.getByRole('dialog', { name: 'แก้ไขรายจ่าย' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'ค่าไฟ' }))
    await press('บันทึกการแก้ไข')
    expect(api.updateEntry).toHaveBeenCalledWith('expenses', 'e1', { title: 'ค่าไฟ' }, null)
  })
})
