'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Record, Expense, PaymentStatus, CAR_TYPES, CAR_BRANDS } from '@/types'

interface EditModalProps {
  item:     Record | Expense | null
  type:     'income' | 'expense'
  isOpen:   boolean
  onClose:  () => void
  onSave:   (updatedFields: Partial<Record & Expense>) => void
  onDelete: (id: string) => void
}

// แยก created_at → date string + time string
function splitDateTime(iso: string) {
  const d = new Date(iso)
  const date = d.toISOString().split('T')[0]
  const hours   = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return { date, time: `${hours}:${minutes}` }
}

// รวม date + time → ISO string
function mergeDateTime(date: string, time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export default function EditModal({ item, type, isOpen, onClose, onSave, onDelete }: EditModalProps) {
  // Income fields
  const [recordType, setRecordType]     = useState<'wash' | 'polish'>('wash') // ✅ เพิ่ม State เก็บประเภทบริการ
  const [plate, setPlate]               = useState('')
  const [price, setPrice]               = useState('')
  const [customerName, setCustomerName] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid')
  const [selectedType, setSelectedType] = useState('')  // CAR_TYPES name
  const [selectedBrand, setSelectedBrand] = useState('') // CAR_BRANDS name
  const [incomeNote, setIncomeNote]     = useState('')

  // Expense fields
  const [title, setTitle]   = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote]     = useState('')

  // Shared
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  
  // ✅ ดึง Email ของผู้ใช้งาน ณ ตอนนี้
  const [currentUserEmail, setCurrentUserEmail] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDown, setIsDown]         = useState(false)
  const [startX, setStartX]         = useState(0)
  const [scrollLeftVal, setScrollLeftVal] = useState(0)
  const handleMouseDown  = (e: React.MouseEvent) => { setIsDown(true); setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0)); setScrollLeftVal(scrollRef.current?.scrollLeft || 0) }
  const handleMouseLeave = () => setIsDown(false)
  const handleMouseUp    = () => setIsDown(false)
  const handleMouseMove  = (e: React.MouseEvent) => {
    if (!isDown) return; e.preventDefault()
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0)
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollLeftVal - (x - startX) * 2
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserEmail(data.user?.email ?? 'ไม่ทราบชื่อผู้ใช้งาน'))
  }, [])

  useEffect(() => {
    if (!item) return
    setConfirmDelete(false)

    const { date, time } = splitDateTime(item.created_at)
    setEditDate(date)
    setEditTime(time)

    if (type === 'income') {
      const r = item as Record
      setRecordType((r.type as 'wash' | 'polish') ?? 'wash') // ✅ เซ็ตค่าประเภทบริการเริ่มต้น
      setPlate(r.plate ?? '')
      setPrice(r.price?.toString() ?? '')
      setCustomerName(r.customer_name ?? '')
      setPaymentStatus(r.payment_status ?? 'paid')
      setSelectedType(r.services[0] ?? '')
      setSelectedBrand(r.services[1] ?? '')
      setIncomeNote(r.services[2] ?? '')
    } else {
      const e = item as Expense
      setTitle(e.title ?? '')
      setAmount(e.amount?.toString() ?? '')
      setNote(e.note ?? '')
    }
  }, [item, type, isOpen])

  if (!isOpen || !item) return null

  const handleSave = () => {
    const created_at = mergeDateTime(editDate, editTime)
    const now = new Date().toISOString()
    
    if (type === 'income') {
      onSave({
        type:           recordType, // ✅ บันทึกประเภทบริการที่ถูกแก้ไข
        plate:          plate.trim(),
        price:          parseInt(price) || 0,
        customer_name:  customerName.trim(),
        payment_status: paymentStatus,
        services:       [selectedType, selectedBrand, incomeNote.trim()],
        created_at,
        updated_by_email: currentUserEmail, 
        updated_at:       now,              
      })
    } else {
      onSave({ 
        title: title.trim(), 
        amount: parseInt(amount) || 0, 
        note: note.trim(), 
        created_at,
        updated_by_email: currentUserEmail, 
        updated_at:       now,              
      })
    }
  }

  const isIncome = type === 'income'
  const isPolish = isIncome && recordType === 'polish' // ✅ อัปเดตเงื่อนไขให้ใช้ State ใหม่

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm fade-in flex items-end justify-center sm:items-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-md rounded-t-[20px] sm:rounded-[20px] slide-up overflow-hidden max-h-[90dvh] flex flex-col">

        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              แก้ไข{isIncome ? 'รายรับ' : 'รายจ่าย'}
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              {isIncome ? (item as Record).plate : (item as Expense).title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">

          {/* ── วันที่ + เวลา (ทุก type) ── */}
          <div>
            <label className="label">วันที่และเวลา</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="input text-sm cursor-pointer"
              />
              <input
                type="time"
                value={editTime}
                onChange={e => setEditTime(e.target.value)}
                className="input text-sm cursor-pointer"
              />
            </div>
          </div>

          {isIncome ? (
            <>
              {/* ✅ เพิ่มปุ่มสลับประเภทบริการ ล้างรถ/ขัดสี */}
              <div>
                <label className="label">ประเภทบริการ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecordType('wash')}
                    className={`py-2.5 rounded-[var(--radius-md)] border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      recordType === 'wash'
                        ? 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--accent)]'
                        : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17a5 5 0 0 1 10 0"/><path d="M5 17H3a1 1 0 0 1-1-1V9l3-4h14l3 4v7a1 1 0 0 1-1 1h-2"/>
                      <circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
                    </svg>
                    ล้างรถ
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordType('polish')}
                    className={`py-2.5 rounded-[var(--radius-md)] border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      recordType === 'polish'
                        ? 'bg-[var(--amber-light)] text-[var(--amber)] border-[var(--amber)]'
                        : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6l-5 3.6 1.9-5.8L4 8.8h6.1z"/>
                    </svg>
                    ขัดสี
                  </button>
                </div>
              </div>

              {/* ทะเบียน */}
              <div>
                <label className="label">ป้ายทะเบียน</label>
                <input
                  type="text"
                  value={plate}
                  onChange={e => setPlate(e.target.value.toUpperCase())}
                  className="input text-center text-2xl font-bold tracking-widest"
                  placeholder="กข 1234"
                />
              </div>

              {/* ราคา + สถานะ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">ราคา (บาท)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--text-tertiary)]">฿</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={price}
                      onChange={e => setPrice(e.target.value.replace(/\D/g, ''))}
                      className="input font-bold w-full"
                      style={{ paddingLeft: '2rem' }}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">สถานะ</label>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentStatus('paid')}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-md)] border text-xs font-semibold transition-all ${
                        paymentStatus === 'paid'
                          ? 'bg-[var(--green-light)] text-[var(--green)] border-[var(--green)]'
                          : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      ชำระแล้ว
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentStatus('unpaid')}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-[var(--radius-md)] border text-xs font-semibold transition-all ${
                        paymentStatus === 'unpaid'
                          ? 'bg-[var(--red-light)] text-[var(--red)] border-[var(--red)]'
                          : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3"/><path d="M6 3.5v3l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                      ค้างชำระ
                    </button>
                  </div>
                </div>
              </div>

              {/* ยี่ห้อรถ */}
              <div>
                <label className="label">ยี่ห้อรถ</label>
                <div
                  ref={scrollRef}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  className="flex gap-2 overflow-x-auto pb-1 no-scrollbar cursor-grab active:cursor-grabbing"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedBrand('')}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-[var(--radius-md)] border text-xs font-semibold transition-all ${
                      selectedBrand === ''
                        ? 'bg-[var(--text-primary)] text-white border-transparent'
                        : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    ไม่ระบุ
                  </button>
                  {CAR_BRANDS.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBrand(b.name)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-[var(--radius-md)] border text-xs font-semibold transition-all ${
                        selectedBrand === b.name
                          ? 'bg-[var(--text-primary)] text-white border-transparent'
                          : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* ประเภทรถ */}
              <div>
                <label className="label">ประเภทรถ</label>
                <div className="grid grid-cols-3 gap-2">
                  {CAR_TYPES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedType(t.name)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)] border text-xs font-semibold transition-all ${
                        selectedType === t.name
                          ? 'bg-[var(--text-primary)] text-white border-transparent'
                          : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      <span className="text-sm leading-none">{t.icon}</span>
                      <span className="truncate">{t.name.split(' /')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ชื่อลูกค้า / เต็นท์ */}
              <div>
                <label className="label">ชื่อลูกค้า / เต็นท์ (ถ้ามี)</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="input"
                  placeholder="ระบุชื่อ..."
                />
              </div>

              {/* หมายเหตุ */}
              <div>
                <label className="label">หมายเหตุ</label>
                <input
                  type="text"
                  value={incomeNote}
                  onChange={e => setIncomeNote(e.target.value)}
                  className="input"
                  placeholder="เช่น ล้างห้องเครื่อง..."
                />
              </div>
            </>
          ) : (
            <>
              {/* รายการจ่าย */}
              <div>
                <label className="label">รายการจ่าย</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input"
                  placeholder="ระบุรายการ..."
                />
              </div>

              {/* จำนวนเงิน */}
              <div>
                <label className="label">จำนวนเงิน (บาท)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--text-tertiary)]">฿</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
                    className="input font-bold text-[var(--red)] w-full"
                    style={{ paddingLeft: '2rem' }}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* หมายเหตุ */}
              <div>
                <label className="label">หมายเหตุ</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="input"
                  placeholder="ระบุหมายเหตุ (ถ้ามี)..."
                />
              </div>
            </>
          )}

          {/* ✅ ส่วนแสดงบันทึกการกระทำ (Audit Trail) */}
          <div className="mt-4 p-3 bg-[var(--surface-2)] rounded-[var(--radius-md)] flex flex-col gap-3 border border-[var(--border)]">
            
            {/* แสดงคนสร้าง */}
            {(item as Record | Expense)?.created_by_email && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] border border-blue-200">➕</div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">เพิ่มเข้าระบบโดย</p>
                  <p className="text-xs font-bold text-[var(--text-primary)]">{(item as Record | Expense).created_by_email}</p>
                </div>
              </div>
            )}

            {/* แสดงคนแก้ไขล่าสุด */}
            {(item as Record | Expense)?.updated_by_email && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-[10px] border border-amber-200">✏️</div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">แก้ไขล่าสุดโดย</p>
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    {(item as Record | Expense).updated_by_email} <span className="font-normal text-[10px] text-slate-400">({new Date((item as Record | Expense).updated_at!).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })})</span>
                  </p>
                </div>
              </div>
            )}

            <div className="h-[1px] bg-[var(--border)] w-full my-1" />

            {/* บัญชีปัจจุบันที่กำลังลบ/แก้ไข */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm text-[10px] border border-[var(--border)]">👤</div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">บัญชีที่กำลังทำรายการ</p>
                <p className="text-xs font-bold text-[var(--text-primary)]">{currentUserEmail || 'กำลังตรวจสอบ...'}</p>
              </div>
            </div>

          </div>

        </div>

        {/* confirmDelete block */}
        {confirmDelete && (
          <div className="mx-5 mb-4 p-4 rounded-[var(--radius-md)] bg-[var(--red-light)] border border-red-100 shrink-0 border-t border-[var(--border)] pt-4 mt-1">
            <p className="text-sm font-semibold text-[var(--red)] mb-3">ยืนยันลบรายการนี้?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="btn btn-ghost flex-1 py-2.5 text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold text-white bg-[var(--red)] transition-all active:scale-[0.97]"
              >
                ลบรายการ
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!confirmDelete && (
          <div className="flex gap-2.5 px-5 pb-8 pt-3 shrink-0 border-t border-[var(--border)]">
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn btn-danger py-3 text-sm"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M2.5 4h10M5 4V2.5h5V4M6 7v4M9 7v4M3.5 4l.5 8.5h7L12 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              ลบ
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary flex-1 py-3 text-sm"
            >
              บันทึกการแก้ไข
            </button>
          </div>
        )}

      </div>
    </div>
  )
}