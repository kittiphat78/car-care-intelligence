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

  const submitExpense = async () => {
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
    router.push('/')
    router.refresh()
  }

  const handleSubmit = async (isBulk: boolean = false) => {
    setError(''); setSuccessMsg(''); setSaving(true)
    try {
      if (formMode === 'income') await submitIncome(isBulk)
      else await submitExpense()
    } catch (e: any) {
      setError('บันทึกไม่สำเร็จ: ' + (e.message || 'ลองใหม่อีกครั้ง'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-dvh px-4 pt-6 space-y-4">
      
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

      <ErrorBanner error={error} />

      <ActionButtons 
        mode={formMode} 
        saving={saving} 
        onSubmit={handleSubmit} 
      />

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Sub-Components (Clean UI Architecture)
// ─────────────────────────────────────────────────────────────────────────────

const ModeToggle = memo(function ModeToggle({ mode, onChange }: { mode: FormMode, onChange: (m: FormMode) => void }) {
  return (
    <div className="flex bg-[var(--surface-2)] p-1.5 rounded-[var(--radius-lg)] gap-1.5 fade-up">
      <button
        onClick={() => onChange('income')}
        className={`flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
          mode === 'income' ? 'bg-white text-[var(--text-primary)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        รายรับ
      </button>
      <button
        onClick={() => onChange('expense')}
        className={`flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
          mode === 'expense' ? 'bg-white text-[var(--red)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
    <div className="card p-3.5 flex items-center gap-3 border-[var(--green)] fade-up" role="alert">
      <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--green-light,#dcfce7)] flex items-center justify-center shrink-0">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path d="M12.5 3.5l-7 7L2 7" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{message}</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">กรอกรายการถัดไปได้เลย</p>
      </div>
    </div>
  )
})

const ErrorBanner = memo(function ErrorBanner({ error }: { error: string }) {
  if (!error) return null
  return (
    <div className="fixed bottom-28 left-4 right-4 max-w-lg mx-auto p-3 rounded-[var(--radius-md)] bg-[var(--red)] text-white text-sm font-medium text-center fade-up" role="alert">
      {error}
    </div>
  )
})

const DatePicker = memo(function DatePicker({ date, onChange }: { date: string, onChange: (d: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="card p-4 fade-up delay-1">
      <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-2.5">วันที่</p>
      <div onClick={() => ref.current?.showPicker()} className="flex items-center justify-between cursor-pointer">
        <span className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          {displayThaiDate(date)}
        </span>
        <span className="text-xs font-semibold text-[var(--text-tertiary)] bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-1.5 hover:text-[var(--text-primary)] transition-colors">
          เปลี่ยน
        </span>
        <input
          ref={ref}
          type="date"
          value={date}
          onChange={e => onChange(e.target.value)}
          className="absolute opacity-0 pointer-events-none"
        />
      </div>
    </div>
  )
})

function IncomeForm({ states, setters }: any) {
  const { type, plate, selectedType, selectedBrand, customerName, paymentStatus, note, price, visitCount, savedCustomers } = states
  const { setType, setPlate, setSelectedType, setSelectedBrand, setCustomerName, setPaymentStatus, setNote, setPrice } = setters
  const dragScroll = useDraggableScroll()

  return (
    <div className="space-y-3 fade-up delay-1">
      {/* Service type */}
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => setType('wash')} className={`card flex items-center gap-3 p-4 transition-all ${type === 'wash' ? 'border-[var(--accent)] bg-[var(--accent-light)]' : 'hover:shadow-[var(--shadow-md)]'}`}>
          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${type === 'wash' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] text-[var(--text-tertiary)]'}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17a5 5 0 0 1 10 0"/><path d="M5 17H3a1 1 0 0 1-1-1V9l3-4h14l3 4v7a1 1 0 0 1-1 1h-2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>
          </div>
          <div className="text-left">
            <p className={`text-sm font-semibold ${type === 'wash' ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>ล้างรถ</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">ทั่วไป</p>
          </div>
        </button>
        <button type="button" onClick={() => setType('polish')} className={`card flex items-center gap-3 p-4 transition-all ${type === 'polish' ? 'border-[var(--amber)] bg-[var(--amber-light)]' : 'hover:shadow-[var(--shadow-md)]'}`}>
          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${type === 'polish' ? 'bg-[var(--amber)] text-white' : 'bg-[var(--surface-2)] text-[var(--text-tertiary)]'}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6l-5 3.6 1.9-5.8L4 8.8h6.1z"/></svg>
          </div>
          <div className="text-left">
            <p className={`text-sm font-semibold ${type === 'polish' ? 'text-[var(--amber)]' : 'text-[var(--text-primary)]'}`}>ขัดสี</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">เต็นท์รถ</p>
          </div>
        </button>
      </div>

      {/* License Plate */}
      <div className="card p-4">
        <div className="flex justify-between items-end mb-3">
          <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest">ป้ายทะเบียน</p>
        </div>
        <div className="relative">
          <input type="text" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="กข 1234" className="input text-center text-4xl font-bold tracking-widest py-5 placeholder:font-normal placeholder:text-3xl" />
          <span className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-[var(--border)] pointer-events-none" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[var(--border)] pointer-events-none" />
        </div>
        {visitCount > 0 && (
          <div className="mt-3 bg-[var(--amber-light)] border border-[var(--amber)] rounded-[var(--radius-md)] p-2.5 flex items-center justify-center gap-2 animate-kiosk">
            <span className="text-xl" aria-hidden="true">🌟</span>
            <p className="text-sm font-bold text-[var(--amber)]">
              ลูกค้าประจำ! คันนี้มาครั้งที่ <span className="text-lg">{visitCount + 1}</span> แล้ว
            </p>
          </div>
        )}
      </div>

      {/* Price - ✅ แก้ไขเพิ่ม Inline style บังคับดันตัวเลขหลบ ฿ */}
      <div className="card p-4">
        <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-3">ราคา (บาท)</p>
        <div className="relative flex items-center">
          <span className="absolute left-4 text-xl font-semibold text-[var(--text-tertiary)] pointer-events-none">฿</span>
          <input 
            type="text" 
            inputMode="numeric" 
            value={price} 
            onChange={e => setPrice(e.target.value.replace(/\D/g, ''))} 
            placeholder="0" 
            className="input w-full text-3xl font-bold text-[var(--text-primary)] py-4" 
            style={{ paddingLeft: '3.5rem' }} 
          />
        </div>
      </div>

      {/* Car Brand */}
      <div className="card p-4">
        <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-3">ยี่ห้อรถ</p>
        <div {...dragScroll} className="flex gap-2 overflow-x-auto pb-1 no-scrollbar cursor-grab active:cursor-grabbing">
          {CAR_BRANDS.map(b => (
            <button key={b.id} type="button" onClick={() => setSelectedBrand(b.id)} className={`flex-shrink-0 px-4 py-2 rounded-[var(--radius-md)] border text-sm font-semibold transition-all ${selectedBrand === b.id ? 'bg-[var(--text-primary)] text-white border-transparent' : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'}`}>
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Car Type */}
      <div className="card p-4">
        <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-3">ประเภทรถ</p>
        <div className="grid grid-cols-2 gap-2">
          {CAR_TYPES.map(t => (
            <button key={t.id} type="button" onClick={() => setSelectedType(t.id)} className={`flex items-center gap-2.5 px-3 py-3 rounded-[var(--radius-md)] border text-sm font-semibold transition-all ${selectedType === t.id ? 'bg-[var(--text-primary)] text-white border-transparent' : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'}`}>
              <span className="text-base leading-none" aria-hidden="true">{t.icon}</span>
              <span className="truncate">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Status */}
      <div className="card p-4">
        <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-3">สถานะการชำระ</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPaymentStatus('paid')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-md)] border text-sm font-semibold transition-all ${paymentStatus === 'paid' ? 'bg-[var(--green-light,#dcfce7)] text-[var(--green)] border-[var(--green)]' : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'}`}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M12 3.5L5.5 10 2 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ชำระแล้ว
          </button>
          <button type="button" onClick={() => setPaymentStatus('unpaid')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-md)] border text-sm font-semibold transition-all ${paymentStatus === 'unpaid' ? 'bg-[var(--red-light)] text-[var(--red)] border-[var(--red)]' : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'}`}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            ค้างชำระ
          </button>
        </div>
      </div>

      {/* Customer Name */}
      <div className="card p-4">
        <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-2">ชื่อลูกค้า / เต็นท์รถ (ถ้ามี)</p>
        <input type="text" list="saved-customers" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="แตะเพื่อพิมพ์หรือเลือกชื่อ..." className="input text-sm" autoComplete="off" />
        <datalist id="saved-customers">
          {savedCustomers.map((name: string, index: number) => <option key={index} value={name} />)}
        </datalist>
      </div>

      {/* Note */}
      <div className="card p-4">
        <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-2">หมายเหตุเพิ่มเติม</p>
        <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น ล้างห้องเครื่อง..." className="input text-sm" />
      </div>
    </div>
  )
}

function ExpenseForm({ states, setters }: any) {
  const dragScroll = useDraggableScroll()
  return (
    <div className="space-y-3 fade-up delay-1">
      {/* Price - ✅ แก้ไขเพิ่ม Inline style บังคับดันตัวเลขหลบ ฿ */}
      <div className="card p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--red)] mb-3">จำนวนเงิน (บาท)</p>
        <div className="relative flex items-center">
          <span className="absolute left-4 text-xl font-semibold text-[var(--text-tertiary)] pointer-events-none">฿</span>
          <input 
            type="text" 
            inputMode="numeric" 
            value={states.amount} 
            onChange={e => setters.setAmount(e.target.value.replace(/\D/g, ''))} 
            placeholder="0" 
            className="input w-full text-3xl font-bold text-[var(--red)] py-4" 
            style={{ paddingLeft: '3.5rem' }}
          />
        </div>
      </div>

      <div className="card p-4">
        <div className="flex justify-between items-end mb-2">
          <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest">จ่ายค่าอะไร</p>
        </div>
        <div {...dragScroll} className="flex gap-2 overflow-x-auto pb-3 mb-2 no-scrollbar cursor-grab active:cursor-grabbing">
          {EXPENSE_PRESETS.map(preset => (
            <button key={preset.label} type="button" onClick={() => setters.setTitle(preset.label)} className={`flex-shrink-0 px-3 py-1.5 rounded-[var(--radius-md)] border text-xs font-semibold transition-all ${states.title === preset.label ? 'bg-[var(--red)] text-white border-transparent' : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--red-light)] hover:text-[var(--red)] hover:border-transparent'}`}>
              <span aria-hidden="true">{preset.icon}</span> {preset.label}
            </button>
          ))}
        </div>
        <input type="text" value={states.title} onChange={e => setters.setTitle(e.target.value)} placeholder="พิมพ์หรือเลือกรายการจากด้านบน..." className="input text-sm" />
      </div>

      <div className="card p-4">
        <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-2">หมายเหตุ</p>
        <input type="text" value={states.note} onChange={e => setters.setNote(e.target.value)} placeholder="..." className="input text-sm" />
      </div>
    </div>
  )
}

function ActionButtons({ mode, saving, onSubmit }: { mode: FormMode, saving: boolean, onSubmit: (isBulk: boolean) => void }) {
  return (
    <div className="flex flex-col gap-2.5 pt-2">
      {mode === 'income' && (
        <button onClick={() => onSubmit(true)} disabled={saving} className="card w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-[var(--text-primary)] hover:shadow-[var(--shadow-md)] active:scale-[0.99] transition-all disabled:opacity-50">
          {saving ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14m-7-7h14"/></svg>
          )}
          บันทึก &amp; เพิ่มรายการต่อไป
        </button>
      )}
      <button onClick={() => onSubmit(false)} disabled={saving} className={`card-dark w-full flex items-center justify-center gap-2 py-4 text-sm font-semibold text-white active:scale-[0.99] transition-all disabled:opacity-50 ${mode === 'expense' ? '!bg-[var(--red)]' : ''}`}>
        {saving ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
        )}
        บันทึก &amp; กลับหน้าแรก
      </button>
    </div>
  )
}