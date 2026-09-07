import { memo } from 'react'
import { DashboardStats } from '@/hooks/useDashboard'

export const NetProfitHero = memo(function NetProfitHero({ stats }: { stats: DashboardStats }) {
  return (
    <section className="card-dark p-6 fade-up delay-2" aria-label="กำไรสุทธิวันนี้">
      <p className="text-[13px] font-semibold text-white/50 uppercase tracking-widest mb-3">กำไรสุทธิวันนี้</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[3rem] font-extrabold tracking-tight leading-none text-white" aria-live="polite">฿{stats.netProfit.toLocaleString()}</p>
          <div className="flex items-center gap-2.5 mt-3">
            <span className={`inline-flex items-center gap-1 text-[13px] font-bold px-2.5 py-1 rounded-full ${stats.isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {stats.isUp ? '↑' : '↓'} {Math.abs(stats.diffPct)}%
            </span>
            <span className="text-[13px] text-white/40 font-medium">vs เมื่อวาน</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[13px] text-white/40 mb-1 font-medium">รายรับรวม</p>
          <p className="text-xl font-bold text-white">฿{stats.todayTotalIncome.toLocaleString()}</p>
        </div>
      </div>
    </section>
  )
})
