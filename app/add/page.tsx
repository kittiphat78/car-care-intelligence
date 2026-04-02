'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RecordType, CAR_TYPES, PaymentStatus } from '@/types'

type FormMode = 'income' | 'expense'

const displayThaiDate = (isoDate: string) => {
  if (!isoDate) return '-'
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${parseInt(y) + 543}`
}

export default function AddPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<FormMode>('income')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dateInputRef = useRef<HTMLInputElement>(null)

  // Income states
  const [type, setType] = useState<RecordType>('wash')
  const [plate, setPlate] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid')
  const [note, setNote] = useState('')
  const [price, setPrice] = useState('')

  // Expense states
  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNote, setExpenseNote] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const getTimestamp = () => {
    const now = new Date()
    const d = new Date(date)
    d.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
    return d.toISOString()
  }

  const handleDateClick = () => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker()
      } catch {
        dateInputRef.current.click()
      }
    }
  }

  async function submitIncome() {
    if (!plate.trim()) return setError('กรุณากรอกป้ายทะเบียน')
    if (!selectedType) return setError('กรุณาเลือกประเภทรถ')
    if (!price || parseInt(price) <= 0) return setError('กรุณากรอกราคา')

    const timestamp = getTimestamp()
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999)

    const { count } = await supabase
      .from('records')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dayStart.toISOString())
      .lte('created_at', dayEnd.toISOString())

    const typeName = CAR_TYPES.find(t => t.id === selectedType)?.name || ''
    const services = [typeName, note].filter(Boolean)

    const { error } = await supabase.from('records').insert({
      type,
      plate: plate.toUpperCase().trim(),
      services,
      price: parseInt(price),
      seq_number: (count ?? 0) + 1,
      created_at: timestamp,
      created_by: userId,
      payment_method: 'cash',
      customer_name: type === 'polish' ? customerName : '',
      payment_status: paymentStatus,
      job_status: 'done',
    })

    if (error) throw error
  }

  async function submitExpense() {
    if (!expenseTitle.trim()) return setError('กรุณาระบุรายการจ่าย')
    if (!expenseAmount || parseInt(expenseAmount) <= 0) return setError('กรุณากรอกจำนวนเงิน')

    const { error } = await supabase.from('expenses').insert({
      title: expenseTitle.trim(),
      amount: parseInt(expenseAmount),
      created_at: getTimestamp(),
      created_by: userId,
      note: expenseNote,
    })

    if (error) throw error
  }

  async function handleSubmit() {
    setError('')
    setSaving(true)
    try {
      if (formMode === 'income') await submitIncome()
      else await submitExpense()
      router.push('/')
      router.refresh()
    } catch (e: any) {
      setError('บันทึกไม่สำเร็จ: ' + (e?.message ?? 'ลองใหม่อีกครั้ง'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen pb-64 text-slate-900">

      {/* Header */}
      <div className="px-6 pt-12 pb-6 text-center">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400 mb-2">บันทึกข้อมูล</p>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {formMode === 'income' ? 'ลงรายการรถ 🚗' : 'ลงรายจ่ายร้าน 💸'}
        </h1>
      </div>

      <div className="px-5 space-y-5 max-w-2xl mx-auto">

        {/* Mode Toggle */}
        <div className="flex p-1.5 bg-white border-2 border-slate-200 rounded-[22px] shadow-sm">
          <button
            onClick={() => { setFormMode('income'); setError('') }}
            className={`flex-1 py-4 rounded-[18px] text-sm font-black transition-all ${formMode === 'income' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}
          >บวกรายรับ 💰</button>
          <button
            onClick={() => { setFormMode('expense'); setError('') }}
            className={`flex-1 py-4 rounded-[18px] text-sm font-black transition-all ${formMode === 'expense' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400'}`}
          >หักรายจ่าย 💸</button>
        </div>

        {/* Date Picker */}
        <div className="bg-white p-4 rounded-[22px] border border-slate-200 shadow-sm">
          <label className="px-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 block mb-2">
            วันที่บันทึก
          </label>
          <div
            onClick={handleDateClick}
            className="relative h-14 w-full bg-slate-50 border border-slate-100 rounded-xl flex items-center px-4 cursor-pointer active:bg-slate-100 transition-all"
          >
            <span className="text-xl font-black text-slate-900">
              {displayThaiDate(date)}
            </span>
            <span className="ml-auto text-xl">📅</span>
            <input
              ref={dateInputRef}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {formMode === 'income' ? (
          <>
            {/* Wash / Polish Toggle */}
            <div className="flex p-1.5 bg-slate-100 rounded-[22px] gap-1.5">
              <button
                onClick={() => setType('wash')}
                className={`flex-1 py-3 rounded-[18px] text-xs font-black transition-all ${type === 'wash' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}
              >🧼 ล้างรถทั่วไป</button>
              <button
                onClick={() => setType('polish')}
                className={`flex-1 py-3 rounded-[18px] text-xs font-black transition-all ${type === 'polish' ? 'bg-amber-400 text-white shadow' : 'text-slate-500'}`}
              >✨ งานขัดสี / งานเต็นท์</button>
            </div>

            {/* Customer Name (Polish only) */}
            {type === 'polish' && (
              <div className="space-y-2 animate-fade-up">
                <label className="px-1 text-[10px] font-extrabold text-amber-600 block uppercase tracking-wider">
                  ชื่อลูกค้า / ชื่อเต็นท์รถ
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="เช่น เต็นท์เฮียเก่ง"
                  className="w-full bg-white rounded-[22px] px-6 py-4 text-xl font-bold text-slate-900 outline-none border-2 border-amber-200 focus:border-amber-500 transition-all shadow-sm"
                />
              </div>
            )}

            {/* Plate */}
            <div className="space-y-2">
              <label className="px-1 text-[10px] font-extrabold text-slate-400 block uppercase">เลขทะเบียนรถ</label>
              <input
                type="text"
                value={plate}
                onChange={e => setPlate(e.target.value.toUpperCase())}
                placeholder="กข 1234"
                className="w-full bg-white rounded-[22px] px-6 py-6 text-4xl font-black text-slate-900 outline-none text-center border-2 border-slate-200 focus:border-slate-900 transition-all shadow-sm"
              />
            </div>

            {/* Car Type Grid */}
            <div className="space-y-2">
              <label className="px-1 text-[10px] font-extrabold text-slate-400 block uppercase">ประเภทรถ</label>
              <div className="grid grid-cols-2 gap-2">
                {CAR_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedType(t.id)}
                    className={`flex items-center gap-2 p-4 rounded-2xl border-2 transition-all ${selectedType === t.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500'}`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <span className="font-bold text-sm">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Status */}
            <div className="space-y-2">
              <label className="px-1 text-[10px] font-extrabold text-slate-400 block uppercase">สถานะการชำระเงิน</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentStatus('paid')}
                  className={`flex-1 py-4 rounded-2xl font-black text-sm border-2 transition-all ${paymentStatus === 'paid' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-100 text-slate-400'}`}
                >จ่ายแล้ว ✅</button>
                <button
                  onClick={() => setPaymentStatus('unpaid')}
                  className={`flex-1 py-4 rounded-2xl font-black text-sm border-2 transition-all ${paymentStatus === 'unpaid' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-100 text-slate-400'}`}
                >ค้างชำระ ⏳</button>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <label className="px-1 text-[10px] font-extrabold text-slate-400 block uppercase">ราคา (บาท)</label>
              <input
                type="text"
                inputMode="numeric"
                value={price}
                onChange={e => setPrice(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="w-full bg-blue-50 rounded-[22px] px-6 py-8 text-5xl font-black text-blue-700 outline-none text-center border-2 border-blue-200 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <label className="px-1 text-[10px] font-extrabold text-slate-400 block uppercase">หมายเหตุ (ถ้ามี)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="เช่น ล้างพิเศษ, ขัดกระจก"
                className="w-full bg-white rounded-[22px] px-6 py-4 text-lg font-bold text-slate-900 outline-none border-2 border-slate-100 focus:border-slate-400 transition-all"
              />
            </div>
          </>
        ) : (
          <>
            {/* Expense Title */}
            <div className="space-y-2">
              <label className="px-1 text-[10px] font-extrabold text-slate-400 block uppercase">จ่ายค่าอะไร?</label>
              <input
                type="text"
                value={expenseTitle}
                onChange={e => setExpenseTitle(e.target.value)}
                placeholder="เช่น ค่าน้ำยา, ค่าไฟ"
                className="w-full bg-white rounded-[22px] px-6 py-5 text-xl font-bold text-slate-900 outline-none border-2 border-rose-100 focus:border-rose-500 transition-all shadow-sm"
              />
            </div>

            {/* Expense Amount */}
            <div className="space-y-2">
              <label className="px-1 text-[10px] font-extrabold text-slate-400 block uppercase">จำนวนเงิน (บาท)</label>
              <input
                type="text"
                inputMode="numeric"
                value={expenseAmount}
                onChange={e => setExpenseAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="w-full bg-rose-50 rounded-[22px] px-6 py-8 text-5xl font-black text-rose-600 outline-none text-center border-2 border-rose-200 focus:border-rose-400 transition-all"
              />
            </div>

            {/* Expense Note */}
            <div className="space-y-2">
              <label className="px-1 text-[10px] font-extrabold text-slate-400 block uppercase">หมายเหตุ (ถ้ามี)</label>
              <input
                type="text"
                value={expenseNote}
                onChange={e => setExpenseNote(e.target.value)}
                placeholder="..."
                className="w-full bg-white rounded-[22px] px-6 py-4 text-lg font-bold text-slate-900 outline-none border-2 border-slate-100 focus:border-slate-400 transition-all"
              />
            </div>
          </>
        )}

        {/* Inline Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 font-bold text-sm px-5 py-4 rounded-2xl animate-fade-up">
            ⚠️ {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className={`w-full py-6 rounded-[26px] text-xl font-black text-white transition-all shadow-xl active:scale-95 disabled:opacity-50 ${
            formMode === 'income' ? 'bg-slate-900 shadow-slate-200' : 'bg-rose-600 shadow-rose-200'
          }`}
        >
          {saving ? 'กำลังบันทึก...' : 'ตกลง บันทึกรายการ ✅'}
        </button>

      </div>
    </div>
  )
}