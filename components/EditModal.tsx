'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
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

function splitDateTime(iso: string) {
  const d = new Date(iso)
  const date = d.toISOString().split('T')[0]
  return { date, time: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
}
function mergeDateTime(date: string, time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(date); d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export default function EditModal({ item, type, isOpen, onClose, onSave, onDelete }: EditModalProps) {
  // Income
  const [recordType, setRecordType]       = useState<'wash' | 'polish'>('wash')
  const [plate, setPlate]                 = useState('')
  const [price, setPrice]                 = useState('')
  const [customerName, setCustomerName]   = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid')
  const [selectedType, setSelectedType]   = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [incomeNote, setIncomeNote]       = useState('')

  // Expense
  const [title, setTitle]   = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote]     = useState('')

  // Shared
  const [editDate, setEditDate]           = useState('')
  const [editTime, setEditTime]           = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState('')

  const modalRef = useRef<HTMLDivElement>(null)
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
    supabase.auth.getUser().then(({ data }) => setCurrentUserEmail(data.user?.email ?? 'ไม่ทราบ'))
  }, [])

  // Body scroll lock + Escape key
  useEffect(() => {
    if (!isOpen) return
    document.body.classList.add('modal-open')
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.body.classList.remove('modal-open')
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Populate fields
  useEffect(() => {
    if (!item) return
    setConfirmDelete(false)
    const { date, time } = splitDateTime(item.created_at)
    setEditDate(date); setEditTime(time)

    if (type === 'income') {
      const r = item as Record
      setRecordType((r.type as 'wash' | 'polish') ?? 'wash')
      setPlate(r.plate ?? ''); setPrice(r.price?.toString() ?? '')
      setCustomerName(r.customer_name ?? ''); setPaymentStatus(r.payment_status ?? 'paid')
      const sa = r.services || []
      setSelectedType(sa[0] ?? ''); setSelectedBrand(sa[1] ?? ''); setIncomeNote(sa[2] ?? '')
    } else {
      const e = item as Expense
      setTitle(e.title ?? ''); setAmount(e.amount?.toString() ?? ''); setNote(e.note ?? '')
    }
  }, [item, type, isOpen])

  const handleSave = useCallback(() => {
    const created_at = mergeDateTime(editDate, editTime)
    const now = new Date().toISOString()
    if (type === 'income') {
      onSave({ type: recordType, plate: plate.trim(), price: parseInt(price) || 0, customer_name: customerName.trim(), payment_status: paymentStatus, services: [selectedType, selectedBrand, incomeNote.trim()], created_at, updated_by_email: currentUserEmail, updated_at: now })
    } else {
      onSave({ title: title.trim(), amount: parseInt(amount) || 0, note: note.trim(), created_at, updated_by_email: currentUserEmail, updated_at: now })
    }
  }, [type, recordType, plate, price, customerName, paymentStatus, selectedType, selectedBrand, incomeNote, editDate, editTime, currentUserEmail, title, amount, note, onSave])

  if (!isOpen || !item) return null

  const isIncome = type === 'income'

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm fade-in flex items-end justify-center sm:items-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`แก้ไข${isIncome ? 'รายรับ' : 'รายจ่าย'}`}
    >
      <div ref={modalRef} className="bg-white w-full max-w-md rounded-t-[28px] sm:rounded-[28px] slide-up overflow-hidden max-h-[90dvh] flex flex-col">

        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0" aria-hidden="true">
          <div className="w-10 h-1.5 rounded-full bg-[var(--border)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <div>
            <h3 className="text-lg font-extrabold text-[var(--text-primary)]">แก้ไข{isIncome ? 'รายรับ' : 'รายจ่าย'}</h3>
            <p className="text-sm text-[var(--text-tertiary)] mt-0.5 font-medium">{isIncome ? (item as Record).plate : (item as Expense).title}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-secondary)] active:scale-90 transition-transform" aria-label="ปิด">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Date/Time */}
          <div>
            <label className="label">วันที่และเวลา</label>
            <div className="grid grid-cols-2 gap-2.5">
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="input text-sm cursor-pointer" aria-label="วันที่" />
              <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="input text-sm cursor-pointer" aria-label="เวลา" />
            </div>
          </div>

          {isIncome ? (
            <>
              {/* Service type */}
              <div>
                <label className="label">ประเภทบริการ</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button type="button" onClick={() => setRecordType('wash')} aria-pressed={recordType === 'wash'}
                    className={`py-3 rounded-[var(--radius-md)] border-2 text-[15px] font-bold transition-all duration-150 flex items-center justify-center gap-2 ${recordType === 'wash' ? 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--accent)]' : 'bg-white text-[var(--text-secondary)] border-[var(--border)]'}`}
                  >🚗 ล้างรถ</button>
                  <button type="button" onClick={() => setRecordType('polish')} aria-pressed={recordType === 'polish'}
                    className={`py-3 rounded-[var(--radius-md)] border-2 text-[15px] font-bold transition-all duration-150 flex items-center justify-center gap-2 ${recordType === 'polish' ? 'bg-[var(--amber-light)] text-[var(--amber)] border-[var(--amber)]' : 'bg-white text-[var(--text-secondary)] border-[var(--border)]'}`}
                  >✨ ขัดสี</button>
                </div>
              </div>

              {/* Plate */}
              <div>
                <label className="label">ป้ายทะเบียน</label>
                <input type="text" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} className="input text-center text-2xl font-extrabold tracking-widest" placeholder="กข 1234" aria-label="ป้ายทะเบียน" />
              </div>

              {/* Price + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">ราคา (บาท)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-[var(--text-tertiary)]" aria-hidden="true">฿</span>
                    <input type="text" inputMode="numeric" value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ''))} className="input font-extrabold w-full" style={{ paddingLeft: '2rem' }} placeholder="0" aria-label="ราคา" />
                  </div>
                </div>
                <div>
                  <label className="label">สถานะ</label>
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => setPaymentStatus('paid')} aria-pressed={paymentStatus === 'paid'}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-md)] border-2 text-sm font-bold transition-all duration-150 ${paymentStatus === 'paid' ? 'bg-[var(--green-light)] text-[var(--green)] border-[var(--green)]' : 'bg-white text-[var(--text-secondary)] border-[var(--border)]'}`}
                    >✅ ชำระแล้ว</button>
                    <button type="button" onClick={() => setPaymentStatus('unpaid')} aria-pressed={paymentStatus === 'unpaid'}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-md)] border-2 text-sm font-bold transition-all duration-150 ${paymentStatus === 'unpaid' ? 'bg-[var(--red-light)] text-[var(--red)] border-[var(--red)]' : 'bg-white text-[var(--text-secondary)] border-[var(--border)]'}`}
                    >⏳ ค้างชำระ</button>
                  </div>
                </div>
              </div>

              {/* Brand scroll */}
              <div>
                <label className="label">ยี่ห้อรถ</label>
                <div ref={scrollRef} onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} className="flex gap-2 overflow-x-auto pb-1 no-scrollbar cursor-grab active:cursor-grabbing">
                  <button type="button" onClick={() => setSelectedBrand('')} aria-pressed={selectedBrand === ''}
                    className={`flex-shrink-0 px-3.5 py-2 rounded-[var(--radius-md)] border-2 text-sm font-bold transition-all duration-150 ${selectedBrand === '' ? 'bg-[var(--text-primary)] text-white border-transparent' : 'bg-white text-[var(--text-secondary)] border-[var(--border)]'}`}
                  >ไม่ระบุ</button>
                  {CAR_BRANDS.map(b => (
                    <button key={b.id} type="button" onClick={() => setSelectedBrand(b.name)} aria-pressed={selectedBrand === b.name}
                      className={`flex-shrink-0 px-3.5 py-2 rounded-[var(--radius-md)] border-2 text-sm font-bold transition-all duration-150 ${selectedBrand === b.name ? 'bg-[var(--text-primary)] text-white border-transparent' : 'bg-white text-[var(--text-secondary)] border-[var(--border)]'}`}
                    >{b.name}</button>
                  ))}
                </div>
              </div>

              {/* Car type */}
              <div>
                <label className="label">ประเภทรถ</label>
                <div className="grid grid-cols-3 gap-2">
                  {CAR_TYPES.map(t => (
                    <button key={t.id} type="button" onClick={() => setSelectedType(t.name)} aria-pressed={selectedType === t.name}
                      className={`flex items-center gap-2 px-3 py-3 rounded-[var(--radius-md)] border-2 text-sm font-bold transition-all duration-150 ${selectedType === t.name ? 'bg-[var(--text-primary)] text-white border-transparent' : 'bg-white text-[var(--text-secondary)] border-[var(--border)]'}`}
                    >
                      <span className="text-base leading-none" aria-hidden="true">{t.icon}</span>
                      <span className="truncate">{t.name.split(' /')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div><label className="label">ชื่อลูกค้า / เต็นท์ (ถ้ามี)</label><input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="input" placeholder="ระบุชื่อ..." aria-label="ชื่อลูกค้า" /></div>
              <div><label className="label">หมายเหตุ</label><input type="text" value={incomeNote} onChange={e => setIncomeNote(e.target.value)} className="input" placeholder="เช่น ล้างห้องเครื่อง..." aria-label="หมายเหตุ" /></div>
            </>
          ) : (
            <>
              <div><label className="label">รายการจ่าย</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="ระบุรายการ..." aria-label="รายการจ่าย" /></div>
              <div>
                <label className="label">จำนวนเงิน (บาท)</label>
                <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-[var(--text-tertiary)]" aria-hidden="true">฿</span><input type="text" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} className="input font-extrabold text-[var(--red)] w-full" style={{ paddingLeft: '2rem' }} placeholder="0" aria-label="จำนวนเงิน" /></div>
              </div>
              <div><label className="label">หมายเหตุ</label><input type="text" value={note} onChange={e => setNote(e.target.value)} className="input" placeholder="ระบุหมายเหตุ (ถ้ามี)..." aria-label="หมายเหตุ" /></div>
            </>
          )}

          {/* Audit Trail */}
          <div className="mt-5 p-4 bg-[var(--surface-2)] rounded-[var(--radius-lg)] flex flex-col gap-3.5 border border-[var(--border)]">
            {item.created_by_email && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-[11px] border border-blue-200" aria-hidden="true">➕</div>
                <div><p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">เพิ่มโดย</p><p className="text-sm font-bold text-[var(--text-primary)]">{item.created_by_email}</p></div>
              </div>
            )}
            {item.updated_by_email && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-[11px] border border-amber-200" aria-hidden="true">✏️</div>
                <div><p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">แก้ไขล่าสุดโดย</p><p className="text-sm font-bold text-[var(--text-primary)]">{item.updated_by_email} {item.updated_at && <span className="font-normal text-[11px] text-[var(--text-tertiary)]">({new Date(item.updated_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })})</span>}</p></div>
              </div>
            )}
            <div className="h-[1px] bg-[var(--border)] w-full my-1" aria-hidden="true" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm text-[11px] border border-[var(--border)]" aria-hidden="true">👤</div>
              <div><p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">บัญชีปัจจุบัน</p><p className="text-sm font-bold text-[var(--text-primary)]">{currentUserEmail || '...'}</p></div>
            </div>
          </div>
        </div>

        {/* Delete confirm */}
        {confirmDelete && (
          <div className="mx-6 mb-4 p-5 rounded-[var(--radius-lg)] bg-[var(--red-light)] border-2 border-red-200 shrink-0">
            <p className="text-base font-bold text-[var(--red)] mb-3">ยืนยันลบรายการนี้?</p>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmDelete(false)} className="btn btn-ghost flex-1 py-3 text-[15px]">ยกเลิก</button>
              <button onClick={() => onDelete(item.id)} className="flex-1 py-3 rounded-[var(--radius-md)] text-[15px] font-bold text-white bg-[var(--red)] active:scale-[0.97] transition-transform">ลบรายการ</button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!confirmDelete && (
          <div className="flex gap-3 px-6 pb-8 pt-4 shrink-0 border-t border-[var(--border)]">
            <button onClick={() => setConfirmDelete(true)} className="btn btn-danger py-3.5 text-[15px]" aria-label="ลบรายการ">🗑️ ลบ</button>
            <button onClick={handleSave} className="btn btn-primary flex-1 py-3.5 text-[15px]">บันทึกการแก้ไข</button>
          </div>
        )}
      </div>
    </div>
  )
}