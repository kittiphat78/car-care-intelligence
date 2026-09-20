import { memo } from 'react'
import { DashboardStats } from '@/hooks/useDashboard'
import { ExpenseIcon, WashIcon, AISparklesIcon } from '@/components/icons/DashboardIcons'

interface StatCardProps {
  icon: React.ReactNode
  value: string | number
  unit?: string
  label: string
  color: string
  bgColor: string
}

const StatCard = memo(function StatCard({ icon, value, unit, label, color, bgColor }: StatCardProps) {
  return (
    <div className="card p-4 flex flex-col justify-between h-[7.5rem]">
      <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: bgColor, color }}>
        {icon}
      </div>
      <div>
        <div className="flex items-baseline gap-0.5">
          <p className="text-lg font-extrabold leading-tight stat-value" style={{ color }}>{value}</p>
          {unit && <span className="text-xs font-bold" style={{ color: 'var(--text-tertiary)' }}>{unit}</span>}
        </div>
        <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mt-1">{label}</p>
      </div>
    </div>
  )
})

export const StatsRow = memo(function StatsRow({ stats }: { stats: DashboardStats }) {
  return (
    <section className="grid grid-cols-3 gap-3 fade-up delay-3" aria-label="สถิติวันนี้">
      <StatCard
        icon={<ExpenseIcon />}
        value={`฿${stats.todayExpense.toLocaleString()}`}
        label="รายจ่าย"
        color="var(--red)"
        bgColor="var(--red-light)"
      />
      <StatCard
        icon={<WashIcon />}
        value={stats.washCount}
        unit="คัน"
        label="ล้างรถ"
        color="var(--accent)"
        bgColor="var(--accent-light)"
      />
      <StatCard
        icon={<AISparklesIcon />}
        value={stats.polishCount}
        unit="คัน"
        label="ขัดสี"
        color="var(--amber)"
        bgColor="var(--amber-light)"
      />
    </section>
  )
})
