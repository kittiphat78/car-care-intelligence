import { memo } from 'react'
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { useTheme } from '@/hooks/useTheme'
import { useDashboard } from '@/hooks/useDashboard'

export const ChartsSection = memo(function ChartsSection({ dash }: { dash: ReturnType<typeof useDashboard> }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB'
  const tickColor = isDark ? '#6B7280' : '#8A847C'
  const tooltipBg = isDark ? '#1C1C27' : '#FFFFFF'
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'var(--border)'

  return (
    <>
      <div className="flex items-center justify-between fade-up delay-4 mt-5 mb-2.5 px-1">
        <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">ภาพรวมร้าน 📊</h3>
        <div className="flex p-1 rounded-xl gap-1" style={{ background: 'var(--surface-2)' }}>
          {(['week', 'month'] as const).map(m => (
            <button
              key={m}
              onClick={() => dash.setChartMode(m)}
              className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-all duration-150 ${dash.chartMode === m ? 'text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-tertiary)]'
                }`}
              style={dash.chartMode === m ? { background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' } : undefined}
              aria-pressed={dash.chartMode === m}
            >
              {m === 'week' ? '7 วัน' : '30 วัน'}
            </button>
          ))}
        </div>
      </div>
      <section className="card p-5 fade-up delay-4" aria-label="กราฟรายรับ-รายจ่าย">
        <h4 className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-5">รายรับ - รายจ่าย (บาท)</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dash.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 11, fontWeight: 600 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: tickColor, fontSize: 11, fontWeight: 600 }} dx={-5} />
              <Tooltip
                formatter={(value, name) => [`฿${(Number(value) || 0).toLocaleString()}`, name === 'income' || name === 'รายรับ' ? 'รายรับ' : 'รายจ่าย']}
                contentStyle={{ borderRadius: '14px', border: `1px solid ${tooltipBorder}`, background: tooltipBg, boxShadow: 'var(--shadow-lg)', fontSize: '14px', fontWeight: 700, padding: '10px 16px', color: 'var(--text-primary)' }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingBottom: '15px' }} />
              <Bar dataKey="income" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="รายรับ" barSize={16} />
              <Bar dataKey="expense" fill="#EC4899" radius={[4, 4, 0, 0]} name="รายจ่าย" barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  )
})
