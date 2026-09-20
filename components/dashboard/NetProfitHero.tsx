import { memo } from 'react'
import { DashboardStats } from '@/hooks/useDashboard'

export const NetProfitHero = memo(function NetProfitHero({ stats }: { stats: DashboardStats }) {
  const profitColor = stats.netProfit >= 0 ? 'var(--text-primary)' : 'var(--red)'

  return (
    <section className="card-gradient p-6 fade-up delay-2" aria-label="กำไรสุทธิวันนี้">
      <p className="text-[13px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>กำไรสุทธิวันนี้</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[3rem] font-extrabold tracking-tight leading-none stat-value" style={{ color: profitColor }} aria-live="polite">
            ฿{stats.netProfit.toLocaleString()}
          </p>
          <div className="flex items-center gap-2.5 mt-3">
            <span 
              className="inline-flex items-center gap-1.5 text-[13px] font-bold px-3 py-1.5 rounded-full transition-colors"
              style={{
                background: stats.isUp ? 'var(--green-light)' : 'var(--red-light)',
                color: stats.isUp ? 'var(--green)' : 'var(--red)'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform ${stats.isUp ? '' : 'rotate-180'}`} aria-hidden="true">
                <path d="M6 2L10 7H2L6 2Z" fill="currentColor" />
              </svg>
              {Math.abs(stats.diffPct)}%
            </span>
            <span className="text-[13px] font-medium" style={{ color: 'var(--text-tertiary)' }}>vs เมื่อวาน</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[13px] mb-1 font-medium" style={{ color: 'var(--text-tertiary)' }}>รายรับรวม</p>
          <p className="text-xl font-bold stat-value" style={{ color: 'var(--text-primary)' }}>฿{stats.todayTotalIncome.toLocaleString()}</p>
        </div>
      </div>
    </section>
  )
})
