'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RecordType, CAR_TYPES, CAR_BRANDS, PaymentStatus } from '@/types'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

import { useAuthUser, useRecentCustomers, useCustomerVisitCount } from '@/hooks/useAddRecord'
import { FormMode } from '@/components/add/Shared'
import { ModeToggle } from '@/components/add/ModeToggle'
import { DatePicker } from '@/components/add/DatePicker'
import { IncomeForm } from '@/components/add/IncomeForm'
import { ExpenseForm } from '@/components/add/ExpenseForm'
import { ActionButtons } from '@/components/add/ActionButtons'
import { SuccessBanner } from '@/components/add/Banners'
import { ErrorBanner } from '@/components/ui/ErrorBanner'

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
      console.error('[AddRecord] Submit Error:', e)
      const message = e instanceof Error ? e.message : 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'
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

        {error && <ErrorBanner error={error} variant="inline" />}

        {/* ── Save Buttons (at the bottom of the form) ── */}
        <div className="pt-2 pb-6">
          <ActionButtons mode={formMode} saving={saving} onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  )
}