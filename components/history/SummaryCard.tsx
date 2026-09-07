import { memo, useState } from 'react'
import { TabType, MONTH_OPTIONS } from './constants'

interface SummaryCardProps {
  activeTab: TabType
  selectedMonth: number
  summary: {
    totalIncome: number
    totalExpense: number
    totalWashCount: number
    totalPolishCount: number
    totalWashRevenue: number
    totalPolishRevenue: number
  }
  onExport: () => void
}

export const SummaryCard = memo(function SummaryCard({ activeTab, selectedMonth, summary, onExport }: SummaryCardProps) {
  const [showRevenue, setShowRevenue] = useState(false)

  return (
    <section className="card-dark p-5 fade-up delay-1" aria-label="สรุปยอดรวม">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[13px] text-white/50 mb-1.5 font-medium">
            {selectedMonth === 0 ? 'ยอดรวมทั้งปี' : `ยอดรวมเดือน${MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label}`}
          </p>
          <p className="text-3xl font-extrabold text-white" aria-live="polite">
            ฿{(activeTab === 'income' ? summary.totalIncome : summary.totalExpense).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`flex items-center gap-2.5 bg-white/10 border border-white/10 rounded-[var(--radius-md)] px-3.5 py-2.5 cursor-pointer hover:bg-white/15 transition-colors ${activeTab !== 'income' ? 'opacity-0 pointer-events-none' : ''}`}
            onClick={() => setShowRevenue(!showRevenue)}
            role="button"
            aria-label="สลับการแสดงผลจำนวนคันและรายได้"
          >
            <div className="text-center">
              <p className="text-[11px] text-white/50 leading-none mb-1">ล้างรถ</p>
              <p className="text-base font-extrabold text-white leading-none">
                {showRevenue ? `฿${(summary.totalWashRevenue || 0).toLocaleString()}` : summary.totalWashCount}
              </p>
            </div>
            <div className="w-px h-8 bg-white/15" aria-hidden="true" />
            <div className="text-center">
              <p className="text-[11px] text-white/50 leading-none mb-1">ขัดสี</p>
              <p className="text-base font-extrabold text-white leading-none">
                {showRevenue ? `฿${(summary.totalPolishRevenue || 0).toLocaleString()}` : summary.totalPolishCount}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'income' && (
              <button onClick={onExport} className="flex items-center gap-2 text-sm font-bold text-white/70 bg-white/10 border border-white/10 px-3.5 py-3 rounded-[var(--radius-md)] active:scale-95 transition-transform" aria-label="ดาวน์โหลด Excel">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h2" /><path d="M8 17h2" /><path d="M14 13h2" /><path d="M14 17h2" /></svg>
                Excel
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
})
