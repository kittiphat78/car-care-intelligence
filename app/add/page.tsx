'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RecordType, CAR_TYPES, CAR_BRANDS, PaymentStatus } from '@/types'

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
  const scrollRef = useRef<HTMLDivElement>(null)

  // Income states
  const [type, setType] = useState<RecordType>('wash')
  const [plate, setPlate] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('') 
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

  // ฟังก์ชันช่วยเลื่อนด้วยการลากเมาส์ (สำหรับคอมพิวเตอร์)
  const [isDown, setIsDown] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDown(true)
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0))
    setScrollLeft(scrollRef.current?.scrollLeft || 0)
  }
  const handleMouseLeave = () => setIsDown(false)
  const handleMouseUp = () => setIsDown(false)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown) return
    e.preventDefault()
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0)
    const walk = (x - startX) * 2
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollLeft - walk
  }

  const getTimestamp = () => {
    const now = new Date()
    const d = new Date(date)
    d.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
    return d.toISOString()
  }

  const handleDateClick = () => {
    if (!dateInputRef.current) return
    try {
      dateInputRef.current.showPicker()
    } catch {
      dateInputRef.current.focus()
      dateInputRef.current.click()
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
    const brandName = CAR_BRANDS.find(b => b.id === selectedBrand)?.name || ''
    
    const services = [typeName, brandName, note]

    const { error } = await supabase.from('records').insert({
      type,
      plate: plate.toUpperCase().trim(),
      services,
      price: parseInt(price),
      seq_number: (count ?? 0) + 1,
      created_at: timestamp,
      created_by: userId,
      payment_method: 'cash',
      customer_name: type === 'polish' ? customerName : (customerName || ''),
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
    <div className="min-h-screen pb-64 text-slate-900 bg-[#F8FAFC]">

      {/* Header */}
      <div className="px-6 pt-12 pb-6 text-center animate-fade-up">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Transaction Entry</p>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          {formMode === 'income' ? 'บันทึกรายรับ 🚗' : 'บันทึกรายจ่าย 💸'}
        </h1>
      </div>

      <div className="px-5 space-y-6 max-w-2xl mx-auto">

        {/* Mode Toggle */}
        <div className="flex p-1.5 bg-white border-2 border-slate-200 rounded-[26px] shadow-sm animate-fade-up">
          <button
            onClick={() => { setFormMode('income'); setError('') }}
            className={`flex-1 py-4 rounded-[20px] text-sm font-black transition-all ${formMode === 'income' ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-400'}`}
          >รายรับร้าน 💰</button>
          <button
            onClick={() => { setFormMode('expense'); setError('') }}
            className={`flex-1 py-4 rounded-[20px] text-sm font-black transition-all ${formMode === 'expense' ? 'bg-rose-500 text-white shadow-xl scale-[1.02]' : 'text-slate-400'}`}
          >รายจ่ายร้าน 💸</button>
        </div>

        {/* Date Picker */}
        <div className="bg-white p-5 rounded-[28px] border-2 border-slate-100 shadow-sm animate-fade-up" style={{ animationDelay: '50ms' }}>
          <label className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">วันที่ทำรายการ</label>
          <div onClick={handleDateClick} className="relative h-16 w-full bg-slate-50 rounded-2xl flex items-center px-5 cursor-pointer hover:bg-slate-100 transition-colors">
            <span className="text-2xl font-black text-slate-900">{displayThaiDate(date)}</span>
            <span className="ml-auto text-2xl">📅</span>
            <input ref={dateInputRef} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
        </div>

        {formMode === 'income' ? (
          <div className="space-y-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
            {/* Wash / Polish Toggle */}
            <div className="flex p-1.5 bg-slate-200/50 rounded-[24px] gap-2">
              <button onClick={() => setType('wash')} className={`flex-1 py-4 rounded-[18px] text-xs font-black transition-all ${type === 'wash' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>🧼 ล้างรถทั่วไป</button>
              <button onClick={() => setType('polish')} className={`flex-1 py-4 rounded-[18px] text-xs font-black transition-all ${type === 'polish' ? 'bg-amber-400 text-white shadow-md' : 'text-slate-500'}`}>✨ ขัดสี / งานเต็นท์</button>
            </div>

            {/* Customer Name */}
            <div className="space-y-2">
              <label className={`px-2 text-[10px] font-black uppercase tracking-widest ${type === 'polish' ? 'text-amber-600' : 'text-slate-400'}`}>
                {type === 'polish' ? 'ชื่อเต็นท์รถ / ลูกค้า' : 'ชื่อลูกค้า (ถ้ามี)'}
              </label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="ระบุชื่อ..." className={`w-full bg-white rounded-[24px] px-6 py-5 text-xl font-bold outline-none border-2 transition-all ${type === 'polish' ? 'border-amber-200 focus:border-amber-500' : 'border-slate-100 focus:border-slate-400'}`} />
            </div>

            {/* Plate */}
            <div className="space-y-2">
              <label className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">เลขทะเบียนรถ</label>
              <input type="text" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="กข 1234" className="w-full bg-white rounded-[28px] px-6 py-8 text-5xl font-black text-slate-900 outline-none text-center border-2 border-slate-200 focus:border-slate-900 transition-all shadow-sm" />
            </div>

            {/* ✅ ยี่ห้อรถ - แก้ไขให้ลากได้ (Drag) และแสดงผลครบทุกยี่ห้อ */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ยี่ห้อรถ ({CAR_BRANDS.length})</label>
                <span className="text-[9px] font-bold text-slate-300">คลิกค้างเพื่อลากได้ ↔</span>
              </div>
              <div 
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5 cursor-grab active:cursor-grabbing select-none"
              >
                {CAR_BRANDS.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBrand(b.id)}
                    className={`flex-shrink-0 px-8 py-4 rounded-2xl border-2 font-black text-sm transition-all pointer-events-auto ${selectedBrand === b.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* ประเภทรถ */}
            <div className="space-y-2">
              <label className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">ประเภทรถ</label>
              <div className="grid grid-cols-2 gap-3">
                {CAR_TYPES.map(t => (
                  <button key={t.id} type="button" onClick={() => setSelectedType(t.id)} className={`flex items-center gap-3 p-5 rounded-[22px] border-2 transition-all active:scale-95 ${selectedType === t.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                    <span className="text-3xl">{t.icon}</span>
                    <span className="font-black text-sm uppercase tracking-tight">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Status */}
            <div className="space-y-2">
              <label className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานะการชำระเงิน</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setPaymentStatus('paid')} className={`flex-1 py-5 rounded-2xl font-black text-sm border-2 transition-all ${paymentStatus === 'paid' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}>จ่ายแล้ว ✅</button>
                <button type="button" onClick={() => setPaymentStatus('unpaid')} className={`flex-1 py-5 rounded-2xl font-black text-sm border-2 transition-all ${paymentStatus === 'unpaid' ? 'bg-rose-500 border-rose-500 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}>ค้างชำระ ⏳</button>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <label className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">ราคาค่าบริการ (บาท)</label>
              <input type="text" inputMode="numeric" value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ''))} placeholder="0" className="w-full bg-blue-50 rounded-[28px] px-6 py-10 text-6xl font-black text-blue-700 outline-none text-center border-2 border-blue-100 focus:border-blue-500 transition-all shadow-inner" />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <label className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">หมายเหตุเพิ่มเติม</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="ระบุเพิ่มเติม..." className="w-full bg-white rounded-[24px] px-6 py-5 text-lg font-bold text-slate-900 outline-none border-2 border-slate-100 focus:border-slate-400 transition-all" />
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
            {/* Expense Section */}
            <div className="space-y-2">
              <label className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">รายการค่าใช้จ่าย</label>
              <input type="text" value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} placeholder="ระบุรายการ..." className="w-full bg-white rounded-[24px] px-6 py-5 text-xl font-bold text-slate-900 outline-none border-2 border-rose-100 focus:border-rose-500 transition-all shadow-sm" />
            </div>

            <div className="space-y-2">
              <label className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">จำนวนเงิน (บาท)</label>
              <input type="text" inputMode="numeric" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" className="w-full bg-rose-50 rounded-[28px] px-6 py-10 text-6xl font-black text-rose-600 outline-none text-center border-2 border-rose-200 focus:border-rose-400 transition-all shadow-inner" />
            </div>

            <div className="space-y-2">
              <label className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">บันทึกช่วยจำ</label>
              <input type="text" value={expenseNote} onChange={e => setExpenseNote(e.target.value)} placeholder="..." className="w-full bg-white rounded-[24px] px-6 py-5 text-lg font-bold text-slate-900 outline-none border-2 border-slate-100 focus:border-slate-400 transition-all shadow-sm" />
            </div>
          </div>
        )}

        {/* Inline Error */}
        {error && (
          <div className="bg-red-50 border-2 border-red-100 text-red-600 font-black text-sm px-6 py-5 rounded-[22px] animate-fade-up flex items-center gap-3">
            <span className="text-xl">⚠️</span> {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className={`w-full py-7 rounded-[32px] text-2xl font-black text-white transition-all shadow-2xl active:scale-95 disabled:opacity-50 mt-4 ${
            formMode === 'income' ? 'bg-slate-900 shadow-slate-300' : 'bg-rose-600 shadow-rose-300'
          }`}
        >
          {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึกรายการทันที'}
        </button>

      </div>
    </div>
  )
}