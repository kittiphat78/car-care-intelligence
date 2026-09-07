import { memo, useEffect, useCallback, useState } from 'react'
import { Record as AppRecord } from '@/types'
import { generateCashBill } from '@/lib/generateBill'
import { useToast } from '@/hooks/useToast'
import { CloseIcon, ClockIcon, BillIcon, CheckMarkIcon } from '@/components/icons/DashboardIcons'

interface UnpaidGroup { customerName: string; items: AppRecord[]; total: number }

/** คำนวณจำนวนวันค้างชำระจาก created_at ถึงวันนี้ */
function getOverdueDays(createdAt: string): number {
  const created = new Date(createdAt)
  created.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)))
}

/** จัดรูปแบบวันที่เป็นภาษาไทย */
function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

/** เลือกสีตาม severity ของจำนวนวันค้าง — theme-aware */
function getOverdueBadgeStyle(days: number): { bg: string; text: string; border: string } {
  if (days >= 14) return { bg: 'var(--red-light)', text: 'var(--red)', border: 'rgba(239,68,68,0.2)' }
  if (days >= 7) return { bg: 'var(--orange-light)', text: 'var(--orange)', border: 'rgba(249,115,22,0.2)' }
  if (days >= 3) return { bg: 'var(--amber-light)', text: 'var(--amber)', border: 'rgba(245,158,11,0.2)' }
  return { bg: 'var(--amber-light)', text: 'var(--amber)', border: 'rgba(245,158,11,0.15)' }
}

export const UnpaidModal = memo(function UnpaidModal({ unpaidData, totalAmount, onClose, onMarkPaid }: {
  unpaidData: UnpaidGroup[]; totalAmount: number; onClose: () => void; onMarkPaid: (name: string) => void
}) {
  const { error: toastError } = useToast()
  
  // ✅ ใช้ useEffect แทนการเรียก side effect ตรงใน render body
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => { document.body.classList.remove('modal-open') }
  }, [])

  const handleClose = useCallback(() => {
    document.body.classList.remove('modal-open')
    onClose()
  }, [onClose])
  const totalCars = unpaidData.reduce((a, c) => a + c.items.length, 0)

  // Bill generation
  const [generatingBillFor, setGeneratingBillFor] = useState<string | null>(null)
  const handleGenerateBill = useCallback(async (customerName: string, items: AppRecord[]) => {
    setGeneratingBillFor(customerName)
    try {
      await generateCashBill(items, customerName)
    } catch (e) {
      console.error(e)
      toastError('ไม่สามารถสร้างบิลได้')
    } finally {
      setGeneratingBillFor(null)
    }
  }, [toastError])

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md fade-in flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      onKeyDown={(e) => e.key === 'Escape' && handleClose()}
      role="dialog"
      aria-modal="true"
      aria-label="ค้างชำระ"
    >
      <div className="bg-[var(--bg)] w-full max-w-lg rounded-t-[32px] sm:rounded-[28px] slide-up overflow-hidden max-h-[90dvh] flex flex-col shadow-2xl">

        {/* ── Header: Gradient ── */}
        <header className="relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-rose-600 to-red-700" />

          <button onClick={handleClose} className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white/90 active:scale-90 transition-all hover:bg-white/25 z-20" aria-label="ปิด">
            <CloseIcon />
          </button>

          <div className="relative z-10 px-6 pt-7 pb-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-2xl">📒</span>
              <h2 className="text-xl font-extrabold text-white tracking-tight">ค้างชำระ</h2>
            </div>
            <p className="text-5xl font-black text-white tracking-tight">฿{totalAmount.toLocaleString()}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className="bg-white/20 backdrop-blur-sm text-white text-[13px] font-bold px-3 py-1.5 rounded-full">
                {unpaidData.length} ลูกค้า
              </span>
              <span className="bg-white/20 backdrop-blur-sm text-white text-[13px] font-bold px-3 py-1.5 rounded-full">
                {totalCars} คัน
              </span>
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <div className="overflow-y-auto flex-1 p-3.5 sm:p-5 space-y-4">
          {unpaidData.map(({ customerName, items, total }) => {
            const maxOverdueDays = Math.max(...items.map(i => getOverdueDays(i.created_at)))
            const maxStyle = getOverdueBadgeStyle(maxOverdueDays)
            const urgencyEmoji = maxOverdueDays >= 14 ? '🔴' : maxOverdueDays >= 7 ? '🟠' : maxOverdueDays >= 3 ? '🟡' : '⚪'

            return (
              <article key={customerName} className="card p-0 overflow-hidden border border-[var(--border)] shadow-sm">
                {/* Customer Header */}
                <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0" style={{ background: 'var(--red-light)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        {urgencyEmoji}
                      </div>
                      <div>
                        <h3 className="text-[17px] font-extrabold text-[var(--text-primary)] leading-tight">{customerName}</h3>
                        <p className="text-[13px] font-semibold text-[var(--text-tertiary)] mt-0.5">ค้างชำระ {items.length} คัน</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-[var(--red)]">฿{total.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Overdue Badge */}
                  <div className="flex items-center gap-2 mt-3 px-3.5 py-2 rounded-xl" style={{ background: maxStyle.bg, border: `1px solid ${maxStyle.border}` }}>
                    <ClockIcon />
                    <span className="text-[13px] font-bold" style={{ color: maxStyle.text }}>
                      ค้างนานสุด {maxOverdueDays} วัน
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="mx-3 mb-3 sm:mx-5 sm:mb-4 bg-[var(--surface-2)] rounded-2xl overflow-hidden">
                  {items.map((item, idx) => {
                    const days = getOverdueDays(item.created_at)
                    const style = getOverdueBadgeStyle(days)
                    return (
                      <div key={item.id} className={`flex items-center justify-between px-3.5 py-3 sm:px-4 py-3.5 ${idx > 0 ? 'border-t border-[var(--border)]' : ''}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[12px] font-bold text-[var(--text-tertiary)] shrink-0 shadow-sm border border-[var(--border)]" style={{ background: 'var(--surface)' }}>
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-[15px] text-[var(--text-primary)] truncate">{item.plate}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[12px] text-[var(--text-tertiary)] font-medium">
                                {formatThaiDate(item.created_at)}
                              </span>
                              <span className="text-[var(--text-tertiary)]">·</span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
                                {days} วัน
                              </span>
                            </div>
                            {item.services?.[2] && item.services[2].trim() !== '' && item.services[2] !== '-' && (
                              <p className="text-[12px] text-[var(--text-tertiary)] mt-1 truncate">📝 {item.services[2]}</p>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-[15px] text-[var(--text-primary)] shrink-0 ml-3">฿{item.price.toLocaleString()}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Action Buttons */}
                <div className="px-5 pb-5 space-y-2.5">
                  <button
                    onClick={() => handleGenerateBill(customerName, items)}
                    disabled={generatingBillFor === customerName}
                    className="w-full py-3 rounded-2xl bg-[var(--accent)] text-white font-bold text-[15px] active:scale-[0.97] transition-all hover:bg-[var(--accent-hover)] shadow-sm flex justify-center items-center gap-2 disabled:opacity-50"
                    aria-label={`สร้างบิล ${customerName}`}
                  >
                    {generatingBillFor === customerName ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> กำลังสร้าง...</>
                    ) : (
                      <><BillIcon /> สร้างบิล</>
                    )}
                  </button>
                  <button
                    onClick={() => onMarkPaid(customerName)}
                    className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-bold text-[15px] active:scale-[0.97] transition-all hover:bg-emerald-600 shadow-sm flex justify-center items-center gap-2"
                    aria-label={`เคลียร์ยอดชำระ ${customerName}`}
                  >
                    <CheckMarkIcon /> เคลียร์ยอดชำระแล้ว
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
})
