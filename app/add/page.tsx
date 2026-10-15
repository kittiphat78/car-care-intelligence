'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { countIncomeOn, createExpense, createIncome } from '@/features/records/api'
import { toAppError, toUserMessage } from '@/lib/errors'
import { reportAppError } from '@/lib/observability'
import { RecordType, CAR_TYPES, CAR_BRANDS, PaymentStatus } from '@/types'
import { expenseSchema, newIncomeSchema, validate } from '@/features/records/schema'

import { useAuthUser, useRecentCustomers, useCustomerVisitCount } from '@/hooks/useAddRecord'
import { FormMode } from '@/components/add/Shared'
import { ModeToggle } from '@/components/add/ModeToggle'
import { DatePicker } from '@/components/add/DatePicker'
import { IncomeForm } from '@/components/add/IncomeForm'
import { ExpenseForm } from '@/components/add/ExpenseForm'
import { ActionButtons } from '@/components/add/ActionButtons'
import { SuccessBanner } from '@/components/add/Banners'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { bangkokTimestampOn, bangkokToday } from '@/lib/time/bangkok'

// วันและเวลาเป็นเวลาไทยเสมอ ไม่ขึ้นกับ timezone ของเครื่อง (ADR-06)
const getTodayStr = () => bangkokToday()
const generateTimestamp = (dateStr: string) => bangkokTimestampOn(dateStr)

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

  // เลขประจำการบันทึก 1 ครั้ง: กดซ้ำหรือลองใหม่ด้วยข้อมูลเดิมใช้เลขเดิม ฐานข้อมูลจึงไม่สร้างรายการซ้ำ (M004)
  const pendingSave = useRef<{ key: string; id: string } | null>(null)
  const requestIdFor = (key: string) => {
    if (pendingSave.current?.key !== key) pendingSave.current = { key, id: crypto.randomUUID() }
    return pendingSave.current.id
  }

  const resetIncomeForm = useCallback(() => {
    setPlate(''); setPrice(''); setNote(''); setCustomerName('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  const resetExpenseForm = useCallback(() => {
    setExpenseTitle(''); setExpenseAmount(''); setExpenseNote('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const submitIncome = useCallback(async (isBulk: boolean) => {
    const checked = validate(newIncomeSchema, { type, plate, price, customerName, note, paymentStatus, carType: selectedType })
    if (!checked.ok) return setError(checked.message)

    // บันทึกตามที่พิมพ์ (ตัด space หัวท้าย) ไม่แปลง < เป็น &lt; อีกต่อไป (ADR-10)
    const safePlate = checked.data.plate.toUpperCase()
    const safeCustomerName = checked.data.customerName
    const safeNote = checked.data.note
    const safePrice = checked.data.price

    const timestamp = generateTimestamp(date)
    // นับไม่สำเร็จ = เริ่มลำดับที่ 1 เหมือนเดิม (ลำดับซ้ำแก้ถาวรใน B6)
    const countResult = await countIncomeOn(date)
    const count = countResult.ok ? countResult.data : 0

    const typeName = CAR_TYPES.find(t => t.id === selectedType)?.name || ''
    const brandName = CAR_BRANDS.find(b => b.id === selectedBrand)?.name || ''
    const services = [typeName, brandName, safeNote]

    const client_request_id = requestIdFor(JSON.stringify(['income', date, type, safePlate, services, safePrice, safeCustomerName, paymentStatus]))
    const result = await createIncome({
      type, plate: safePlate, services, price: safePrice, client_request_id,
      seq_number: count + 1, created_at: timestamp, created_by: userId,
      created_by_email: userEmail, payment_method: 'cash', customer_name: safeCustomerName,
      payment_status: paymentStatus, job_status: 'done',
    })
    if (!result.ok) throw result.error
    pendingSave.current = null
    if (safeCustomerName) addCustomer(safeCustomerName)
    if (isBulk) {
      setSuccessMsg(`บันทึก ${safePlate} สำเร็จ`)
      resetIncomeForm(); setTimeout(() => setSuccessMsg(''), 4000)
    } else { router.push('/'); router.refresh() }
  }, [plate, selectedType, price, customerName, note, date, type, selectedBrand, paymentStatus, userId, userEmail, addCustomer, resetIncomeForm, router])

  const submitExpense = useCallback(async (isBulk: boolean) => {
    const checked = validate(expenseSchema, { title: expenseTitle, amount: expenseAmount, note: expenseNote })
    if (!checked.ok) return setError(checked.message)

    const safeTitle = checked.data.title
    const safeNote = checked.data.note
    const safeAmount = checked.data.amount
    const client_request_id = requestIdFor(JSON.stringify(['expense', date, safeTitle, safeAmount, safeNote]))

    const result = await createExpense({
      title: safeTitle, amount: safeAmount, client_request_id,
      created_at: generateTimestamp(date), created_by: userId, created_by_email: userEmail,
      note: safeNote,
    })
    if (!result.ok) throw result.error
    pendingSave.current = null
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
      console.error('[AddRecord] Submit Error:', e)
      const appErr = toAppError(e)
      reportAppError(appErr)
      setError('บันทึกไม่สำเร็จ: ' + toUserMessage(appErr))
    } finally { setSaving(false) }
  }, [formMode, submitIncome, submitExpense])

  return (
    <div className="min-h-dvh bg-[var(--bg)] content-with-nav">

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

        {error && <ErrorBanner error={error} variant="inline" />}

        {/* ── Save Buttons (at the bottom of the form) ── */}
        <div className="pt-2 pb-6">
          <ActionButtons mode={formMode} saving={saving} onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  )
}