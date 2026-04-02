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
  // Income states
  const [plate, setPlate]               = useState('')
  const [price, setPrice]               = useState('')
  const [customerName, setCustomerName] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid')

  // Expense states
  const [title, setTitle]   = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote]     = useState('')

  // Confirm delete state
  const [confirmDelete, setConfirmDelete] = useState(false)

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
        plate,
        price:          parseInt(price),
        customer_name:  customerName,
        payment_status: paymentStatus,
        services:       (item as Record).services,
      })
    } else {
      onSave({ title, amount: parseInt(amount), note })
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[35px] p-8 shadow-2xl animate-slide-up">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-900">
            แก้ไข{type === 'income' ? 'รายรับ' : 'รายจ่าย'}
          </h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 text-2xl transition-colors">✕</button>
        </div>

        <div className="space-y-5">
          {type === 'income' ? (
            <>
              {/* Plate */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ทะเบียนรถ</label>
                <input
                  type="text"
                  value={plate}
                  onChange={e => setPlate(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-xl font-bold outline-none focus:border-blue-500 transition-all"
                />
              </div>

              {/* Price + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ราคา (บาท)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={price}
                    onChange={e => setPrice(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-xl font-bold outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">สถานะเงิน</label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-lg font-bold outline-none focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value="paid">จ่ายแล้ว ✅</option>
                    <option value="unpaid">ค้างจ่าย ⏳</option>
                  </select>
                </div>
              </div>

              {/* Customer Name (Polish only) */}
              {(item as Record).type === 'polish' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">ชื่อลูกค้า / เต็นท์รถ</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-amber-50/50 border-2 border-amber-100 rounded-2xl px-5 py-4 text-lg font-bold outline-none focus:border-amber-400 transition-all"
                  />
                </div>
              )}
            </>
          ) : (
            <>
              {/* Title */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">รายการจ่าย</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-xl font-bold outline-none focus:border-rose-500 transition-all"
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">จำนวนเงิน (บาท)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-rose-50/50 border-2 border-rose-100 rounded-2xl px-5 py-4 text-3xl font-black text-rose-600 outline-none focus:border-rose-500 transition-all"
                />
              </div>

              {/* Note */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">หมายเหตุ</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-lg font-bold outline-none focus:border-rose-500 transition-all"
                />
              </div>
            </>
          )}
        </div>

        {/* Confirm Delete Banner */}
        {confirmDelete && (
          <div className="mt-6 bg-rose-50 border border-rose-200 rounded-2xl p-4 animate-fade-up">
            <p className="text-sm font-black text-rose-600 mb-3">ยืนยันลบรายการนี้?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 rounded-xl font-black text-slate-500 bg-white border border-slate-200 text-sm">ยกเลิก</button>
              <button onClick={() => onDelete(item.id)} className="flex-1 py-3 rounded-xl font-black text-white bg-rose-600 text-sm">ยืนยันลบ 🗑️</button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!confirmDelete && (
          <div className="grid grid-cols-2 gap-4 mt-8">
            <button
              onClick={() => setConfirmDelete(true)}
              className="py-5 rounded-2xl font-black text-rose-500 border-2 border-rose-100 bg-rose-50/30 transition-all active:scale-95"
            >
              ลบรายการ 🗑️
            </button>
            <button
              onClick={handleSave}
              className={`py-5 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${type === 'income' ? 'bg-slate-900 shadow-slate-200' : 'bg-rose-600 shadow-rose-200'}`}
            >
              บันทึก ✅
            </button>
          </div>
        )}

      </div>
    </div>
  )
}