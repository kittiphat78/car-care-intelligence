'use client'

import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RecordType, CAR_TYPES, CAR_BRANDS, PaymentStatus } from '@/types'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

/* ═══════════════════════════════════════════════════════════════════════════
   Constants & Utilities (no logic changes)
   ═══════════════════════════════════════════════════════════════════════════ */

type FormMode = 'income' | 'expense'

const EXPENSE_PRESETS = [
  { icon: '💧', label: 'ค่าน้ำยา' },
  { icon: '👷', label: 'ค่าแรง' },
  { icon: '🍚', label: 'ค่าข้าว' },
  { icon: '🏠', label: 'ค่าเช่า' },
  { icon: '⚡', label: 'ค่าไฟ' },
  { icon: '🚰', label: 'ค่าน้ำ' },
  { icon: '🗑️', label: 'ค่าขยะ' },
  { icon: '🛒', label: 'อุปกรณ์' },
]

const QUICK_PICK_LIMIT = 3

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

/* ═══════════════════════════════════════════════════════════════════════════
   Custom Hooks (100% original logic, untouched)
   ═══════════════════════════════════════════════════════════════════════════ */

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
    if (stored) { try { setSavedCustomers(JSON.parse(stored)) } catch { } }
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
    if (checkPlate.length < 3) { setVisitCount(0); return }
    const timer = setTimeout(async () => {
      const { count } = await supabase
        .from('records').select('*', { count: 'exact', head: true }).eq('plate', checkPlate)
      setVisitCount(count ?? 0)
    }, 600)
    return () => clearTimeout(timer)
  }, [plate])
  return visitCount
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function AddPage() {
  const router = useRouter()
  const { id: userId, email: userEmail } = useAuthUser()
  const { savedCustomers, addCustomer } = useRecentCustomers()

  const [formMode, setFormMode] = useState<FormMode>('income')
  const [date, setDate] = useState(getTodayStr())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Income
  const [type, setType] = useState<RecordType>('wash')
  const [plate, setPlate] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid')
  const [note, setNote] = useState('')
  const [price, setPrice] = useState('')
  const visitCount = useCustomerVisitCount(plate)

  // Expense
  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNote, setExpenseNote] = useState('')

  const resetIncomeForm = useCallback(() => {
    setPlate(''); setPrice(''); setNote(''); setCustomerName('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  const resetExpenseForm = useCallback(() => {
    setExpenseTitle(''); setExpenseAmount(''); setExpenseNote('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const submitIncome = useCallback(async (isBulk: boolean) => {
    // 1. กำหนด Schema ด้วย Zod สำหรับ Income
    const incomeSchema = z.object({
      plate: z.string().min(1, 'กรุณากรอกป้ายทะเบียน').max(20, 'ป้ายทะเบียนยาวเกินไป'),
      selectedType: z.string().min(1, 'กรุณาเลือกประเภทรถ'),
      price: z.number().min(0, 'ราคาต้องมากกว่าหรือเท่ากับ 0'),
      customerName: z.string().max(50, 'ชื่อลูกค้ายาวเกินไป').optional(),
      note: z.string().max(200, 'หมายเหตุยาวเกินไป').optional()
    })

    // 2. Validate ข้อมูลด้วย Zod
    const validationResult = incomeSchema.safeParse({
      plate: plate.trim(),
      selectedType,
      price: price ? parseInt(price, 10) : -1, // ส่ง -1 ไปให้ Zod ตีตกถ้าราคาว่าง
      customerName: customerName.trim(),
      note: note.trim()
    })

    if (!validationResult.success) {
      // ดึง Error ตัวแรกมาแสดง
      return setError(validationResult.error.issues[0].message)
    }

    // 3. Sanitize ข้อมูลป้องกัน XSS
    const safePlate = DOMPurify.sanitize(validationResult.data.plate).toUpperCase()
    const safeCustomerName = DOMPurify.sanitize(validationResult.data.customerName || '')
    const safeNote = DOMPurify.sanitize(validationResult.data.note || '')
    const safePrice = validationResult.data.price

    const timestamp = generateTimestamp(date)
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999)

    const { count } = await supabase.from('records').select('*', { count: 'exact', head: true })
      .gte('created_at', dayStart.toISOString()).lte('created_at', dayEnd.toISOString())

    const typeName = CAR_TYPES.find(t => t.id === selectedType)?.name || ''
    const brandName = CAR_BRANDS.find(b => b.id === selectedBrand)?.name || ''
    const services = [typeName, brandName, safeNote]

    const { error } = await supabase.from('records').insert({
      type, plate: safePlate, services, price: safePrice,
      seq_number: (count ?? 0) + 1, created_at: timestamp, created_by: userId,
      created_by_email: userEmail, payment_method: 'cash', customer_name: safeCustomerName,
      payment_status: paymentStatus, job_status: 'done',
    })
    if (error) throw error
    if (safeCustomerName) addCustomer(safeCustomerName)
    if (isBulk) {
      setSuccessMsg(`บันทึก ${safePlate} สำเร็จ`)
      resetIncomeForm(); setTimeout(() => setSuccessMsg(''), 4000)
    } else { router.push('/'); router.refresh() }
  }, [plate, selectedType, price, customerName, note, date, type, selectedBrand, paymentStatus, userId, userEmail, addCustomer, resetIncomeForm, router])

  const submitExpense = useCallback(async (isBulk: boolean) => {
    // 1. Zod Schema สำหรับ Expense
    const expenseSchema = z.object({
      title: z.string().min(1, 'กรุณาระบุรายการจ่าย').max(100, 'รายการยาวเกินไป'),
      amount: z.number().min(1, 'จำนวนเงินต้องมากกว่า 0'),
      note: z.string().max(200, 'หมายเหตุยาวเกินไป').optional()
    })

    const validationResult = expenseSchema.safeParse({
      title: expenseTitle.trim(),
      amount: expenseAmount ? parseInt(expenseAmount, 10) : -1,
      note: expenseNote.trim()
    })

    if (!validationResult.success) {
      return setError(validationResult.error.issues[0].message)
    }

    // 2. Sanitize ข้อมูลป้องกัน XSS
    const safeTitle = DOMPurify.sanitize(validationResult.data.title)
    const safeNote = DOMPurify.sanitize(validationResult.data.note || '')
    const safeAmount = validationResult.data.amount

    const { error } = await supabase.from('expenses').insert({
      title: safeTitle, amount: safeAmount,
      created_at: generateTimestamp(date), created_by: userId, created_by_email: userEmail,
      note: safeNote,
    })
    if (error) throw error
    if (isBulk) {
      setSuccessMsg(`บันทึกรายจ่าย ${safeTitle} สำเร็จ`)
      resetExpenseForm(); setTimeout(() => setSuccessMsg(''), 4000)
    } else { router.push('/'); router.refresh() }
  }, [expenseTitle, expenseAmount, expenseNote, date, userId, userEmail, resetExpenseForm, router])

  const handleSubmit = useCallback(async (isBulk: boolean = false) => {
    setError(''); setSuccessMsg(''); setSaving(true)
    try {
      if (formMode === 'income') await submitIncome(isBulk)
      else await submitExpense(isBulk)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'ลองใหม่อีกครั้ง'
      setError('บันทึกไม่สำเร็จ: ' + message)
    } finally { setSaving(false) }
  }, [formMode, submitIncome, submitExpense])

  return (
    <div className="min-h-dvh bg-[var(--bg)]">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 glass border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-secondary)] active:scale-90 transition-transform" aria-label="กลับหน้าหลัก">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h1 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight">บันทึกรายการ</h1>
          <div className="w-10" aria-hidden="true" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5 pb-5">
        <ModeToggle mode={formMode} onChange={(m) => { setFormMode(m); setError(''); setSuccessMsg('') }} />
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

        {error && <ErrorBanner error={error} />}

        {/* ── Save Buttons (at the bottom of the form) ── */}
        <div className="pt-2 pb-6">
          <ActionButtons mode={formMode} saving={saving} onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Shared UI Atoms
   ═══════════════════════════════════════════════════════════════════════════ */

const SectionLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-[12px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2.5">
    {children} {required && <span className="text-[var(--red)] normal-case text-sm">*</span>}
  </label>
)
const Card = ({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div className={`bg-white rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-sm)] border border-[var(--border)] ${className}`} onClick={onClick}>{children}</div>
)

/* ═══════════════════════════════════════════════════════════════════════════
   Mode Toggle
   ═══════════════════════════════════════════════════════════════════════════ */

const ModeToggle = memo(function ModeToggle({ mode, onChange }: { mode: FormMode; onChange: (m: FormMode) => void }) {
  return (
    <div className="flex bg-[var(--surface-2)] p-1.5 rounded-2xl gap-1.5" role="tablist" aria-label="เลือกรายรับหรือรายจ่าย">
      <button
        role="tab" aria-selected={mode === 'income'} aria-controls="income-panel"
        onClick={() => onChange('income')}
        className={`flex-1 py-3.5 rounded-xl text-base font-bold transition-all duration-150 active:scale-[0.98] ${mode === 'income' ? 'bg-white text-[var(--accent)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-tertiary)]'
          }`}
      >💰 รายรับ</button>
      <button
        role="tab" aria-selected={mode === 'expense'} aria-controls="expense-panel"
        onClick={() => onChange('expense')}
        className={`flex-1 py-3.5 rounded-xl text-base font-bold transition-all duration-150 active:scale-[0.98] ${mode === 'expense' ? 'bg-white text-[var(--red)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-tertiary)]'
          }`}
      >💸 รายจ่าย</button>
    </div>
  )
})

/* ═══════════════════════════════════════════════════════════════════════════
   Banners
   ═══════════════════════════════════════════════════════════════════════════ */

const SuccessBanner = memo(function SuccessBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-fit max-w-[90vw] px-6 py-4 bg-[var(--green)] rounded-2xl shadow-xl shadow-emerald-500/20 text-white flex items-center gap-3 slide-down" role="status" aria-live="polite">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
      <span className="text-base font-bold">{message}</span>
    </div>
  )
})

const ErrorBanner = memo(function ErrorBanner({ error }: { error: string }) {
  if (!error) return null
  return (
    <div className="w-full p-4 rounded-[var(--radius-md)] bg-[var(--red-light)] border-2 border-red-200 text-[var(--red)] text-sm font-bold text-center fade-up" role="alert" aria-live="assertive">
      🚨 {error}
    </div>
  )
})

/* ═══════════════════════════════════════════════════════════════════════════
   Date Picker
   ═══════════════════════════════════════════════════════════════════════════ */

const DatePicker = memo(function DatePicker({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const openPicker = useCallback(() => ref.current?.showPicker(), [])
  return (
    <Card className="flex items-center justify-between cursor-pointer group" onClick={openPicker}>
      <div>
        <SectionLabel>วันที่ทำรายการ</SectionLabel>
        <div className="flex items-baseline gap-2.5">
          <span className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">{displayThaiDate(date)}</span>
          <span className="text-sm font-bold text-[var(--accent)]">เปลี่ยน</span>
        </div>
      </div>
      <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-tertiary)]" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
      </div>
      <input ref={ref} type="date" value={date} onChange={e => onChange(e.target.value)} className="absolute opacity-0 w-0 h-0 pointer-events-none" tabIndex={-1} aria-hidden="true" />
    </Card>
  )
})

/* ═══════════════════════════════════════════════════════════════════════════
   Income Form
   ═══════════════════════════════════════════════════════════════════════════ */

interface IncomeFormProps {
  states: {
    type: import('@/types').RecordType
    plate: string
    selectedType: string
    selectedBrand: string
    customerName: string
    paymentStatus: import('@/types').PaymentStatus
    note: string
    price: string
    visitCount: number
    savedCustomers: string[]
  }
  setters: {
    setType: (v: import('@/types').RecordType) => void
    setPlate: (v: string) => void
    setSelectedType: (v: string | ((prev: string) => string)) => void
    setSelectedBrand: (v: string | ((prev: string) => string)) => void
    setCustomerName: (v: string) => void
    setPaymentStatus: (v: import('@/types').PaymentStatus) => void
    setNote: (v: string) => void
    setPrice: (v: string) => void
  }
}

function IncomeForm({ states, setters }: IncomeFormProps) {
  const { type, plate, selectedType, selectedBrand, customerName, paymentStatus, note, price, visitCount, savedCustomers } = states
  const { setType, setPlate, setSelectedType, setSelectedBrand, setCustomerName, setPaymentStatus, setNote, setPrice } = setters
  const [brandSearch, setBrandSearch] = useState('')
  const [showAllBrands, setShowAllBrands] = useState(false)
  const [showExtraFields, setShowExtraFields] = useState(false)

  // Quick-pick: top 3 recent customers
  const quickPickNames = useMemo(() => savedCustomers.slice(0, QUICK_PICK_LIMIT), [savedCustomers])

  const filteredBrands = useMemo(
    () => CAR_BRANDS.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase())),
    [brandSearch]
  )
  const displayedBrands = showAllBrands ? filteredBrands : filteredBrands.slice(0, 8)

  return (
    <div className="space-y-4 fade-up" id="income-panel" role="tabpanel">

      {/* ── Service Type ── */}
      <div className="grid grid-cols-2 gap-3">
        <ServiceTypeButton
          active={type === 'wash'}
          onClick={() => setType('wash')}
          icon={<WashIcon />}
          label="ล้างรถ"
          sublabel="บริการทั่วไป"
          color="accent"
        />
        <ServiceTypeButton
          active={type === 'polish'}
          onClick={() => setType('polish')}
          icon={<PolishIcon />}
          label="ขัดสี"
          sublabel="เต็นท์รถ"
          color="amber"
        />
      </div>

      {/* ── Plate + Price ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <SectionLabel required>ป้ายทะเบียน</SectionLabel>
          <div className="relative mt-2">
            <input
              type="text"
              value={plate}
              onChange={e => setPlate(e.target.value.toUpperCase())}
              placeholder="กข 1234"
              className="w-full text-center text-2xl font-extrabold tracking-widest py-4 bg-white border-2 border-[var(--border)] rounded-xl transition-all uppercase placeholder:font-medium placeholder:text-[var(--text-tertiary)] placeholder:tracking-normal focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_rgba(37,99,235,0.08)]"
              aria-required="true"
              aria-label="ป้ายทะเบียนรถ"
              autoComplete="off"
            />
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
          <SectionLabel required>ราคา (บาท)</SectionLabel>
          <div className="relative flex items-center bg-[var(--surface-2)] rounded-xl border-2 border-transparent focus-within:border-[var(--accent)] focus-within:bg-white transition-all mt-2 h-[64px]">
            <span className="absolute left-4 text-xl font-bold text-[var(--text-tertiary)] select-none" aria-hidden="true">฿</span>
            <input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={e => setPrice(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              className="w-full text-right text-2xl font-extrabold text-[var(--text-primary)] py-3.5 pr-5 bg-transparent placeholder:text-[var(--text-tertiary)] placeholder:opacity-30"
              style={{ paddingLeft: '2.5rem' }}
              aria-required="true"
              aria-label="ราคา"
            />
          </div>
        </Card>
      </div>

      {/* ── Car Type ── */}
      <Card>
        <SectionLabel required>ประเภทรถ</SectionLabel>
        <div className="grid grid-cols-3 gap-2.5 mt-2">
          {CAR_TYPES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedType((prev: string) => prev === t.id ? '' : t.id)}
              className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 transition-all duration-150 active:scale-95
                ${selectedType === t.id
                  ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] shadow-sm'
                  : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]'
                }`}
              aria-pressed={selectedType === t.id}
              aria-label={`ประเภท ${t.name}`}
            >
              <span className={`text-[30px] leading-none ${selectedType === t.id ? '' : 'opacity-60'}`}>{t.icon}</span>
              <span className="text-[12px] font-bold tracking-wide truncate w-full text-center">{t.name}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* ── Car Brand ── */}
      <Card>
        <SectionLabel>ยี่ห้อรถ</SectionLabel>
        <div className="relative mt-2 mb-3">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" width="16" height="16" viewBox="0 0 15 15" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3" /><path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          <input
            type="text"
            value={brandSearch}
            onChange={e => setBrandSearch(e.target.value)}
            placeholder="ค้นหายี่ห้อ..."
            className="input text-sm !min-h-[44px]"
            style={{ paddingLeft: '2.5rem' }}
            aria-label="ค้นหายี่ห้อรถ"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {displayedBrands.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedBrand((prev: string) => prev === b.id ? '' : b.id)}
              className={`px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-150 active:scale-95
                ${selectedBrand === b.id
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-md shadow-blue-500/15'
                  : 'border-[var(--border)] bg-white text-[var(--text-secondary)]'
                }`}
              aria-pressed={selectedBrand === b.id}
            >{b.name}</button>
          ))}
        </div>
        {!showAllBrands && filteredBrands.length > 8 && (
          <button type="button" onClick={() => setShowAllBrands(true)} className="mt-3 text-sm font-bold text-[var(--accent)] active:scale-95 transition-transform">
            ดูทั้งหมด ({filteredBrands.length}) →
          </button>
        )}
        {showAllBrands && (
          <button type="button" onClick={() => setShowAllBrands(false)} className="mt-3 text-sm font-bold text-[var(--text-tertiary)]">
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
            className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl border-2 text-base font-bold transition-all duration-150 active:scale-[0.98]
              ${paymentStatus === 'paid'
                ? 'border-[var(--green)] bg-[var(--green-light)] text-[var(--green)] shadow-sm'
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]'
              }`}
            aria-pressed={paymentStatus === 'paid'}
          >✅ ชำระแล้ว</button>
          <button
            type="button"
            onClick={() => setPaymentStatus('unpaid')}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl border-2 text-base font-bold transition-all duration-150 active:scale-[0.98]
              ${paymentStatus === 'unpaid'
                ? 'border-[var(--red)] bg-[var(--red-light)] text-[var(--red)] shadow-sm'
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]'
              }`}
            aria-pressed={paymentStatus === 'unpaid'}
          >⏳ ค้างชำระ</button>
        </div>
      </Card>

      {/* ── Quick-Pick Customer + Expandable Extra Fields ── */}
      <Card>
        <SectionLabel>ลูกค้า / เต็นท์</SectionLabel>

        {/* Quick-pick chips — always show top 3 recent names */}
        {quickPickNames.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1 mb-3">
            {quickPickNames.map((name: string) => (
              <button
                key={name}
                type="button"
                onClick={() => setCustomerName(customerName === name ? '' : name)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-150 active:scale-95
                  ${customerName === name
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-md shadow-blue-500/15'
                    : 'border-[var(--border)] bg-white text-[var(--text-secondary)]'
                  }`}
                aria-pressed={customerName === name}
              >
                <span className="text-base leading-none" aria-hidden="true">👤</span>
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Expand button */}
        {!showExtraFields && (
          <button
            type="button"
            onClick={() => setShowExtraFields(true)}
            className="flex items-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-dashed border-[var(--border)] text-sm font-bold text-[var(--text-tertiary)] transition-all duration-150 active:scale-[0.98]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14m-7-7h14" /></svg>
            {quickPickNames.length > 0 ? 'พิมพ์ชื่อเอง / เพิ่มหมายเหตุ' : 'เพิ่มชื่อลูกค้า / หมายเหตุ'}
          </button>
        )}

        {/* Expanded fields */}
        {showExtraFields && (
          <div className="space-y-4 fade-up">
            <div>
              <label className="text-sm font-bold text-[var(--text-secondary)] mb-1.5 block">ชื่อลูกค้า / เต็นท์รถ</label>
              <input
                type="text"
                list="saved-customers"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="พิมพ์ชื่อ..."
                className="input"
                autoComplete="off"
                aria-label="ชื่อลูกค้า"
              />
              <datalist id="saved-customers">
                {savedCustomers.map((name: string, i: number) => <option key={i} value={name} />)}
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
                aria-label="หมายเหตุ"
              />
            </div>
            <button type="button" onClick={() => setShowExtraFields(false)} className="text-sm font-bold text-[var(--text-tertiary)] active:scale-95 transition-transform">
              ▲ ซ่อน
            </button>
          </div>
        )}
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Expense Form
   ═══════════════════════════════════════════════════════════════════════════ */

interface ExpenseFormProps {
  states: { title: string; amount: string; note: string }
  setters: { setTitle: (v: string) => void; setAmount: (v: string) => void; setNote: (v: string) => void }
}

function ExpenseForm({ states, setters }: ExpenseFormProps) {
  return (
    <div className="space-y-4 fade-up" id="expense-panel" role="tabpanel">
      <Card>
        <SectionLabel required>จำนวนเงินที่จ่าย (บาท)</SectionLabel>
        <div className="relative flex items-center bg-red-50/50 rounded-xl border-2 border-transparent focus-within:border-[var(--red)] focus-within:bg-white transition-all mt-2 h-[64px]">
          <span className="absolute left-4 text-xl font-bold text-red-300 select-none" aria-hidden="true">฿</span>
          <input
            type="text"
            inputMode="numeric"
            value={states.amount}
            onChange={e => setters.setAmount(e.target.value.replace(/\D/g, ''))}
            placeholder="0"
            className="w-full text-right text-2xl font-extrabold text-[var(--red)] py-3.5 pr-5 bg-transparent placeholder:text-red-200"
            style={{ paddingLeft: '2.5rem' }}
            aria-required="true"
            aria-label="จำนวนเงิน"
          />
        </div>
      </Card>

      <Card>
        <SectionLabel required>จ่ายค่าอะไร</SectionLabel>
        <div className="flex flex-wrap gap-2 mt-2 mb-3">
          {EXPENSE_PRESETS.map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setters.setTitle(states.title === preset.label ? '' : preset.label)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-150 active:scale-95
                ${states.title === preset.label
                  ? 'bg-[var(--red)] text-white border-[var(--red)] shadow-md shadow-red-500/15'
                  : 'bg-white text-[var(--text-secondary)] border-[var(--border)]'
                }`}
              aria-pressed={states.title === preset.label}
            >
              <span className="text-base" aria-hidden="true">{preset.icon}</span>{preset.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={states.title}
          onChange={e => setters.setTitle(e.target.value)}
          placeholder="หรือพิมพ์ชื่อรายการเอง..."
          className="input"
          aria-label="ชื่อรายการจ่าย"
        />
      </Card>

      <Card>
        <SectionLabel>หมายเหตุ (ถ้ามี)</SectionLabel>
        <input type="text" value={states.note} onChange={e => setters.setNote(e.target.value)} placeholder="..." className="input mt-2" aria-label="หมายเหตุรายจ่าย" />
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Action Buttons
   ═══════════════════════════════════════════════════════════════════════════ */

function ActionButtons({ mode, saving, onSubmit }: { mode: FormMode; saving: boolean; onSubmit: (isBulk: boolean) => void }) {
  return (
    <div className="flex gap-3">
      <button
        onClick={() => onSubmit(true)}
        disabled={saving}
        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-[var(--border)] rounded-2xl text-[15px] font-bold text-[var(--text-secondary)] active:scale-[0.98] transition-transform disabled:opacity-50"
        aria-label="บันทึกแล้วทำรายการต่อ"
        aria-busy={saving}
      >
        {saving ? <Spinner /> : <PlusSmIcon />}
        บันทึกแล้วทำต่อ
      </button>
      <button
        onClick={() => onSubmit(false)}
        disabled={saving}
        className={`flex-[1.5] flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[15px] font-bold text-white shadow-lg active:scale-[0.98] transition-transform disabled:opacity-70
          ${mode === 'expense' ? 'bg-[var(--red)] shadow-red-500/20' : 'bg-[var(--accent)] shadow-blue-500/20'}`}
        aria-label="บันทึกและกลับหน้าหลัก"
        aria-busy={saving}
      >
        {saving ? <Spinner white /> : <SaveIcon />}
        บันทึก & กลับหน้าหลัก
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Service Type Button (reusable)
   ═══════════════════════════════════════════════════════════════════════════ */

function ServiceTypeButton({ active, onClick, icon, label, sublabel, color }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; sublabel: string; color: 'accent' | 'amber'
}) {
  const colors = color === 'accent'
    ? { border: 'border-[var(--accent)]', bg: 'bg-[var(--accent-light)]', iconBg: active ? 'bg-[var(--accent)] text-white shadow-lg shadow-blue-500/30' : 'bg-[var(--surface-2)] text-[var(--text-tertiary)]', text: 'text-[var(--accent)]' }
    : { border: 'border-[var(--amber)]', bg: 'bg-[var(--amber-light)]', iconBg: active ? 'bg-[var(--amber)] text-white shadow-lg shadow-amber-500/30' : 'bg-[var(--surface-2)] text-[var(--text-tertiary)]', text: 'text-[var(--amber)]' }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-3.5 p-4 rounded-[var(--radius-xl)] border-2 transition-all duration-150 active:scale-[0.97]
        ${active ? `${colors.border} ${colors.bg}` : 'border-[var(--border)] bg-white'
        }`}
      aria-pressed={active}
      aria-label={`${label} ${sublabel}`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 ${colors.iconBg}`}>{icon}</div>
      <div className="text-left">
        <p className={`text-base font-extrabold tracking-tight leading-tight ${active ? colors.text : 'text-[var(--text-primary)]'}`}>{label}</p>
        <p className="text-xs font-medium text-[var(--text-tertiary)] mt-0.5">{sublabel}</p>
      </div>
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SVG Icons
   ═══════════════════════════════════════════════════════════════════════════ */

const WashIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);

const PolishIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="2" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="2" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="4.93" x2="7.05" y2="7.05" />
    <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" />
    <line x1="4.93" y1="19.07" x2="7.05" y2="16.95" />
    <line x1="16.95" y1="6.34" x2="19.07" y2="4.22" />
  </svg>
);
const PlusSmIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14m-7-7h14" /></svg>)
const SaveIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></svg>)
const Spinner = ({ white }: { white?: boolean }) => (<span className={`w-5 h-5 border-2 rounded-full spinner ${white ? 'border-white/30 border-t-white' : 'border-[var(--border)] border-t-[var(--text-tertiary)]'}`} aria-hidden="true" />)