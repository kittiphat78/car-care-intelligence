import { memo } from 'react'

export const UnpaidAlert = memo(function UnpaidAlert({ totalAmount, onClick }: { totalAmount: number; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className="bg-gradient-to-r from-[var(--red)] to-[#B91C1C] p-5 rounded-[var(--radius-xl)] flex items-center justify-between shadow-lg shadow-red-200/50 cursor-pointer active:scale-[0.98] transition-transform duration-150 fade-up delay-1"
      aria-label={`ยอดค้างชำระ ${totalAmount.toLocaleString()} บาท กดเพื่อดูรายละเอียด`}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl" aria-hidden="true">📒</div>
        <div>
          <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider">ยอดค้างชำระสะสม</p>
          <p className="text-white text-2xl font-extrabold leading-tight">฿{totalAmount.toLocaleString()}</p>
        </div>
      </div>
      <div className="bg-white/20 px-4 py-2 rounded-xl text-white text-sm font-bold border border-white/30">ดูรายละเอียด</div>
    </div>
  )
})
