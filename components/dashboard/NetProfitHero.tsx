import { memo } from 'react'
import { DashboardStats } from '@/hooks/useDashboard'

export const NetProfitHero = memo(function NetProfitHero({ stats }: { stats: DashboardStats }) {
  const profitColor = stats.netProfit >= 0 ? 'text-white' : 'text-red-300'

  return (
    <section className="card-gradient p-6 fade-up delay-2" aria-label="กำไรสุทธิวันนี้">
      <p className="text-[13px] font-semibold text-white/50 uppercase tracking-widest mb-3">กำไรสุทธิวันนี้</p>
      <div className="flex items-end justify-between">
        <div>
          <p className={`text-[3rem] font-extrabold tracking-tight leading-none stat-value ${profitColor}`} aria-live="polite">
            ฿{stats.netProfit.toLocaleString()}
          </p>
          <div className="flex items-center gap-2.5 mt-3">
            <span className={`inline-flex items-center gap-1.5 text-[13px] font-bold px-3 py-1.5 rounded-full transition-colors ${
              stats.isUp
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform ${stats.isUp ? '' : 'rotate-180'}`} aria-hidden="true">
                <path d="M6 2L10 7H2L6 2Z" fill="currentColor" />
              </svg>
              {Math.abs(stats.diffPct)}%
            </span>
            <span className="text-[13px] text-white/40 font-medium">vs เมื่อวาน</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[13px] text-white/40 mb-1 font-medium">รายรับรวม</p>
          <p className="text-xl font-bold text-white stat-value">฿{stats.todayTotalIncome.toLocaleString()}</p>
        </div>
      </div>
    </section>
  )
})
