'use client'
import { useState, useEffect } from 'react'
import { Record, CAR_TYPES, CAR_BRANDS, PaymentStatus } from '@/types'

interface EditModalProps {
  item: any | null // เปลี่ยนจาก record เป็น item เพื่อรองรับทั้ง 2 ตาราง
  type: 'income' | 'expense'
  isOpen: boolean
  onClose: () => void
  onSave: (updatedFields: any) => void
  onDelete: (id: string) => void
}

export default function EditModal({ item, type, isOpen, onClose, onSave, onDelete }: EditModalProps) {
  // Common States
  const [loading, setLoading] = useState(false)

  // Income States
  const [plate, setPlate] = useState('')
  const [price, setPrice] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid')
  
  // Expense States
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  // เมื่อ item เปลี่ยน ให้ Reset ค่าใน Form
  useEffect(() => {
    if (item) {
      if (type === 'income') {
        setPlate(item.plate || '')
        setPrice(item.price?.toString() || '')
        setCustomerName(item.customer_name || '')
        setPaymentStatus(item.payment_status || 'paid')
      } else {
        setTitle(item.title || '')
        setAmount(item.amount?.toString() || '')
        setNote(item.note || '')
      }
    }
  }, [item, type, isOpen])

  if (!isOpen || !item) return null

  const handleSaveClick = () => {
    if (type === 'income') {
      onSave({ plate, price: parseInt(price), customer_name: customerName, payment_status: paymentStatus, services: item.services })
    } else {
      onSave({ title, amount: parseInt(amount), note })
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-slate-900/60 backdrop-blur-sm font-sarabun">
      <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[35px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-900">
            แก้ไขรายการ {type === 'income' ? 'รายรับ' : 'รายจ่าย'}
          </h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 text-2xl">✕</button>
        </div>

        <div className="space-y-6">
          {type === 'income' ? (
            // --- Form รายรับ (Income) ---
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ทะเบียนรถ</label>
                <input 
                  type="text" 
                  value={plate} 
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-xl font-bold outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ราคา (บาท)</label>
                  <input 
                    type="number" 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-xl font-bold outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">สถานะเงิน</label>
                  <select 
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-lg font-bold outline-none focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value="paid">จ่ายแล้ว ✅</option>
                    <option value="unpaid">ค้างจ่าย ⏳</option>
                  </select>
                </div>
              </div>

              {item.type === 'polish' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">ชื่อลูกค้า / เต็นท์รถ</label>
                  <input 
                    type="text" 
                    value={customerName} 
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-amber-50/50 border-2 border-amber-100 rounded-2xl px-5 py-4 text-lg font-bold outline-none focus:border-amber-400 transition-all"
                  />
                </div>
              )}
            </>
          ) : (
            // --- Form รายจ่าย (Expense) ---
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">รายการจ่าย</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-xl font-bold outline-none focus:border-rose-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">จำนวนเงิน (บาท)</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-rose-50/50 border-2 border-rose-100 rounded-2xl px-5 py-4 text-3xl font-black text-rose-600 outline-none focus:border-rose-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">หมายเหตุ</label>
                <input 
                  type="text" 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-lg font-bold outline-none focus:border-rose-500 transition-all"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="grid grid-cols-2 gap-4 mt-10">
          <button 
            onClick={() => {
              if (confirm('ยืนยันการลบรายการนี้?')) {
                onDelete(item.id)
              }
            }}
            className="py-5 rounded-2xl font-black text-rose-500 border-2 border-rose-50 transition-all active:scale-95 bg-rose-50/30"
          >
            ลบรายการ 🗑️
          </button>
          <button 
            onClick={handleSaveClick}
            className={`py-5 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${type === 'income' ? 'bg-slate-900 shadow-slate-200' : 'bg-rose-600 shadow-rose-200'}`}
          >
            บันทึก ✅
          </button>
        </div>

      </div>
    </div>
  )
}