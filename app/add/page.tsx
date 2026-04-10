'use client'

import { useState, useEffect, useRef, memo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RecordType, CAR_TYPES, CAR_BRANDS, PaymentStatus } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// 1. Constants & Utilities
// ─────────────────────────────────────────────────────────────────────────────

type FormMode = 'income' | 'expense'

const EXPENSE_PRESETS = [
  { icon: '💧', label: 'ค่าน้ำยา' },
  { icon: '👷', label: 'ค่าแรง' },
  { icon: '🍚', label: 'ค่าข้าว' },
  { icon: '🏠', label: 'ค่าเช่า' },
  { icon: '⚡', label: 'ค่าไฟ' },
  { icon: '🚰', label: 'ค่าน้ำ' },
  { icon: '🗑️', label: 'ค่าขยะ' },
  { icon: '🛒', label: 'อุปกรณ์' }
]

const displayThaiDate = (isoDate: string) => {
  if (!isoDate) return '-'
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${parseInt(y, 10) + 543}`
}

const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const generateTimestamp = (dateStr: string) => {
  const now = new Date()
  const d = new Date(dateStr)
  d.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
  return d.toISOString()
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Custom Hooks (Logic Abstraction)
// ─────────────────────────────────────────────────────────────────────────────

function useAuthUser() {
  const [user, setUser] = useState<{ id: string | null; email: string }>({ id: null, email: '' })
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser({ id: data.user?.id ?? null, email: data.user?.email ?? '' })
    })
  }, [])
  return user
}

function useRecentCustomers() {
  const [savedCustomers, setSavedCustomers] = useState<string[]>([])
  
  useEffect(() => {
    const stored = localStorage.getItem('recentCustomers')
    if (stored) {
      try { setSavedCustomers(JSON.parse(stored)) } catch (e) {}
    }
  }, [])

  const addCustomer = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSavedCustomers(prev => {
      const updated = Array.from(new Set([trimmed, ...prev])).slice(0, 30)
      localStorage.setItem('recentCustomers', JSON.stringify(updated))
      return updated
    })
  }, [])

  return { savedCustomers, addCustomer }
}

function useCustomerVisitCount(plate: string) {
  const [visitCount, setVisitCount] = useState(0)

  useEffect(() => {
    const checkPlate = plate.trim().toUpperCase()
    if (checkPlate.length < 3) {
      setVisitCount(0)
      return
    }

    const timer = setTimeout(async () => {
      const { count } = await supabase
        .from('records')
        .select('*', { count: 'exact', head: true })
        .eq('plate', checkPlate)
      
      setVisitCount(count ?? 0)
    }, 600)

    return () => clearTimeout(timer)
  }, [plate])

  return visitCount
}

function useDraggableScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const [isDown, setIsDown] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeftVal, setScrollLeftVal] = useState(0)

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDown(true)
    setStartX(e.pageX - (ref.current?.offsetLeft || 0))
    setScrollLeftVal(ref.current?.scrollLeft || 0)
  }
  const onMouseLeave = () => setIsDown(false)
  const onMouseUp = () => setIsDown(false)
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDown) return
    e.preventDefault()
    const x = e.pageX - (ref.current?.offsetLeft || 0)
    if (ref.current) ref.current.scrollLeft = scrollLeftVal - (x - startX) * 2
  }

  return { ref, onMouseDown, onMouseLeave, onMouseUp, onMouseMove }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AddPage() {
  const router = useRouter()
  const { id: userId, email: userEmail } = useAuthUser()
  const { savedCustomers, addCustomer } = useRecentCustomers()

  // ── Main States ──
  const [formMode, setFormMode] = useState<FormMode>('income')
  const [date, setDate] = useState(getTodayStr())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // ── Income States ──
  const [type, setType] = useState<RecordType>('wash')
  const [plate, setPlate] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid')
  const [note, setNote] = useState('')
  const [price, setPrice] = useState('')
  const visitCount = useCustomerVisitCount(plate)

  // ── Expense States ──
  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNote, setExpenseNote] = useState('')

  // ── Handlers ──
  const resetIncomeForm = () => {
    setPlate(''); setPrice(''); setNote(''); setCustomerName('');
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ✅ เพิ่มฟังก์ชันล้างฟอร์มของรายจ่าย
  const resetExpenseForm = () => {
    setExpenseTitle(''); setExpenseAmount(''); setExpenseNote('');
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitIncome = async (isBulk: boolean) => {
    if (!plate.trim()) return setError('กรุณากรอกป้ายทะเบียน')
    if (!selectedType) return setError('กรุณาเลือกประเภทรถ')
    if (!price || parseInt(price, 10) <= 0) return setError('กรุณากรอกราคา')

    const timestamp = generateTimestamp(date)
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999)

    const { count } = await supabase.from('records').select('*', { count: 'exact', head: true })
      .gte('created_at', dayStart.toISOString())
      .lte('created_at', dayEnd.toISOString())

    const typeName = CAR_TYPES.find(t => t.id === selectedType)?.name || ''
    const brandName = CAR_BRANDS.find(b => b.id === selectedBrand)?.name || ''
    const services = [typeName, brandName, note.trim()]

    const { error } = await supabase.from('records').insert({
      type,
      plate: plate.toUpperCase().trim(),
      services,
      price: parseInt(price, 10),
      seq_number: (count ?? 0) + 1,
      created_at: timestamp,
      created_by: userId,
      created_by_email: userEmail,
      payment_method: 'cash',
      customer_name: customerName.trim(), 
      payment_status: paymentStatus,
      job_status: 'done',
    })

    if (error) throw error

    if (customerName.trim()) addCustomer(customerName)

    if (isBulk) {
      setSuccessMsg(`บันทึก ${plate.toUpperCase().trim()} สำเร็จ`)
      resetIncomeForm()
      setTimeout(() => setSuccessMsg(''), 4000)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  // ✅ รองรับ parameter isBulk สำหรับบันทึกแล้วทำต่อ
  const submitExpense = async (isBulk: boolean) => {
    if (!expenseTitle.trim()) return setError('กรุณาระบุรายการจ่าย')
    if (!expenseAmount || parseInt(expenseAmount, 10) <= 0) return setError('กรุณากรอกจำนวนเงิน')

    const { error } = await supabase.from('expenses').insert({
      title: expenseTitle.trim(),
      amount: parseInt(expenseAmount, 10),
      created_at: generateTimestamp(date),
      created_by: userId,
      created_by_email: userEmail,
      note: expenseNote.trim(),
    })

    if (error) throw error

    if (isBulk) {
      setSuccessMsg(`บันทึกรายจ่าย ${expenseTitle.trim()} สำเร็จ`)
      resetExpenseForm()
      setTimeout(() => setSuccessMsg(''), 4000)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  const handleSubmit = async (isBulk: boolean = false) => {
    setError(''); setSuccessMsg(''); setSaving(true)
    try {
      if (formMode === 'income') await submitIncome(isBulk)
      else await submitExpense(isBulk) // ✅ ส่ง isBulk ไปด้วย
    } catch (e: any) {
      setError('บันทึกไม่สำเร็จ: ' + (e.message || 'ลองใหม่อีกครั้ง'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50/50 pb-20 font-sans">
      <div className="max-w-xl mx-auto px-4 pt-6 space-y-5">
        
        <ModeToggle 
          mode={formMode} 
          onChange={(m) => { setFormMode(m); setError(''); setSuccessMsg(''); }} 
        />

        <SuccessBanner message={successMsg} />
        
        <DatePicker date={date} onChange={setDate} />

        {formMode === 'income' ? (
          <IncomeForm 
            states={{ type, plate, selectedType, selectedBrand, customerName, paymentStatus, note, price, visitCount, savedCustomers }}
            setters={{ setType, setPlate, setSelectedType, setSelectedBrand, setCustomerName, setPaymentStatus, setNote, setPrice }}
          />
        ) : (
          <ExpenseForm 
            states={{ title: expenseTitle, amount: expenseAmount, note: expenseNote }}
            setters={{ setTitle: setExpenseTitle, setAmount: setExpenseAmount, setNote: setExpenseNote }}
          />
        )}

        <div className="pt-2 pb-6">
          <ErrorBanner error={error} />
          <ActionButtons 
            mode={formMode} 
            saving={saving} 
            onSubmit={handleSubmit} 
          />
        </div>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Sub-Components (Clean UI Architecture)
// ─────────────────────────────────────────────────────────────────────────────

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
    {children}
  </label>
)

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100/80 ${className}`}>
    {children}
  </div>
)

const ModeToggle = memo(function ModeToggle({ mode, onChange }: { mode: FormMode, onChange: (m: FormMode) => void }) {
  return (
    <div className="flex bg-slate-200/60 p-1.5 rounded-[18px] gap-1 relative z-10 backdrop-blur-sm">
      <button
        onClick={() => onChange('income')}
        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-250 ease-out active:scale-[0.98] ${
          mode === 'income' ? 'bg-white text-blue-600 shadow-[0_2px_8px_rgba(0,0,0,0.06)]' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        รายรับ
      </button>
      <button
        onClick={() => onChange('expense')}
        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-250 ease-out active:scale-[0.98] ${
          mode === 'expense' ? 'bg-white text-red-600 shadow-[0_2px_8px_rgba(0,0,0,0.06)]' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        รายจ่าย
      </button>
    </div>
  )
})

const SuccessBanner = memo(function SuccessBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-fit max-w-[90vw] px-5 py-3.5 bg-emerald-500/95 backdrop-blur-md rounded-2xl shadow-xl shadow-emerald-500/20 text-white flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span className="text-sm font-bold tracking-wide">{message}</span>
    </div>
  )
})

const ErrorBanner = memo(function ErrorBanner({ error }: { error: string }) {
  if (!error) return null
  return (
    <div className="mb-4 w-full p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold text-center animate-in slide-in-from-bottom-2 fade-in" role="alert">
      🚨 {error}
    </div>
  )
})

const DatePicker = memo(function DatePicker({ date, onChange }: { date: string, onChange: (d: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <Card className="flex items-center justify-between cursor-pointer group hover:border-blue-200 transition-colors" >
      <div onClick={() => ref.current?.showPicker()} className="flex-1">
        <SectionLabel>วันที่ทำรายการ</SectionLabel>
        <span className="text-2xl font-black text-slate-800 tracking-tight">
          {displayThaiDate(date)}
        </span>
      </div>
      <div 
        onClick={() => ref.current?.showPicker()}
        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      </div>
      <input ref={ref} type="date" value={date} onChange={e => onChange(e.target.value)} className="absolute opacity-0 w-0 h-0 pointer-events-none" />
    </Card>
  )
})

function IncomeForm({ states, setters }: any) {
  const { type, plate, selectedType, selectedBrand, customerName, paymentStatus, note, price, visitCount, savedCustomers } = states
  const { setType, setPlate, setSelectedType, setSelectedBrand, setCustomerName, setPaymentStatus, setNote, setPrice } = setters
  const dragScroll = useDraggableScroll()

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      <div className="grid grid-cols-2 gap-3">
        <button 
          type="button" 
          onClick={() => setType('wash')} 
          className={`relative flex items-center gap-3.5 p-4 rounded-[20px] border-2 transition-all duration-300 ease-out active:scale-[0.97] overflow-hidden
            ${type === 'wash' 
              ? 'border-blue-500 bg-blue-50/50 shadow-[0_4px_20px_-6px_rgba(59,130,246,0.25)]' 
              : 'border-slate-100 bg-white hover:border-blue-200 hover:shadow-sm'
            }`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 z-10
            ${type === 'wash' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' : 'bg-slate-50 text-slate-400'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3" />
              <circle cx="6.5" cy="16.5" r="2.5" />
              <circle cx="17.5" cy="16.5" r="2.5" />
              <path d="M11 3.52s-2.5 3.5-2.5 5.48a2.5 2.5 0 0 0 5 0c0-1.98-2.5-5.48-2.5-5.48z" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div className="text-left z-10">
            <p className={`text-base font-bold tracking-tight leading-tight transition-colors ${type === 'wash' ? 'text-blue-700' : 'text-slate-700'}`}>ล้างรถ</p>
            <p className="text-xs font-medium text-slate-400 mt-0.5">บริการทั่วไป</p>
          </div>
        </button>

        <button 
          type="button" 
          onClick={() => setType('polish')} 
          className={`relative flex items-center gap-3.5 p-4 rounded-[20px] border-2 transition-all duration-300 ease-out active:scale-[0.97] overflow-hidden
            ${type === 'polish' 
              ? 'border-amber-500 bg-amber-50/50 shadow-[0_4px_20px_-6px_rgba(245,158,11,0.25)]' 
              : 'border-slate-100 bg-white hover:border-amber-200 hover:shadow-sm'
            }`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 z-10
            ${type === 'polish' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-105' : 'bg-slate-50 text-slate-400'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3" />
              <circle cx="6.5" cy="16.5" r="2.5" />
              <circle cx="17.5" cy="16.5" r="2.5" />
              <path d="M19 8l-1.5 3-3 1.5 3 1.5 1.5 3 1.5-3 3-1.5-3-1.5z" fill="currentColor" stroke="none"/>
            </svg>
          </div>
          <div className="text-left z-10">
            <p className={`text-base font-bold tracking-tight leading-tight transition-colors ${type === 'polish' ? 'text-amber-600' : 'text-slate-700'}`}>ขัดสี</p>
            <p className="text-xs font-medium text-slate-400 mt-0.5">เต็นท์รถ</p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <Card className="!bg-slate-50/50">
          <SectionLabel>ป้ายทะเบียน</SectionLabel>
          <div className="relative mt-2">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-200 to-slate-300 rounded-xl transform translate-y-[3px]"></div>
            <input 
              type="text" 
              value={plate} 
              onChange={e => setPlate(e.target.value.toUpperCase())} 
              placeholder="กข 1234" 
              className="relative w-full text-center text-2xl font-black tracking-widest py-3.5 bg-white border-2 border-slate-800 rounded-xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 transition-all uppercase placeholder:font-medium placeholder:text-slate-300" 
            />
            <div className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-slate-800/20" />
            <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-slate-800/20" />
          </div>
          
          {visitCount > 0 && (
            <div className="mt-3 bg-amber-100/80 border border-amber-200 rounded-xl p-2.5 flex items-center justify-center gap-2.5 animate-in zoom-in-95 duration-300">
              <span className="text-lg leading-none" aria-hidden="true">🎉</span>
              <p className="text-[13px] font-bold text-amber-700">
                ลูกค้าประจำ! เข้ามาครั้งที่ <span className="text-base text-amber-600 bg-white px-1.5 py-0.5 rounded-md shadow-sm ml-0.5">{visitCount + 1}</span>
              </p>
            </div>
          )}
        </Card>

        <Card>
          <SectionLabel>ราคา (บาท)</SectionLabel>
          <div className="relative flex items-center bg-slate-50 rounded-xl border-2 border-transparent focus-within:border-blue-500 focus-within:bg-white transition-all overflow-hidden mt-2 h-[64px]">
            <span className="absolute left-4 text-lg font-bold text-slate-400 select-none">฿</span>
            <input 
              type="text" 
              inputMode="numeric" 
              value={price} 
              onChange={e => setPrice(e.target.value.replace(/\D/g, ''))} 
              placeholder="0" 
              className="w-full text-right text-2xl font-black text-slate-800 py-3.5 pr-5 bg-transparent outline-none placeholder:text-slate-200" 
              style={{ paddingLeft: '2.5rem' }} 
            />
          </div>
        </Card>
      </div>

      <Card>
        <SectionLabel>ประเภทรถ</SectionLabel>
        <div className="grid grid-cols-3 gap-2.5 mt-2">
          {CAR_TYPES.map(t => (
            <button 
              key={t.id} 
              type="button" 
              onClick={() => setSelectedType(t.id)} 
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 active:scale-95
                ${selectedType === t.id 
                  ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-sm' 
                  : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:bg-slate-100 hover:border-slate-200'
                }`}
            >
              <span className={`text-[28px] leading-none ${selectedType === t.id ? 'text-blue-600' : 'text-slate-400'}`}>{t.icon}</span>
              <span className="text-[11px] font-bold tracking-wide truncate w-full text-center">{t.name}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionLabel>ยี่ห้อรถ</SectionLabel>
        <div {...dragScroll} className="flex gap-2.5 overflow-x-auto pb-2 mt-2 pt-1 no-scrollbar cursor-grab active:cursor-grabbing snap-x snap-mandatory">
          {CAR_BRANDS.map(b => (
            <button 
              key={b.id} 
              type="button" 
              onClick={() => setSelectedBrand(b.id)} 
              className={`snap-start flex-shrink-0 px-5 py-2.5 rounded-full border-2 text-sm font-bold transition-all duration-200 active:scale-95
                ${selectedBrand === b.id 
                  ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionLabel>สถานะการชำระ</SectionLabel>
        <div className="flex gap-3 mt-2">
          <button 
            type="button" 
            onClick={() => setPaymentStatus('paid')} 
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.98]
              ${paymentStatus === 'paid' 
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-[0_2px_10px_rgba(16,185,129,0.15)]' 
                : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
          >
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M12 3.5L5.5 10 2 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ชำระแล้ว
          </button>
          <button 
            type="button" 
            onClick={() => setPaymentStatus('unpaid')} 
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.98]
              ${paymentStatus === 'unpaid' 
                ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-[0_2px_10px_rgba(244,63,94,0.15)]' 
                : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
          >
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            ค้างชำระ
          </button>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <SectionLabel>ชื่อลูกค้า / เต็นท์รถ (ถ้ามี)</SectionLabel>
          <input 
            type="text" 
            list="saved-customers" 
            value={customerName} 
            onChange={e => setCustomerName(e.target.value)} 
            placeholder="พิมพ์เพื่อค้นหาประวัติ..." 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all mt-2" 
            autoComplete="off" 
          />
          <datalist id="saved-customers">
            {savedCustomers.map((name: string, index: number) => <option key={index} value={name} />)}
          </datalist>
        </div>
        <div>
          <SectionLabel>หมายเหตุเพิ่มเติม (ถ้ามี)</SectionLabel>
          <input 
            type="text" 
            value={note} 
            onChange={e => setNote(e.target.value)} 
            placeholder="เช่น ล้างห้องเครื่อง, ขัดไฟหน้า..." 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all mt-2" 
          />
        </div>
      </Card>
      
    </div>
  )
}

function ExpenseForm({ states, setters }: any) {
  const dragScroll = useDraggableScroll()
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      <Card>
        <SectionLabel>จำนวนเงินที่จ่าย (บาท)</SectionLabel>
        <div className="relative flex items-center bg-rose-50/30 rounded-xl border-2 border-transparent focus-within:border-rose-500 focus-within:bg-white transition-all overflow-hidden mt-2 h-[64px]">
          <span className="absolute left-4 text-lg font-bold text-rose-300 select-none">฿</span>
          <input 
            type="text" 
            inputMode="numeric" 
            value={states.amount} 
            onChange={e => setters.setAmount(e.target.value.replace(/\D/g, ''))} 
            placeholder="0" 
            className="w-full text-right text-2xl font-black text-rose-600 py-3.5 pr-5 bg-transparent outline-none placeholder:text-rose-200" 
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </Card>

      <Card>
        <SectionLabel>จ่ายค่าอะไร</SectionLabel>
        
        <div {...dragScroll} className="flex gap-2.5 overflow-x-auto pb-4 pt-2 mb-2 no-scrollbar cursor-grab active:cursor-grabbing snap-x snap-mandatory mt-1">
          {EXPENSE_PRESETS.map(preset => {
            const isSelected = states.title === preset.label;
            return (
              <button 
                key={preset.label} 
                type="button" 
                onClick={() => setters.setTitle(preset.label)} 
                className={`snap-start group relative flex-shrink-0 flex items-center gap-2.5 pr-4 pl-1.5 py-1.5 rounded-full border-2 text-[13px] font-bold transition-all duration-300 ease-out active:scale-95 select-none
                  ${isSelected 
                    ? 'bg-rose-500 text-white border-rose-500 shadow-[0_4px_12px_rgba(244,63,94,0.25)]' 
                    : 'bg-white text-slate-600 border-slate-100 shadow-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                  }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[15px] transition-all duration-300
                  ${isSelected 
                    ? 'bg-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]' 
                    : 'bg-slate-50 group-hover:bg-white group-hover:shadow-sm'
                  }`}
                >
                  <span aria-hidden="true" className={`transition-transform duration-300 ${isSelected ? 'scale-110 drop-shadow-sm' : 'group-hover:scale-110'}`}>
                    {preset.icon}
                  </span>
                </div>
                <span className="tracking-wide">{preset.label}</span>
              </button>
            )
          })}
        </div>
        
        <input 
          type="text" 
          value={states.title} 
          onChange={e => setters.setTitle(e.target.value)} 
          placeholder="หรือพิมพ์ชื่อรายการเอง..." 
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all" 
        />
      </Card>

      <Card>
        <SectionLabel>หมายเหตุ (ถ้ามี)</SectionLabel>
        <input 
          type="text" 
          value={states.note} 
          onChange={e => setters.setNote(e.target.value)} 
          placeholder="..." 
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 transition-all mt-2" 
        />
      </Card>
    </div>
  )
}

function ActionButtons({ mode, saving, onSubmit }: { mode: FormMode, saving: boolean, onSubmit: (isBulk: boolean) => void }) {
  return (
    <div className="flex gap-3">
      {/* ✅ ลบเงื่อนไข mode === 'income' ออก เพื่อให้ปุ่มนี้แสดงในทุกหน้า (รายรับ และ รายจ่าย) */}
      <button 
        onClick={() => onSubmit(true)} 
        disabled={saving} 
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3.5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
      >
        {saving ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin text-slate-400"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"/></svg>
        )}
        บันทึกแล้วทำต่อ
      </button>

      <button 
        onClick={() => onSubmit(false)} 
        disabled={saving} 
        className={`flex-[1.5] flex flex-col items-center justify-center gap-1 py-3.5 rounded-2xl text-[14px] font-bold text-white shadow-lg active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100
          ${mode === 'expense' ? 'bg-rose-600 shadow-rose-600/30 hover:bg-rose-700' : 'bg-blue-600 shadow-blue-600/30 hover:bg-blue-700'}`}
      >
        {saving ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
        )}
        บันทึก & กลับหน้าหลัก
      </button>
    </div>
  )
}