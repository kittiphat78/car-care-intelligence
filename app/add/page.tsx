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
  const [userId, setUserId]           = useState<string | null>(null)
  const [formMode, setFormMode]       = useState<FormMode>('income')
  const [date, setDate]               = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [successMsg, setSuccessMsg]   = useState('')
  const dateInputRef                  = useRef<HTMLInputElement>(null)
  const scrollRef                     = useRef<HTMLDivElement>(null)

  // Income states
  const [type, setType]                     = useState<RecordType>('wash')
  const [plate, setPlate]                   = useState('')
  const [selectedType, setSelectedType]     = useState('')
  const [selectedBrand, setSelectedBrand]   = useState('')
  const [customerName, setCustomerName]     = useState('')
  const [paymentStatus, setPaymentStatus]   = useState<PaymentStatus>('paid')
  const [note, setNote]                     = useState('')
  const [price, setPrice]                   = useState('')

  // Expense states
  const [expenseTitle, setExpenseTitle]   = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseNote, setExpenseNote]     = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  // Drag-to-scroll for brand chips
  const [isDown, setIsDown]       = useState(false)
  const [startX, setStartX]       = useState(0)
  const [scrollLeftVal, setScrollLeftVal] = useState(0)
  const handleMouseDown  = (e: React.MouseEvent) => { setIsDown(true); setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0)); setScrollLeftVal(scrollRef.current?.scrollLeft || 0) }
  const handleMouseLeave = () => setIsDown(false)
  const handleMouseUp    = () => setIsDown(false)
  const handleMouseMove  = (e: React.MouseEvent) => {
    if (!isDown) return
    e.preventDefault()
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0)
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollLeftVal - (x - startX) * 2
  }

  const getTimestamp = () => {
    const now = new Date()
    const d   = new Date(date)
    d.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
    return d.toISOString()
  }

  async function submitIncome(isBulk: boolean) {
    if (!plate.trim())                    return setError('กรุณากรอกป้ายทะเบียน')
    if (!selectedType)                    return setError('กรุณาเลือกประเภทรถ')
    if (!price || parseInt(price) <= 0)   return setError('กรุณากรอกราคา')

    const timestamp  = getTimestamp()
    const dayStart   = new Date(date); dayStart.setHours(0, 0, 0, 0)
    const dayEnd     = new Date(date); dayEnd.setHours(23, 59, 59, 999)

    const { count } = await supabase.from('records').select('*', { count: 'exact', head: true })
      .gte('created_at', dayStart.toISOString())
      .lte('created_at', dayEnd.toISOString())

    const typeName  = CAR_TYPES.find(t => t.id === selectedType)?.name || ''
    const brandName = CAR_BRANDS.find(b => b.id === selectedBrand)?.name || ''
    const services  = [typeName, brandName, note.trim()]

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
      setSuccessMsg(`บันทึก ${plate.toUpperCase().trim()} สำเร็จ`)
      setPlate(''); setPrice(''); setNote('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => setSuccessMsg(''), 4000)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  async function submitExpense() {
    if (!expenseTitle.trim())                       return setError('กรุณาระบุรายการจ่าย')
    if (!expenseAmount || parseInt(expenseAmount) <= 0) return setError('กรุณากรอกจำนวนเงิน')

    const { error } = await supabase.from('expenses').insert({
      title:      expenseTitle.trim(),
      amount:     parseInt(expenseAmount),
      created_at: getTimestamp(),
      created_by: userId,
      note:       expenseNote.trim(),
    })

    if (error) throw error
    router.push('/')
    router.refresh()
  }

  async function handleSubmit(isBulk: boolean = false) {
    setError(''); setSuccessMsg(''); setSaving(true)
    try {
      if (formMode === 'income') await submitIncome(isBulk)
      else await submitExpense()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'ลองใหม่อีกครั้ง'
      setError('บันทึกไม่สำเร็จ: ' + msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-dvh px-4 pt-6 space-y-4">

      {/* ── Mode Toggle ──────────────────────────────────────────────── */}
      <div className="flex bg-[var(--surface-2)] p-1.5 rounded-[var(--radius-lg)] gap-1.5 fade-up">
        <button
          onClick={() => { setFormMode('income'); setError(''); setSuccessMsg('') }}
          className={`flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
            formMode === 'income'
              ? 'bg-white text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          รายรับ
        </button>
        <button
          onClick={() => { setFormMode('expense'); setError(''); setSuccessMsg('') }}
          className={`flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
            formMode === 'expense'
              ? 'bg-white text-[var(--red)] shadow-[var(--shadow-sm)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          รายจ่าย
        </button>
      </div>

      {/* ── Success Banner ───────────────────────────────────────────── */}
      {successMsg && (
        <div className="card p-3.5 flex items-center gap-3 border-[var(--green)] fade-up">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--green-light,#dcfce7)] flex items-center justify-center shrink-0">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M12.5 3.5l-7 7L2 7" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{successMsg}</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">กรอกรายการถัดไปได้เลย</p>
          </div>
        </div>
      )}

      {/* ── Date Picker ──────────────────────────────────────────────── */}
      <div className="card p-4 fade-up delay-1">
        <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-2.5">วันที่</p>
        <div
          onClick={() => dateInputRef.current?.showPicker()}
          className="flex items-center justify-between cursor-pointer"
        >
          <span className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            {displayThaiDate(date)}
          </span>
          <span className="text-xs font-semibold text-[var(--text-tertiary)] bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-1.5 hover:text-[var(--text-primary)] transition-colors">
            เปลี่ยน
          </span>
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="absolute opacity-0 pointer-events-none"
          />
        </div>
      </div>

      {/* ── INCOME FORM ──────────────────────────────────────────────── */}
      {formMode === 'income' ? (
        <div className="space-y-3 fade-up delay-1">

          {/* Service type */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setType('wash')}
              className={`card flex items-center gap-3 p-4 transition-all ${
                type === 'wash'
                  ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                  : 'hover:shadow-[var(--shadow-md)]'
              }`}
            >
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${type === 'wash' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] text-[var(--text-tertiary)]'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17a5 5 0 0 1 10 0"/><path d="M5 17H3a1 1 0 0 1-1-1V9l3-4h14l3 4v7a1 1 0 0 1-1 1h-2"/>
                  <circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
                </svg>
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${type === 'wash' ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>ล้างรถ</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">ทั่วไป</p>
              </div>
            </button>

            <button
              onClick={() => setType('polish')}
              className={`card flex items-center gap-3 p-4 transition-all ${
                type === 'polish'
                  ? 'border-[var(--amber)] bg-[var(--amber-light)]'
                  : 'hover:shadow-[var(--shadow-md)]'
              }`}
            >
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${type === 'polish' ? 'bg-[var(--amber)] text-white' : 'bg-[var(--surface-2)] text-[var(--text-tertiary)]'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6l-5 3.6 1.9-5.8L4 8.8h6.1z"/>
                </svg>
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${type === 'polish' ? 'text-[var(--amber)]' : 'text-[var(--text-primary)]'}`}>ขัดสี</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">เต็นท์รถ</p>
              </div>
            </button>
          </div>

          {/* License Plate */}
          <div className="card p-4">
            <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-3">ป้ายทะเบียน</p>
            <div className="relative">
              <input
                type="text"
                value={plate}
                onChange={e => setPlate(e.target.value.toUpperCase())}
                placeholder="กข 1234"
                className="input text-center text-4xl font-bold tracking-widest py-5 placeholder:font-normal placeholder:text-3xl"
              />
              <span className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-[var(--border)] pointer-events-none" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[var(--border)] pointer-events-none" />
            </div>
          </div>

          {/* Price */}
          <div className="card p-4">
            <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-3">ราคา (บาท)</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-[var(--text-tertiary)]">฿</span>
              <input
                type="text"
                inputMode="numeric"
                value={price}
                onChange={e => setPrice(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="input !pl-12 w-full text-3xl font-bold text-[var(--text-primary)] py-4"
              />
            </div>
          </div>

          {/* Car Brand */}
          <div className="card p-4">
            <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-3">ยี่ห้อรถ</p>
            <div
              ref={scrollRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              className="flex gap-2 overflow-x-auto pb-1 no-scrollbar cursor-grab active:cursor-grabbing"
            >
              {CAR_BRANDS.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBrand(b.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-[var(--radius-md)] border text-sm font-semibold transition-all ${
                    selectedBrand === b.id
                      ? 'bg-[var(--text-primary)] text-white border-transparent'
                      : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'
                  }`}
                >
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
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedType(t.id)}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-[var(--radius-md)] border text-sm font-semibold transition-all ${
                    selectedType === t.id
                      ? 'bg-[var(--text-primary)] text-white border-transparent'
                      : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  <span className="text-base leading-none">{t.icon}</span>
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Status */}
          <div className="card p-4">
            <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-3">สถานะการชำระ</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentStatus('paid')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-md)] border text-sm font-semibold transition-all ${
                  paymentStatus === 'paid'
                    ? 'bg-[var(--green-light,#dcfce7)] text-[var(--green)] border-[var(--green)]'
                    : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M12 3.5L5.5 10 2 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                ชำระแล้ว
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('unpaid')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-md)] border text-sm font-semibold transition-all ${
                  paymentStatus === 'unpaid'
                    ? 'bg-[var(--red-light)] text-[var(--red)] border-[var(--red)]'
                    : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                ค้างชำระ
              </button>
            </div>
          </div>

          {/* Optional fields */}
          {type === 'polish' && (
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--amber)] mb-2">ชื่อเต็นท์ / ลูกค้า</p>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="ระบุชื่อ..."
                className="input text-sm"
              />
            </div>
          )}

          <div className="card p-4">
            <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-2">หมายเหตุ</p>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="เช่น ล้างห้องเครื่อง..."
              className="input text-sm"
            />
          </div>
        </div>

      ) : (
        /* ── EXPENSE FORM ──────────────────────────────────────────── */
        <div className="space-y-3 fade-up delay-1">
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--red)] mb-3">จำนวนเงิน (บาท)</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-[var(--text-tertiary)]">฿</span>
              <input
                type="text"
                inputMode="numeric"
                value={expenseAmount}
                onChange={e => setExpenseAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="input !pl-12 w-full text-3xl font-bold text-[var(--red)] py-4"
              />
            </div>
          </div>

          <div className="card p-4">
            <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-2">จ่ายค่าอะไร</p>
            <input
              type="text"
              value={expenseTitle}
              onChange={e => setExpenseTitle(e.target.value)}
              placeholder="เช่น ค่าน้ำยา, ค่าไฟ..."
              className="input text-sm"
            />
          </div>

          <div className="card p-4">
            <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-widest mb-2">หมายเหตุ</p>
            <input
              type="text"
              value={expenseNote}
              onChange={e => setExpenseNote(e.target.value)}
              placeholder="..."
              className="input text-sm"
            />
          </div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────── */}
      {error && (
        <div className="fixed bottom-28 left-4 right-4 max-w-lg mx-auto p-3 rounded-[var(--radius-md)] bg-[var(--red)] text-white text-sm font-medium text-center fade-up">
          {error}
        </div>
      )}

      {/* ── Action Buttons ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 pt-2">
        {formMode === 'income' && (
          <button
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="card w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-[var(--text-primary)] hover:shadow-[var(--shadow-md)] active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {saving ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14m-7-7h14"/>
              </svg>
            )}
            บันทึก &amp; เพิ่มรายการต่อไป
          </button>
        )}

        <button
          onClick={() => handleSubmit(false)}
          disabled={saving}
          className={`card-dark w-full flex items-center justify-center gap-2 py-4 text-sm font-semibold text-white active:scale-[0.99] transition-all disabled:opacity-50 ${
            formMode === 'expense' ? '!bg-[var(--red)]' : ''
          }`}
        >
          {saving ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>
            </svg>
          )}
          บันทึก &amp; กลับหน้าแรก
        </button>
      </div>

    </div>
  )
}