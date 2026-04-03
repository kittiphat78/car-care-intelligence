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
  const [successMsg, setSuccessMsg] = useState('')
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

  // Drag to scroll
  const [isDown, setIsDown] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const handleMouseDown = (e: React.MouseEvent) => { setIsDown(true); setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0)); setScrollLeft(scrollRef.current?.scrollLeft || 0) }
  const handleMouseLeave = () => setIsDown(false)
  const handleMouseUp = () => setIsDown(false)
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDown) return; e.preventDefault(); const x = e.pageX - (scrollRef.current?.offsetLeft || 0); const walk = (x - startX) * 2; if (scrollRef.current) scrollRef.current.scrollLeft = scrollLeft - walk }

  const getTimestamp = () => {
    const now = new Date()
    const d = new Date(date)
    d.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
    return d.toISOString()
  }

  async function submitIncome(isBulk: boolean) {
    if (!plate.trim()) return setError('กรุณากรอกป้ายทะเบียน')
    if (!selectedType) return setError('กรุณาเลือกประเภทรถ')
    if (!price || parseInt(price) <= 0) return setError('กรุณากรอกราคา')

    const timestamp = getTimestamp()
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999)

    const { count } = await supabase.from('records').select('*', { count: 'exact', head: true }).gte('created_at', dayStart.toISOString()).lte('created_at', dayEnd.toISOString())

    const typeName = CAR_TYPES.find(t => t.id === selectedType)?.name || ''
    const brandName = CAR_BRANDS.find(b => b.id === selectedBrand)?.name || ''
    const services = [typeName, brandName, note.trim()]

    const { error } = await supabase.from('records').insert({
      type,
      plate: plate.toUpperCase().trim(),
      services,
      price: parseInt(price),
      seq_number: (count ?? 0) + 1,
      created_at: timestamp,
      created_by: userId,
      payment_method: 'cash',
      customer_name: type === 'polish' ? customerName.trim() : '',
      payment_status: paymentStatus,
      job_status: 'done',
    })

    if (error) throw error

    if (isBulk) {
      setSuccessMsg(`บันทึกคัน ${plate.toUpperCase().trim()} สำเร็จ!`)
      setPlate('')
      setPrice('')
      setNote('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => setSuccessMsg(''), 4000)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  async function submitExpense() {
    if (!expenseTitle.trim()) return setError('กรุณาระบุรายการจ่าย')
    if (!expenseAmount || parseInt(expenseAmount) <= 0) return setError('กรุณากรอกจำนวนเงิน')

    const { error } = await supabase.from('expenses').insert({
      title: expenseTitle.trim(),
      amount: parseInt(expenseAmount),
      created_at: getTimestamp(),
      created_by: userId,
      note: expenseNote.trim(),
    })

    if (error) throw error
    router.push('/')
    router.refresh()
  }

  async function handleSubmit(isBulk: boolean = false) {
    setError('')
    setSuccessMsg('')
    setSaving(true)
    try {
      if (formMode === 'income') await submitIncome(isBulk)
      else await submitExpense()
    } catch (e: any) {
      setError('บันทึกไม่สำเร็จ: ' + (e?.message ?? 'ลองใหม่อีกครั้ง'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen pb-64 pt-8 px-4 max-w-2xl mx-auto flex flex-col gap-6">

      {/* ── Mode Toggle (สวิตช์ยักษ์) ── */}
      <div className="bg-white p-2 rounded-[32px] shadow-sm border-2 border-slate-200 flex gap-2 animate-kiosk">
        <button 
          onClick={() => { setFormMode('income'); setError(''); setSuccessMsg(''); }} 
          className={`flex-1 py-5 rounded-[24px] text-lg font-black transition-all ${formMode === 'income' ? 'bg-[var(--ink-main)] text-white shadow-lg scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          รายรับร้าน 💰
        </button>
        <button 
          onClick={() => { setFormMode('expense'); setError(''); setSuccessMsg(''); }} 
          className={`flex-1 py-5 rounded-[24px] text-lg font-black transition-all ${formMode === 'expense' ? 'bg-rose-600 text-white shadow-lg scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          รายจ่ายร้าน 💸
        </button>
      </div>

      {/* ── Success Banner (แบบ Kiosk) ── */}
      {successMsg && (
        <div className="card-kiosk bg-emerald-50 border-emerald-400 p-6 flex flex-col items-center justify-center animate-kiosk text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mb-3 shadow-inner">
            ✅
          </div>
          <p className="text-xl font-black text-emerald-800">{successMsg}</p>
          <p className="text-sm font-bold text-emerald-600 mt-1">กรอกข้อมูลคันต่อไปได้เลย</p>
        </div>
      )}

      {/* ── Date Picker ── */}
      <div className="card-kiosk p-6 animate-kiosk" style={{ animationDelay: '50ms' }}>
        <div className="flex justify-between items-center mb-4">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400">วันที่ทำรายการ</label>
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase">เลือกย้อนหลังได้</span>
        </div>
        <div onClick={() => dateInputRef.current?.showPicker()} className="relative w-full bg-slate-50 border-2 border-slate-200 rounded-[24px] p-5 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform">
          <span className="text-3xl font-black text-slate-900 tracking-tight">{displayThaiDate(date)}</span>
          <span className="text-4xl grayscale opacity-50">📅</span>
          <input ref={dateInputRef} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
      </div>

      {formMode === 'income' ? (
        <div className="space-y-6 animate-kiosk" style={{ animationDelay: '100ms' }}>
          
          {/* Wash / Polish */}
          <div className="flex gap-3">
            <button onClick={() => setType('wash')} className={`card-kiosk flex-1 py-6 flex flex-col items-center gap-2 border-2 transition-all ${type === 'wash' ? 'border-[var(--brand-blue)] bg-blue-50/50 shadow-md scale-[1.02]' : 'border-slate-100 opacity-60'}`}>
              <span className="text-4xl">🧼</span>
              <span className={`text-sm font-black ${type === 'wash' ? 'text-blue-700' : 'text-slate-500'}`}>ล้างรถทั่วไป</span>
            </button>
            <button onClick={() => setType('polish')} className={`card-kiosk flex-1 py-6 flex flex-col items-center gap-2 border-2 transition-all ${type === 'polish' ? 'border-amber-500 bg-amber-50/50 shadow-md scale-[1.02]' : 'border-slate-100 opacity-60'}`}>
              <span className="text-4xl">✨</span>
              <span className={`text-sm font-black ${type === 'polish' ? 'text-amber-700' : 'text-slate-500'}`}>ขัดสี / เต็นท์</span>
            </button>
          </div>

          {/* License Plate (สไตล์ป้ายทะเบียนจริง) */}
          <div className="card-kiosk p-6 bg-slate-100">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-4 text-center">พิมพ์เลขทะเบียนรถ</label>
            <div className="relative max-w-sm mx-auto">
              <input 
                type="text" 
                value={plate} 
                onChange={e => setPlate(e.target.value.toUpperCase())} 
                placeholder="กข 1234" 
                className="w-full bg-white border-4 border-slate-800 rounded-2xl px-4 py-8 text-6xl font-black text-slate-900 outline-none text-center shadow-[0_8px_0_rgba(30,41,59,0.1)] focus:border-blue-600 focus:shadow-[0_8px_0_rgba(37,99,235,0.2)] transition-all placeholder:text-slate-200" 
              />
              {/* น็อตป้ายทะเบียนหลอกๆ */}
              <div className="absolute top-4 left-4 w-3 h-3 rounded-full bg-slate-300 shadow-inner pointer-events-none" />
              <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-slate-300 shadow-inner pointer-events-none" />
            </div>
          </div>

          {/* Price */}
          <div className="card-kiosk p-6 border-blue-100 bg-blue-50/30">
            <label className="text-xs font-black uppercase tracking-widest text-blue-400 block mb-3">ราคาค่าบริการ (บาท)</label>
            <input 
              type="text" 
              inputMode="numeric" 
              value={price} 
              onChange={e => setPrice(e.target.value.replace(/\D/g, ''))} 
              placeholder="0" 
              className="w-full bg-white border-2 border-blue-200 rounded-[24px] px-6 py-10 text-[5rem] leading-none font-black text-blue-700 outline-none text-center shadow-inner focus:border-blue-500 transition-all placeholder:text-blue-100" 
            />
          </div>

          {/* Brands */}
          <div className="card-kiosk p-6">
            <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">ยี่ห้อรถ</label>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">👆 เลื่อนซ้ายขวาได้</span>
            </div>
            <div ref={scrollRef} onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6 cursor-grab active:cursor-grabbing">
              {CAR_BRANDS.map(b => (
                <button key={b.id} type="button" onClick={() => setSelectedBrand(b.id)} className={`flex-shrink-0 px-8 py-5 rounded-[20px] border-2 font-black text-lg transition-all active:scale-95 ${selectedBrand === b.id ? 'bg-[var(--ink-main)] border-[var(--ink-main)] text-white shadow-xl' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Types */}
          <div className="card-kiosk p-6">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-4">ประเภทรถ</label>
            <div className="grid grid-cols-2 gap-3">
              {CAR_TYPES.map(t => (
                <button key={t.id} type="button" onClick={() => setSelectedType(t.id)} className={`flex flex-col items-center justify-center gap-2 p-6 rounded-[24px] border-2 transition-all active:scale-95 ${selectedType === t.id ? 'bg-[var(--ink-main)] border-[var(--ink-main)] text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <span className="text-5xl mb-1">{t.icon}</span>
                  <span className="font-black text-sm uppercase tracking-tight">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Status */}
          <div className="card-kiosk p-6">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-4">สถานะเงิน</label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPaymentStatus('paid')} className={`flex-1 py-6 rounded-[20px] font-black text-lg border-2 transition-all active:scale-95 ${paymentStatus === 'paid' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'}`}>จ่ายแล้ว ✅</button>
              <button type="button" onClick={() => setPaymentStatus('unpaid')} className={`flex-1 py-6 rounded-[20px] font-black text-lg border-2 transition-all active:scale-95 ${paymentStatus === 'unpaid' ? 'bg-rose-500 border-rose-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'}`}>ค้างชำระ ⏳</button>
            </div>
          </div>
          
          {/* Note & Customer (Optional, make it subtle) */}
          <div className="space-y-4 pt-4 border-t-2 border-slate-200/50">
            {type === 'polish' && (
              <div>
                <label className="px-2 text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-2">ชื่อเต็นท์รถ / ลูกค้า (ถ้ามี)</label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="ระบุชื่อ..." className="w-full bg-white rounded-[20px] px-5 py-4 text-lg font-bold outline-none border-2 border-slate-200 focus:border-amber-500 transition-all" />
              </div>
            )}
            <div>
              <label className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น ล้างห้องเครื่อง..." className="w-full bg-white rounded-[20px] px-5 py-4 text-lg font-bold outline-none border-2 border-slate-200 focus:border-slate-400 transition-all" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-kiosk" style={{ animationDelay: '100ms' }}>
          {/* Expense Section */}
          <div className="card-kiosk p-6 border-rose-100 bg-rose-50/30">
            <label className="text-xs font-black uppercase tracking-widest text-rose-500 block mb-3">จำนวนเงินที่จ่าย (บาท)</label>
            <input type="text" inputMode="numeric" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" className="w-full bg-white border-2 border-rose-200 rounded-[24px] px-6 py-10 text-[5rem] leading-none font-black text-rose-600 outline-none text-center shadow-inner focus:border-rose-500 transition-all placeholder:text-rose-200" />
          </div>
          <div className="card-kiosk p-6">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-3">จ่ายค่าอะไร?</label>
            <input type="text" value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} placeholder="เช่น ค่าน้ำยา, ค่าไฟ..." className="w-full bg-slate-50 border-2 border-slate-200 rounded-[20px] px-5 py-6 text-2xl font-black text-slate-900 outline-none focus:border-rose-500 transition-all shadow-sm" />
          </div>
          <div className="card-kiosk p-6">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-3">บันทึกช่วยจำ (ถ้ามี)</label>
            <input type="text" value={expenseNote} onChange={e => setExpenseNote(e.target.value)} placeholder="..." className="w-full bg-slate-50 border-2 border-slate-200 rounded-[20px] px-5 py-5 text-lg font-bold text-slate-900 outline-none focus:border-slate-400 transition-all shadow-sm" />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="card-kiosk bg-rose-50 border-rose-400 p-5 flex items-center gap-4 animate-kiosk">
          <span className="text-3xl">⚠️</span>
          <p className="font-black text-rose-600 text-lg leading-tight">{error}</p>
        </div>
      )}

      {/* ── Action Buttons (ใหญ่ ยักษ์ สะใจ) ── */}
      <div className="flex flex-col gap-4 mt-4 animate-kiosk" style={{ animationDelay: '200ms' }}>
        {formMode === 'income' && (
          <button
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="btn-fat bg-blue-100 text-blue-700 border-2 border-blue-200 hover:bg-blue-200 flex flex-col gap-1 shadow-sm disabled:opacity-50"
          >
            <span className="text-2xl">{saving ? '⏳ กำลังบันทึก...' : '⚡ บันทึก & กรอกคันต่อไป'}</span>
            {!saving && <span className="text-xs opacity-70 uppercase tracking-widest">(โหมดลงย้อนหลัง รวดเร็ว)</span>}
          </button>
        )}

        <button
          onClick={() => handleSubmit(false)}
          disabled={saving}
          className={`btn-fat text-white shadow-xl disabled:opacity-50 ${formMode === 'income' ? 'bg-[var(--ink-main)] shadow-slate-400/30' : 'bg-rose-600 shadow-rose-600/30'}`}
        >
          <span className="text-2xl">{saving ? '⏳ กำลังบันทึก...' : '✅ บันทึก & กลับหน้าแรก'}</span>
        </button>
      </div>

    </div>
  )
}