'use client'
import { useState, useEffect } from 'react'
import { Record, Expense, PaymentStatus } from '@/types'

interface EditModalProps {
  item:     Record | Expense | null
  type:     'income' | 'expense'
  isOpen:   boolean
  onClose:  () => void
  onSave:   (updatedFields: Partial<Record & Expense>) => void
  onDelete: (id: string) => void
}

export default function EditModal({ item, type, isOpen, onClose, onSave, onDelete }: EditModalProps) {
  const [plate, setPlate]                   = useState('')
  const [price, setPrice]                   = useState('')
  const [customerName, setCustomerName]     = useState('')
  const [paymentStatus, setPaymentStatus]   = useState<PaymentStatus>('paid')
  const [title, setTitle]                   = useState('')
  const [amount, setAmount]                 = useState('')
  const [note, setNote]                     = useState('')
  const [confirmDelete, setConfirmDelete]   = useState(false)

  useEffect(() => {
    if (!item) return
    setConfirmDelete(false)
    if (type === 'income') {
      const r = item as Record
      setPlate(r.plate ?? '')
      setPrice(r.price?.toString() ?? '')
      setCustomerName(r.customer_name ?? '')
      setPaymentStatus(r.payment_status ?? 'paid')
    } else {
      const e = item as Expense
      setTitle(e.title ?? '')
      setAmount(e.amount?.toString() ?? '')
      setNote(e.note ?? '')
    }
  }, [item, type, isOpen])

  if (!isOpen || !item) return null

  const handleSave = () => {
    if (type === 'income') {
      onSave({
        plate:          plate.trim(),
        price:          parseInt(price) || 0,
        customer_name:  customerName.trim(),
        payment_status: paymentStatus,
        services:       (item as Record).services,
      })
    } else {
      onSave({ title: title.trim(), amount: parseInt(amount) || 0, note: note.trim() })
    }
  }

  const isIncome = type === 'income'

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm fade-in flex items-end justify-center sm:items-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* Sheet */}
      <div className="bg-white w-full max-w-md rounded-t-[20px] sm:rounded-[20px] slide-up overflow-hidden">

        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              แก้ไข{isIncome ? 'รายรับ' : 'รายจ่าย'}
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              {isIncome ? (item as Record).plate : (item as Expense).title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {isIncome ? (
            <>
              <div>
                <label className="label">ทะเบียนรถ</label>
                <input
                  type="text"
                  value={plate}
                  onChange={e => setPlate(e.target.value.toUpperCase())}
                  className="input"
                  placeholder="กข 1234"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">ราคา (บาท)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={price}
                    onChange={e => setPrice(e.target.value.replace(/\D/g, ''))}
                    className="input"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="label">สถานะ</label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="input appearance-none cursor-pointer"
                  >
                    <option value="paid">จ่ายแล้ว</option>
                    <option value="unpaid">ค้างจ่าย</option>
                  </select>
                </div>
              </div>

              {(item as Record).type === 'polish' && (
                <div>
                  <label className="label">ชื่อลูกค้า / เต็นท์</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="input"
                    placeholder="ระบุชื่อ..."
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="label">รายการจ่าย</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input"
                  placeholder="ระบุรายการ..."
                />
              </div>
              <div>
                <label className="label">จำนวนเงิน (บาท)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
                  className="input"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">หมายเหตุ</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="input"
                  placeholder="ระบุหมายเหตุ (ถ้ามี)..."
                />
              </div>
            </>
          )}
        </div>

        {/* Confirm Delete */}
        {confirmDelete && (
          <div className="mx-5 mb-4 p-4 rounded-[var(--radius-md)] bg-[var(--red-light)] border border-red-100">
            <p className="text-sm font-semibold text-[var(--red)] mb-3">ยืนยันลบรายการนี้?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="btn btn-ghost flex-1 py-2.5 text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold text-white bg-[var(--red)] transition-all active:scale-[0.97]"
              >
                ลบรายการ
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!confirmDelete && (
          <div className="flex gap-2.5 px-5 pb-6 pt-1">
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn btn-danger py-3 text-sm"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M2.5 4h10M5 4V2.5h5V4M6 7v4M9 7v4M3.5 4l.5 8.5h7L12 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              ลบ
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary flex-1 py-3 text-sm"
            >
              บันทึกการแก้ไข
            </button>
          </div>
        )}

      </div>
    </div>
  )
}