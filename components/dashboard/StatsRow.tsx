import { memo } from 'react'
import { DashboardStats } from '@/hooks/useDashboard'
import { ExpenseIcon, WashIcon, AISparklesIcon } from '@/components/icons/DashboardIcons'

export const StatsRow = memo(function StatsRow({ stats }: { stats: DashboardStats }) {
  return (
    <section className="grid grid-cols-3 gap-3 fade-up delay-3" aria-label="สถิติวันนี้">
      {/* รายจ่าย */}
      <div className="card p-4 flex flex-col justify-between h-32">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-[var(--red)] shrink-0" style={{ background: 'var(--red-light)' }}>
          <ExpenseIcon />
        </div>
        <div>
          <p className="text-lg font-extrabold text-[var(--red)] leading-tight tabular-nums">฿{stats.todayExpense.toLocaleString()}</p>
          <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mt-1">รายจ่าย</p>
        </div>
      </div>

      {/* ล้างรถ */}
      <div className="card p-4 flex flex-col justify-between h-32">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-[var(--accent)] shrink-0" style={{ background: 'var(--accent-light)' }}>
          <WashIcon />
        </div>
        <div>
          <div className="flex items-baseline gap-0.5">
            <p className="text-lg font-extrabold text-[var(--text-primary)] leading-tight">{stats.washCount}</p>
            <span className="text-xs text-[var(--text-tertiary)] font-bold">คัน</span>
          </div>
          <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mt-1">ล้างรถ</p>
        </div>
      </div>

      {/* ขัดสี */}
      <div className="card p-4 flex flex-col justify-between h-32">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-[var(--amber)] shrink-0" style={{ background: 'var(--amber-light)' }}>
          <AISparklesIcon />
        </div>
        <div>
          <div className="flex items-baseline gap-0.5">
            <p className="text-lg font-extrabold text-[var(--text-primary)] leading-tight">{stats.polishCount}</p>
            <span className="text-xs text-[var(--text-tertiary)] font-bold">คัน</span>
          </div>
          <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mt-1">ขัดสี</p>
        </div>
      </div>
    </section>
  )
})
