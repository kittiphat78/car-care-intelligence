'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RecordType, CAR_TYPES, CAR_BRANDS, PaymentStatus } from '@/types'

type FormMode = 'income' | 'expense'

export default function AddPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [formMode, setFormMode] = useState<FormMode>('income')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  // Income States
  const [type, setType] = useState<RecordType>('wash')
  const [plate, setPlate] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [customerName, setCustomerName] = useState('') // ✅ สำหรับงานเต็นท์
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid') // ✅ จ่ายแล้ว/ค้าง
  const [note, setNote] = useState('')
  const [price, setPrice] = useState('')
  
  // Expense States
  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function handleSubmit() {
    setSaving(true)
    
    const now = new Date()
    const selectedDate = new Date(date)
    selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
    const timestamp = selectedDate.toISOString()

    if (formMode === 'income') {
      if (!plate.trim()) { alert('⚠️ กรุณากรอกป้ายทะเบียน'); setSaving(false); return }
      if (!selectedType) { alert('⚠️ กรุณาเลือกประเภทรถ'); setSaving(false); return }
      if (!price || parseInt(price) <= 0) { alert('⚠️ กรุณากรอกราคา'); setSaving(false); return }

      // คำนวณเลขคิวตามวันที่เลือก
      const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999)

      const { count } = await supabase
        .from('records')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString())

      const typeName = CAR_TYPES.find(t => t.id === selectedType)?.name || ''
      const brandName = CAR_BRANDS.find(b => b.id === selectedBrand)?.name || 'ไม่ระบุยี่ห้อ'
      const serviceNames = [typeName, brandName, note].filter(Boolean)

      const { error } = await supabase.from('records').insert({
        type,
        plate: plate.toUpperCase().trim(),
        services: serviceNames,
        price: parseInt(price),
        seq_number: (count ?? 0) + 1,
        created_at: timestamp,
        created_by: user?.id,
        payment_method: 'cash',
        customer_name: type === 'polish' ? customerName : '', // ✅ บันทึกชื่อเต็นท์
        payment_status: paymentStatus, // ✅ บันทึกว่าจ่ายหรือค้าง
        job_status: 'done'
      })

      if (error) { alert('❌ Error: ' + error.message); setSaving(false) } 
      else { router.push('/'); router.refresh() }

    } else {
      // บันทึกรายจ่าย (Expense)
      if (!expenseTitle.trim()) { alert('⚠️ กรุณาระบุรายการจ่าย'); setSaving(false); return }
      if (!expenseAmount || parseInt(expenseAmount) <= 0) { alert('⚠️ กรุณากรอกจำนวนเงิน'); setSaving(false); return }

      const { error } = await supabase.from('expenses').insert({
        title: expenseTitle.trim(),
        amount: parseInt(expenseAmount),
        created_at: timestamp,
        created_by: user?.id,
        note: note
      })

      if (error) { alert('❌ Error: ' + error.message); setSaving(false) } 
      else { router.push('/'); router.refresh() }
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F2F8] pb-64 font-sarabun text-slate-900">
      
      {/* Header */}
      <div className="px-6 pt-12 pb-6 text-center">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400 mb-2">บันทึกข้อมูล</p>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {formMode === 'income' ? 'ลงรายการรถ 🚗' : 'ลงรายจ่ายร้าน 💸'}
        </h1>
      </div>

      <div className="px-5 space-y-6 max-w-2xl mx-auto">
        
        {/* --- 1. Mode Switcher --- */}
        <div className="flex p-1.5 bg-white border-2 border-slate-200 rounded-[22px] shadow-sm">
          <button onClick={() => setFormMode('income')} className={`flex-1 py-4 rounded-[18px] text-sm font-black transition-all ${formMode === 'income' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>บวกรายรับ 💰</button>
          <button onClick={() => setFormMode('expense')} className={`flex-1 py-4 rounded-[18px] text-sm font-black transition-all ${formMode === 'expense' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400'}`}>หักรายจ่าย 💸</button>
        </div>

        {/* --- 2. Date Picker --- */}
        <div className="bg-white p-4 rounded-[22px] border border-slate-200 shadow-sm">
          <label className="px-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 block mb-2">เลือกวันที่บันทึก (ลงย้อนหลังได้)</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full text-xl font-black text-slate-900 outline-none bg-slate-50 p-3 rounded-xl border border-slate-100" />
        </div>

        {formMode === 'income' ? (
          <>
            <div className="flex p-1.5 bg-slate-200/50 rounded-[22px] gap-1.5">
              <button onClick={() => setType('wash')} className={`flex-1 py-3 rounded-[18px] text-xs font-black transition-all ${type === 'wash' ? 'bg-white text-slate-900' : 'text-slate-500'}`}>🧼 ล้างรถทั่วไป</button>
              <button onClick={() => setType('polish')} className={`flex-1 py-3 rounded-[18px] text-xs font-black transition-all ${type === 'polish' ? 'bg-amber-400 text-white' : 'text-slate-500'}`}>✨ งานขัดสี / งานเต็นท์</button>
            </div>

            {/* ✅ ส่วนที่เพิ่มเข้ามา: ชื่อลูกค้า/เต็นท์ (เฉพาะโหมดขัดสี) */}
            {type === 'polish' && (
              <div className="space-y-3 animate-in fade-in zoom-in duration-300">
                <label className="px-1 text-[10px] font-extrabold text-amber-600 block uppercase tracking-wider">ชื่อลูกค้า / ชื่อเต็นท์รถ</label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="เช่น เต็นท์เฮียเก่ง" className="w-full bg-white rounded-[22px] px-6 py-4 text-xl font-bold text-slate-900 outline-none border-2 border-amber-200 focus:border-amber-500 transition-all shadow-sm" />
              </div>
            )}

            <div className="space-y-3">
              <label className="px-1 text-[10px] font-extrabold text-slate-400 block uppercase">เลขทะเบียนรถ</label>
              <input type="text" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="กข 1234" className="w-full bg-white rounded-[22px] px-6 py-6 text-4xl font-black text-slate-900 outline-none text-center border-2 border-slate-200 focus:border-slate-900 transition-all shadow-sm" />
            </div>

            <div className="space-y-3">
              <label className="px-1 text-[10px] font-extrabold text-slate-400 block uppercase">ประเภทรถ</label>
              <div className="grid grid-cols-2 gap-2">
                {CAR_TYPES.map(t => (
                  <button key={t.id} onClick={() => setSelectedType(t.id)} className={`flex items-center gap-2 p-4 rounded-2xl border-2 transition-all ${selectedType === t.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500'}`}>
                    <span className="text-xl">{t.icon}</span>
                    <span className="font-bold text-sm">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ✅ ส่วนที่เพิ่มเข้ามา: สถานะการเงิน (จ่ายแล้ว/ค้างชำระ) */}
            <div className="space-y-3">
              <label className="px-1 text-[10px] font-extrabold text-slate-400 block uppercase">สถานะการชำระเงิน</label>
              <div className="flex gap-2">
                <button onClick={() => setPaymentStatus('paid')} className={`flex-1 py-4 rounded-2xl font-black text-sm border-2 transition-all ${paymentStatus === 'paid' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>จ่ายสด / โอนแล้ว ✅</button>
                <button onClick={() => setPaymentStatus('unpaid')} className={`flex-1 py-4 rounded-2xl font-black text-sm border-2 transition-all ${paymentStatus === 'unpaid' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>ค้างชำระ (ลงบัญชี) ⏳</button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="px-1 text-[10px] font-extrabold text-slate-400 block uppercase">จ่ายค่าอะไร?</label>
              <input type="text" value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} placeholder="เช่น ค่าน้ำยา, ค่าไฟ" className="w-full bg-white rounded-[22px] px-6 py-5 text-xl font-bold text-slate-900 outline-none border-2 border-rose-100 focus:border-rose-500 transition-all shadow-sm" />
            </div>
            <div className="space-y-3">
              <label className="px-1 text-[10px] font-extrabold text-slate-400 block uppercase">จำนวนเงิน (บาท)</label>
              <input type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="0" className="w-full bg-rose-50 rounded-[22px] px-6 py-8 text-5xl font-black text-rose-600 outline-none text-center border-2 border-rose-200" />
            </div>
          </div>
        )}

        <div className="space-y-3">
           <label className="px-1 text-[10px] font-extrabold text-slate-400 block uppercase">{formMode === 'income' ? 'ราคา (บาท)' : 'หมายเหตุเพิ่มเติม'}</label>
           {formMode === 'income' ? (
             <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className="w-full bg-blue-50 rounded-[22px] px-6 py-8 text-5xl font-black text-blue-700 outline-none text-center border-2 border-blue-200" />
           ) : (
             <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="..." className="w-full bg-white rounded-[22px] px-6 py-5 text-lg font-bold text-slate-900 outline-none border-2 border-slate-200" />
           )}
        </div>

        <button onClick={handleSubmit} disabled={saving} className={`w-full py-6 rounded-[26px] text-xl font-black text-white transition-all shadow-xl active:scale-95 ${saving ? 'bg-slate-300' : formMode === 'income' ? 'bg-slate-900 shadow-slate-200' : 'bg-rose-600 shadow-rose-200'}`}>{saving ? 'กำลังบันทึก...' : 'ตกลง บันทึกรายการ ✅'}</button>
      </div>
    </div>
  )
}