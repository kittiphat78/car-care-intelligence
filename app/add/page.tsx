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
    <div className="min-h-dvh bg-[var(--bg)] pb-4">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 glass border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => router.push('/')} 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight">บันทึกรายการ</h1>
          <div className="w-10" /> {/* spacer */}
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
        
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

      </div>

      {/* ── Sticky Bottom Actions ── */}
      <div className="sticky bottom-0 z-30 glass border-t border-[var(--border)] safe-bottom mt-6">
        <div className="max-w-2xl mx-auto px-4 py-3">
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
// 4. Sub-Components
// ─────────────────────────────────────────────────────────────────────────────

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[12px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2.5">
    {children}
  </label>
)

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-sm)] border border-[var(--border)] ${className}`}>
    {children}
  </div>
)

const ModeToggle = memo(function ModeToggle({ mode, onChange }: { mode: FormMode, onChange: (m: FormMode) => void }) {
  return (
    <div className="flex bg-[var(--surface-2)] p-1.5 rounded-2xl gap-1.5 relative z-10">
      <button
        onClick={() => onChange('income')}
        className={`flex-1 py-3.5 rounded-xl text-base font-bold transition-all duration-250 ease-out active:scale-[0.98] ${
          mode === 'income' ? 'bg-white text-[var(--accent)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
        }`}
      >
        💰 รายรับ
      </button>
      <button
        onClick={() => onChange('expense')}
        className={`flex-1 py-3.5 rounded-xl text-base font-bold transition-all duration-250 ease-out active:scale-[0.98] ${
          mode === 'expense' ? 'bg-white text-[var(--red)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
        }`}
      >
        💸 รายจ่าย
      </button>
    </div>
  )
})

const SuccessBanner = memo(function SuccessBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-fit max-w-[90vw] px-6 py-4 bg-[var(--green)] rounded-2xl shadow-xl shadow-emerald-500/20 text-white flex items-center gap-3 slide-down">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span className="text-base font-bold">{message}</span>
    </div>
  )
})

const ErrorBanner = memo(function ErrorBanner({ error }: { error: string }) {
  if (!error) return null
  return (
    <div className="w-full p-4 rounded-[var(--radius-md)] bg-[var(--red-light)] border-2 border-red-200 text-[var(--red)] text-sm font-bold text-center fade-up" role="alert">
      🚨 {error}
    </div>
  )
})

const DatePicker = memo(function DatePicker({ date, onChange }: { date: string, onChange: (d: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <Card className="flex items-center justify-between cursor-pointer group hover:border-[var(--accent)] hover:border-opacity-30 transition-colors">
      <div onClick={() => ref.current?.showPicker()} className="flex-1">
        <SectionLabel>วันที่ทำรายการ</SectionLabel>
        <span className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
          {displayThaiDate(date)}
        </span>
      </div>
      <div 
        onClick={() => ref.current?.showPicker()}
        className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-tertiary)] group-hover:bg-[var(--accent-light)] group-hover:text-[var(--accent)] transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      </div>
      <input ref={ref} type="date" value={date} onChange={e => onChange(e.target.value)} className="absolute opacity-0 w-0 h-0 pointer-events-none" />
    </Card>
  )
})

function IncomeForm({ states, setters }: any) {
  const { type, plate, selectedType, selectedBrand, customerName, paymentStatus, note, price, visitCount, savedCustomers } = states
  const { setType, setPlate, setSelectedType, setSelectedBrand, setCustomerName, setPaymentStatus, setNote, setPrice } = setters
  const [brandSearch, setBrandSearch] = useState('')
  const [showAllBrands, setShowAllBrands] = useState(false)
  const [showExtra, setShowExtra] = useState(false)

  const filteredBrands = CAR_BRANDS.filter(b => 
    b.name.toLowerCase().includes(brandSearch.toLowerCase())
  )
  const displayedBrands = showAllBrands ? filteredBrands : filteredBrands.slice(0, 8)

  return (
    <div className="space-y-4 fade-up">
      
      {/* ── Service Type ── */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          type="button" 
          onClick={() => setType('wash')} 
          className={`relative flex items-center gap-3.5 p-4 rounded-[var(--radius-xl)] border-2 transition-all duration-300 ease-out active:scale-[0.97] overflow-hidden
            ${type === 'wash' 
              ? 'border-[var(--accent)] bg-[var(--accent-light)] shadow-[0_4px_20px_-6px_rgba(37,99,235,0.2)]' 
              : 'border-[var(--border)] bg-white hover:border-blue-200 hover:shadow-sm'
            }`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 z-10
            ${type === 'wash' ? 'bg-[var(--accent)] text-white shadow-lg shadow-blue-500/30 scale-105' : 'bg-[var(--surface-2)] text-[var(--text-tertiary)]'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3" />
              <circle cx="6.5" cy="16.5" r="2.5" />
              <circle cx="17.5" cy="16.5" r="2.5" />
              <path d="M11 3.52s-2.5 3.5-2.5 5.48a2.5 2.5 0 0 0 5 0c0-1.98-2.5-5.48-2.5-5.48z" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div className="text-left z-10">
            <p className={`text-base font-extrabold tracking-tight leading-tight transition-colors ${type === 'wash' ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>ล้างรถ</p>
            <p className="text-xs font-medium text-[var(--text-tertiary)] mt-0.5">บริการทั่วไป</p>
          </div>
        </button>

        <button 
          type="button" 
          onClick={() => setType('polish')} 
          className={`relative flex items-center gap-3.5 p-4 rounded-[var(--radius-xl)] border-2 transition-all duration-300 ease-out active:scale-[0.97] overflow-hidden
            ${type === 'polish' 
              ? 'border-[var(--amber)] bg-[var(--amber-light)] shadow-[0_4px_20px_-6px_rgba(217,119,6,0.2)]' 
              : 'border-[var(--border)] bg-white hover:border-amber-200 hover:shadow-sm'
            }`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 z-10
            ${type === 'polish' ? 'bg-[var(--amber)] text-white shadow-lg shadow-amber-500/30 scale-105' : 'bg-[var(--surface-2)] text-[var(--text-tertiary)]'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3" />
              <circle cx="6.5" cy="16.5" r="2.5" />
              <circle cx="17.5" cy="16.5" r="2.5" />
              <path d="M19 8l-1.5 3-3 1.5 3 1.5 1.5 3 1.5-3 3-1.5-3-1.5z" fill="currentColor" stroke="none"/>
            </svg>
          </div>
          <div className="text-left z-10">
            <p className={`text-base font-extrabold tracking-tight leading-tight transition-colors ${type === 'polish' ? 'text-[var(--amber)]' : 'text-[var(--text-primary)]'}`}>ขัดสี</p>
            <p className="text-xs font-medium text-[var(--text-tertiary)] mt-0.5">เต็นท์รถ</p>
          </div>
        </button>
      </div>

      {/* ── Plate + Price ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <SectionLabel>ป้ายทะเบียน</SectionLabel>
          <div className="relative mt-2">
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--text-primary)] to-[#2D2923] rounded-xl transform translate-y-[3px] opacity-20"></div>
            <input 
              type="text" 
              value={plate} 
              onChange={e => setPlate(e.target.value.toUpperCase())} 
              placeholder="กข 1234" 
              className="relative w-full text-center text-2xl font-extrabold tracking-widest py-4 bg-white border-2 border-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-blue-500/15 transition-all uppercase placeholder:font-medium placeholder:text-[var(--text-tertiary)] placeholder:tracking-normal" 
            />
            <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-[var(--text-primary)] opacity-20" />
            <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[var(--text-primary)] opacity-20" />
          </div>
          
          {visitCount > 0 && (
            <div className="mt-3 bg-[var(--amber-light)] border-2 border-amber-200 rounded-xl p-3 flex items-center justify-center gap-2.5 scale-in">
              <span className="text-lg leading-none" aria-hidden="true">🎉</span>
              <p className="text-[14px] font-bold text-[var(--amber)]">
                ลูกค้าประจำ! เข้ามาครั้งที่ <span className="text-base text-amber-600 bg-white px-2 py-0.5 rounded-lg shadow-sm ml-0.5 font-extrabold">{visitCount + 1}</span>
              </p>
            </div>
          )}
        </Card>

        <Card>
          <SectionLabel>ราคา (บาท)</SectionLabel>
          <div className="relative flex items-center bg-[var(--surface-2)] rounded-xl border-2 border-transparent focus-within:border-[var(--accent)] focus-within:bg-white transition-all overflow-hidden mt-2 h-[64px]">
            <span className="absolute left-4 text-xl font-bold text-[var(--text-tertiary)] select-none">฿</span>
            <input 
              type="text" 
              inputMode="numeric" 
              value={price} 
              onChange={e => setPrice(e.target.value.replace(/\D/g, ''))} 
              placeholder="0" 
              className="w-full text-right text-2xl font-extrabold text-[var(--text-primary)] py-3.5 pr-5 bg-transparent outline-none placeholder:text-[var(--text-tertiary)] placeholder:opacity-30" 
              style={{ paddingLeft: '2.5rem' }} 
            />
          </div>
        </Card>
      </div>

      {/* ── Car Type ── */}
      <Card>
        <SectionLabel>ประเภทรถ</SectionLabel>
        <div className="grid grid-cols-3 gap-2.5 mt-2">
          {CAR_TYPES.map(t => (
            <button 
              key={t.id} 
              type="button" 
              onClick={() => setSelectedType((prev: string) => prev === t.id ? '' : t.id)} 
              className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 transition-all duration-200 active:scale-95
                ${selectedType === t.id 
                  ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] shadow-sm' 
                  : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-white hover:border-[var(--text-tertiary)]'
                }`}
            >
              <span className={`text-[30px] leading-none ${selectedType === t.id ? '' : 'opacity-60'}`}>{t.icon}</span>
              <span className="text-[12px] font-bold tracking-wide truncate w-full text-center">{t.name}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* ── Car Brand (Search + Chip Grid) ── */}
      <Card>
        <SectionLabel>ยี่ห้อรถ</SectionLabel>
        
        {/* Search */}
        <div className="relative mt-2 mb-3">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" width="16" height="16" viewBox="0 0 15 15" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input 
            type="text" 
            value={brandSearch} 
            onChange={e => setBrandSearch(e.target.value)} 
            placeholder="ค้นหายี่ห้อ..." 
            className="input text-sm !min-h-[44px]" 
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {/* Chip Grid */}
        <div className="flex flex-wrap gap-2">
          {displayedBrands.map(b => (
            <button 
              key={b.id} 
              type="button" 
              onClick={() => setSelectedBrand((prev: string) => prev === b.id ? '' : b.id)} 
              className={`px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-200 active:scale-95
                ${selectedBrand === b.id 
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-md shadow-blue-500/15' 
                  : 'border-[var(--border)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:border-[var(--text-tertiary)]'
                }`}
            >
              {b.name}
            </button>
          ))}
        </div>

        {!showAllBrands && filteredBrands.length > 8 && (
          <button 
            type="button" 
            onClick={() => setShowAllBrands(true)} 
            className="mt-3 text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            ดูทั้งหมด ({filteredBrands.length}) →
          </button>
        )}
        {showAllBrands && (
          <button 
            type="button" 
            onClick={() => setShowAllBrands(false)} 
            className="mt-3 text-sm font-bold text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            ← แสดงน้อยลง
          </button>
        )}
      </Card>

      {/* ── Payment Status ── */}
      <Card>
        <SectionLabel>สถานะการชำระ</SectionLabel>
        <div className="flex gap-3 mt-2">
          <button 
            type="button" 
            onClick={() => setPaymentStatus('paid')} 
            className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl border-2 text-base font-bold transition-all active:scale-[0.98]
              ${paymentStatus === 'paid' 
                ? 'border-[var(--green)] bg-[var(--green-light)] text-[var(--green)] shadow-sm' 
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-white'
              }`}
          >
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none"><path d="M12 3.5L5.5 10 2 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ชำระแล้ว
          </button>
          <button 
            type="button" 
            onClick={() => setPaymentStatus('unpaid')} 
            className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl border-2 text-base font-bold transition-all active:scale-[0.98]
              ${paymentStatus === 'unpaid' 
                ? 'border-[var(--red)] bg-[var(--red-light)] text-[var(--red)] shadow-sm' 
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-white'
              }`}
          >
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            ค้างชำระ
          </button>
        </div>
      </Card>

      {/* ── Extra Info (Collapsible) ── */}
      <Card>
        <button 
          type="button" 
          onClick={() => setShowExtra(!showExtra)} 
          className="flex items-center justify-between w-full"
        >
          <SectionLabel>ข้อมูลเพิ่มเติม (ถ้ามี)</SectionLabel>
          <svg 
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-300 ${showExtra ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        
        {showExtra && (
          <div className="space-y-4 mt-4 fade-up">
            <div>
              <label className="text-sm font-bold text-[var(--text-secondary)] mb-1.5 block">ชื่อลูกค้า / เต็นท์รถ</label>
              <input 
                type="text" 
                list="saved-customers" 
                value={customerName} 
                onChange={e => setCustomerName(e.target.value)} 
                placeholder="พิมพ์เพื่อค้นหาประวัติ..." 
                className="input" 
                autoComplete="off" 
              />
              <datalist id="saved-customers">
                {savedCustomers.map((name: string, index: number) => <option key={index} value={name} />)}
              </datalist>
            </div>
            <div>
              <label className="text-sm font-bold text-[var(--text-secondary)] mb-1.5 block">หมายเหตุ</label>
              <input 
                type="text" 
                value={note} 
                onChange={e => setNote(e.target.value)} 
                placeholder="เช่น ล้างห้องเครื่อง, ขัดไฟหน้า..." 
                className="input" 
              />
            </div>
          </div>
        )}
      </Card>
      
    </div>
  )
}

function ExpenseForm({ states, setters }: any) {
  return (
    <div className="space-y-4 fade-up">
      
      <Card>
        <SectionLabel>จำนวนเงินที่จ่าย (บาท)</SectionLabel>
        <div className="relative flex items-center bg-red-50/50 rounded-xl border-2 border-transparent focus-within:border-[var(--red)] focus-within:bg-white transition-all overflow-hidden mt-2 h-[64px]">
          <span className="absolute left-4 text-xl font-bold text-red-300 select-none">฿</span>
          <input 
            type="text" 
            inputMode="numeric" 
            value={states.amount} 
            onChange={e => setters.setAmount(e.target.value.replace(/\D/g, ''))} 
            placeholder="0" 
            className="w-full text-right text-2xl font-extrabold text-[var(--red)] py-3.5 pr-5 bg-transparent outline-none placeholder:text-red-200" 
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </Card>

      <Card>
        <SectionLabel>จ่ายค่าอะไร</SectionLabel>
        
        <div className="flex flex-wrap gap-2 mt-2 mb-3">
          {EXPENSE_PRESETS.map(preset => {
            const isSelected = states.title === preset.label;
            return (
              <button 
                key={preset.label} 
                type="button" 
                onClick={() => setters.setTitle(states.title === preset.label ? '' : preset.label)} 
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-200 active:scale-95
                  ${isSelected 
                    ? 'bg-[var(--red)] text-white border-[var(--red)] shadow-md shadow-red-500/15' 
                    : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-red-50 hover:border-red-200'
                  }`}
              >
                <span className="text-base">{preset.icon}</span>
                {preset.label}
              </button>
            )
          })}
        </div>
        
        <input 
          type="text" 
          value={states.title} 
          onChange={e => setters.setTitle(e.target.value)} 
          placeholder="หรือพิมพ์ชื่อรายการเอง..." 
          className="input" 
        />
      </Card>

      <Card>
        <SectionLabel>หมายเหตุ (ถ้ามี)</SectionLabel>
        <input 
          type="text" 
          value={states.note} 
          onChange={e => setters.setNote(e.target.value)} 
          placeholder="..." 
          className="input mt-2" 
        />
      </Card>
    </div>
  )
}

function ActionButtons({ mode, saving, onSubmit }: { mode: FormMode, saving: boolean, onSubmit: (isBulk: boolean) => void }) {
  return (
    <div className="flex gap-3">
      <button 
        onClick={() => onSubmit(true)} 
        disabled={saving} 
        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-[var(--border)] rounded-2xl text-[15px] font-bold text-[var(--text-secondary)] hover:border-[var(--text-tertiary)] hover:bg-[var(--surface-2)] active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {saving ? (
          <span className="w-5 h-5 border-2 border-[var(--border)] border-t-[var(--text-tertiary)] rounded-full spinner" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"/></svg>
        )}
        บันทึกแล้วทำต่อ
      </button>

      <button 
        onClick={() => onSubmit(false)} 
        disabled={saving} 
        className={`flex-[1.5] flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[15px] font-bold text-white shadow-lg active:scale-[0.98] transition-all disabled:opacity-70
          ${mode === 'expense' ? 'bg-[var(--red)] shadow-red-500/20 hover:bg-[#B91C1C]' : 'bg-[var(--accent)] shadow-blue-500/20 hover:bg-[var(--accent-hover)]'}`}
      >
        {saving ? (
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full spinner" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
        )}
        บันทึก & กลับหน้าหลัก
      </button>
    </div>
  )
}