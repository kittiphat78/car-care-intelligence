'use client'

import { useState, memo, useCallback, useMemo, useEffect } from 'react'
import { Area, AreaChart, BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import RecordCard from '@/components/RecordCard'
import { useWeather, WeatherData } from '@/hooks/useWeather'
import { useDashboard, DashboardStats } from '@/hooks/useDashboard'
import { Record as AppRecord } from '@/types'

/* ═══════════════════════════════════════════════════════════════════════════
   Dashboard — Main Entry
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const weather = useWeather()
  const dash = useDashboard()
  const [isUnpaidModalOpen, setIsUnpaidModalOpen] = useState(false)

  const openUnpaid = useCallback(() => setIsUnpaidModalOpen(true), [])
  const closeUnpaid = useCallback(() => setIsUnpaidModalOpen(false), [])

  if (dash.loading) return <LoadingSkeleton />

  return (
    <div className="min-h-dvh px-4 pt-6 space-y-5">
      <Header userEmail={dash.userEmail} onLogout={dash.logout} />
      {weather && <WeatherWidget weather={weather} />}
      {dash.totalUnpaidAmount > 0 && <UnpaidAlert totalAmount={dash.totalUnpaidAmount} onClick={openUnpaid} />}
      <NetProfitHero stats={dash.stats} />
      <StatsRow stats={dash.stats} />
      <AIInsights dash={dash} />
      <ChartsSection dash={dash} />
      <RecordListSection dash={dash} />

      {isUnpaidModalOpen && (
        <UnpaidModal
          unpaidData={dash.groupedUnpaid}
          totalAmount={dash.totalUnpaidAmount}
          onClose={closeUnpaid}
          onMarkPaid={dash.markAllAsPaidByCustomer}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Loading Skeleton
   ═══════════════════════════════════════════════════════════════════════════ */

const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="min-h-dvh px-4 pt-6 space-y-5" aria-busy="true" aria-label="กำลังโหลดข้อมูล">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div><div className="skeleton h-4 w-16 mb-2" /><div className="skeleton h-7 w-28" /></div>
        <div className="skeleton h-10 w-24 rounded-xl" />
      </div>
      {/* Weather skeleton */}
      <div className="skeleton h-36 rounded-[var(--radius-xl)]" />
      {/* Hero skeleton */}
      <div className="skeleton h-40 rounded-[var(--radius-xl)]" />
      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-[var(--radius-lg)]" />)}
      </div>
      {/* Records skeleton */}
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-[76px] rounded-[var(--radius-lg)]" />)}
      </div>
    </div>
  )
})

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════════════════════════ */

const Header = memo(function Header({ userEmail, onLogout }: { userEmail: string; onLogout: () => void }) {
  return (
    <header className="flex items-center justify-between fade-up">
      <div>
        <p className="text-sm text-[var(--text-tertiary)] mb-0.5 font-medium">สวัสดี,</p>
        <h2 className="text-xl font-extrabold text-[var(--text-primary)] leading-tight tracking-tight">
          {userEmail.split('@')[0] || 'Admin'}
        </h2>
      </div>
      <button onClick={onLogout} className="btn btn-ghost text-sm py-2.5 px-4" aria-label="ออกจากระบบ">
        ออกจากระบบ
      </button>
    </header>
  )
})

const WeatherWidget = memo(function WeatherWidget({ weather }: { weather: WeatherData }) {
  // ตรวจจับว่าเป็นธีมเข้ม (กลางคืน) จากค่าสี background
  const isDark = weather.bgClass.includes('#1E') || weather.bgClass.includes('#0F') || weather.bgClass.includes('#0C') || weather.bgClass.includes('#2E') || weather.bgClass.includes('#31')
  const glassLight = isDark ? 'bg-white/10 border-white/15' : 'bg-white/40 border-white/50'
  const glassMedium = isDark ? 'bg-white/15 border-white/20' : 'bg-white/60 border-white/60'
  const iconBg = isDark ? 'bg-white/15 border-white/20' : 'bg-white border-white/50 shadow-sm'
  const updateBg = isDark ? 'bg-white/10 border-white/20' : 'bg-white/50 border-white/60'

  return (
    <section
      className={`rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 bg-gradient-to-br ${weather.bgClass} border fade-up delay-1 transition-colors duration-500`}
      aria-label="สภาพอากาศเชียงราย"
    >
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`w-14 h-14 rounded-2xl ${iconBg} border flex items-center justify-center text-3xl shrink-0`} aria-hidden="true">{weather.icon}</div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <p className={`text-[11px] font-extrabold uppercase tracking-widest opacity-80 ${weather.textClass}`}>เมืองเชียงราย 📍</p>
              <span className={`flex items-center gap-1 ${updateBg} px-2 py-0.5 rounded-full border`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
                <span className={`text-[10px] font-bold opacity-70 ${weather.textClass}`}>อัปเดต {weather.lastUpdated} น.</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-[13px] font-bold px-2.5 py-1 rounded-lg shadow-sm ${weather.badgeClass}`}>{weather.condition} {weather.temp}°C</span>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border shadow-sm ${weather.aqiStatus.colorClass} flex items-center gap-1`}>
                <span className="opacity-80">🌫️ AQI:</span> {weather.aqi > 0 ? weather.aqi : '...'} ({weather.aqiStatus.label})
              </span>
            </div>
          </div>
        </div>
        {weather.prob > 0 && (
          <div className={`text-right shrink-0 ${glassLight} px-3 py-2 rounded-xl border shadow-sm`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider opacity-70 ${weather.textClass}`}>โอกาสฝน</p>
            <div className="flex items-baseline justify-end gap-0.5 mt-0.5">
              <p className={`text-lg font-extrabold leading-none ${weather.textClass}`}>{weather.prob}</p>
              <p className={`text-xs font-bold ${weather.textClass}`}>%</p>
            </div>
          </div>
        )}
      </div>

      {/* แถวข้อมูลเพิ่มเติม: รู้สึกเหมือน, ความชื้น, ลม */}
      <div className="flex gap-2 mb-4">
        <div className={`flex-1 ${glassLight} rounded-xl px-3 py-2 border text-center`}>
          <p className={`text-[10px] font-bold opacity-60 ${weather.textClass}`}>รู้สึกเหมือน</p>
          <p className={`text-sm font-extrabold ${weather.textClass}`}>{weather.feelsLike}°C</p>
        </div>
        <div className={`flex-1 ${glassLight} rounded-xl px-3 py-2 border text-center`}>
          <p className={`text-[10px] font-bold opacity-60 ${weather.textClass}`}>💧 ความชื้น</p>
          <p className={`text-sm font-extrabold ${weather.textClass}`}>{weather.humidity}%</p>
        </div>
        <div className={`flex-1 ${glassLight} rounded-xl px-3 py-2 border text-center`}>
          <p className={`text-[10px] font-bold opacity-60 ${weather.textClass}`}>💨 ลม</p>
          <p className={`text-sm font-extrabold ${weather.textClass}`}>{weather.windSpeed} km/h</p>
        </div>
      </div>

      <div className={`${glassMedium} backdrop-blur-md rounded-2xl p-3.5 border flex items-start gap-3 shadow-sm`}>
        <span className={`shrink-0 mt-0.5 ${weather.textClass}`} aria-hidden="true"><AISparklesIcon /></span>
        <p className={`text-[13px] font-bold leading-relaxed ${weather.textClass}`}>{weather.message}</p>
      </div>
    </section>
  )
})

const UnpaidAlert = memo(function UnpaidAlert({ totalAmount, onClick }: { totalAmount: number; onClick: () => void }) {
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

const NetProfitHero = memo(function NetProfitHero({ stats }: { stats: DashboardStats }) {
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

const StatsRow = memo(function StatsRow({ stats }: { stats: DashboardStats }) {
  return (
    <section className="grid grid-cols-3 gap-3 fade-up delay-3" aria-label="สถิติวันนี้">
      {/* รายจ่าย */}
      <div className="card p-4 flex flex-col justify-between h-32">
        <div className="w-9 h-9 rounded-2xl bg-red-50 flex items-center justify-center text-[var(--red)] border border-red-100 shrink-0">
          <ExpenseIcon />
        </div>
        <div>
          <p className="text-lg font-extrabold text-[var(--red)] leading-tight">฿{stats.todayExpense.toLocaleString()}</p>
          <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mt-1">รายจ่าย</p>
        </div>
      </div>

      {/* ล้างรถ */}
      <div className="card p-4 flex flex-col justify-between h-32">
        <div className="w-9 h-9 rounded-2xl bg-blue-50 flex items-center justify-center text-[var(--accent)] border border-blue-100 shrink-0">
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
        <div className="w-9 h-9 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100 shrink-0">
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

const AIInsights = memo(function AIInsights({ dash }: { dash: any }) {
  const { stats, groupedUnpaid } = dash
  const [insightsText, setInsightsText] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [expanded, setExpanded] = useState<boolean>(false)

  useEffect(() => {
    async function fetchInsights() {
      setLoading(true)
      try {
        const unpaidTotal = groupedUnpaid.reduce((s: number, g: any) => s + g.total, 0)
        const response = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            todayTotalIncome: stats.todayTotalIncome,
            todayExpense: stats.todayExpense,
            netProfit: stats.netProfit,
            washCount: stats.washCount,
            polishCount: stats.polishCount,
            unpaidCount: groupedUnpaid.length,
            unpaidTotal: unpaidTotal,
          }),
        })
        const data = await response.json()
        setInsightsText(data.text)
      } catch (error) {
        setInsightsText('ไม่สามารถเชื่อมต่อกับ AI ได้')
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [stats, groupedUnpaid])

  const insights = useMemo(() => {
    return insightsText.split('\n').filter(t => t.trim() !== '').map(t => t.replace(/^✦\s*/, ''))
  }, [insightsText])

  return (
    <section className="card bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100 p-5 fade-up delay-3" aria-label="สรุปวิเคราะห์ข้อมูล">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
            <AISparklesIcon />
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">วิเคราะห์ภาพรวมโดย AI</h3>
        </div>
        {insights.length > 1 && (
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="text-xs text-purple-600 font-bold hover:text-purple-700 active:scale-95 transition-transform flex items-center gap-1"
          >
            {expanded ? 'แสดงน้อยลง ↑' : 'ดูเพิ่มเติม ↓'}
          </button>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      ) : (
        <ul className="space-y-2.5">
          {(expanded ? insights : insights.slice(0, 1)).map((text, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <span className="text-purple-500 mt-0.5">✦</span>
              <span>
                {text.split('**').map((part, i) => 
                  i % 2 === 1 ? <strong key={i} className="text-[var(--text-primary)] font-bold">{part}</strong> : part
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
})

const ChartsSection = memo(function ChartsSection({ dash }: { dash: ReturnType<typeof useDashboard> }) {
  return (
    <>
      <div className="flex items-center justify-between fade-up delay-4 mt-5 mb-2.5 px-1">
        <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">ภาพรวมร้าน 📊</h3>
        <div className="flex bg-[var(--surface-2)] p-1 rounded-xl gap-1">
          {(['week', 'month'] as const).map(m => (
            <button
              key={m}
              onClick={() => dash.setChartMode(m)}
              className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-all duration-150 ${dash.chartMode === m ? 'bg-white text-[var(--text-primary)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-tertiary)]'
                }`}
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
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#8A847C', fontSize: 11, fontWeight: 600 }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8A847C', fontSize: 11, fontWeight: 600 }} dx={-5} />
              <Tooltip
                formatter={(value: any, name?: any) => [`฿${(Number(value) || 0).toLocaleString()}`, name === 'income' ? 'รายรับ' : 'รายจ่าย']}
                contentStyle={{ borderRadius: '14px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', fontSize: '14px', fontWeight: 700, padding: '10px 16px' }}
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

const RecordListSection = memo(function RecordListSection({ dash }: { dash: ReturnType<typeof useDashboard> }) {
  return (
    <section className="fade-up delay-5 mt-6" aria-label="รายการวันนี้">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-bold text-[var(--text-primary)]">รายการวันนี้</h3>
          <span className="badge text-[13px]" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{dash.records.length}</span>
        </div>
        <button onClick={dash.refresh} className="flex items-center gap-2 text-sm text-[var(--accent)] font-bold py-1.5 active:scale-95 transition-transform" aria-label="รีเฟรชข้อมูล">
          <RefreshIcon /> รีเฟรช
        </button>
      </div>
      {dash.records.length === 0 ? (
        <div className="card p-12 text-center border-dashed border-2">
          <p className="text-4xl mb-3 opacity-20" aria-hidden="true">🚗</p>
          <p className="text-base font-bold text-[var(--text-primary)]">ยังไม่มีงานวันนี้</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1.5">กด + เพื่อเพิ่มรายการใหม่</p>
        </div>
      ) : (
        <div className="grid gap-3">{dash.records.map(r => <RecordCard key={r.id} record={r} />)}</div>
      )}
    </section>
  )
})

/* ═══════════════════════════════════════════════════════════════════════════
   Unpaid Modal — พร้อมแสดงวันที่ค้างชำระ & จำนวนวันค้าง
   ═══════════════════════════════════════════════════════════════════════════ */

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

/** เลือกสีตาม severity ของจำนวนวันค้าง */
function getOverdueBadgeStyle(days: number): { bg: string; text: string; border: string } {
  if (days >= 14) return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' }
  if (days >= 7) return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' }
  if (days >= 3) return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' }
  return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' }
}

const UnpaidModal = memo(function UnpaidModal({ unpaidData, totalAmount, onClose, onMarkPaid }: {
  unpaidData: UnpaidGroup[]; totalAmount: number; onClose: () => void; onMarkPaid: (name: string) => void
}) {
  if (typeof document !== 'undefined') document.body.classList.add('modal-open')
  const handleClose = () => { document.body.classList.remove('modal-open'); onClose() }
  const totalCars = unpaidData.reduce((a, c) => a + c.items.length, 0)

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md fade-in flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      onKeyDown={(e) => e.key === 'Escape' && handleClose()}
      role="dialog"
      aria-modal="true"
      aria-label="สมุดทวงหนี้"
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
              <h2 className="text-xl font-extrabold text-white tracking-tight">สมุดทวงหนี้</h2>
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
          {unpaidData.map(({ customerName, items, total }, groupIdx) => {
            const maxOverdueDays = Math.max(...items.map(i => getOverdueDays(i.created_at)))
            const maxStyle = getOverdueBadgeStyle(maxOverdueDays)
            const urgencyEmoji = maxOverdueDays >= 14 ? '🔴' : maxOverdueDays >= 7 ? '🟠' : maxOverdueDays >= 3 ? '🟡' : '⚪'

            return (
              <article key={customerName} className="card p-0 overflow-hidden border border-[var(--border)] shadow-sm">
                {/* Customer Header */}
                <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center text-lg shrink-0 border border-red-100">
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
                  <div className={`flex items-center gap-2 mt-3 px-3.5 py-2 rounded-xl ${maxStyle.bg} border ${maxStyle.border}`}>
                    <ClockIcon />
                    <span className={`text-[13px] font-bold ${maxStyle.text}`}>
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
                      <div key={item.id} className={`flex items-center justify-between px-3.5 py-3 sm:px-4 sm:py-3.5 ${idx > 0 ? 'border-t border-[var(--border)]' : ''}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-[12px] font-bold text-[var(--text-tertiary)] shrink-0 shadow-sm border border-[var(--border)]">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-[15px] text-[var(--text-primary)] truncate">{item.plate}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[12px] text-[var(--text-tertiary)] font-medium">
                                {formatThaiDate(item.created_at)}
                              </span>
                              <span className="text-[var(--text-tertiary)]">·</span>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.border}`}>
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

                {/* Clear Button */}
                <div className="px-5 pb-5">
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

/* ═══════════════════════════════════════════════════════════════════════════
   SVG Icons
   ═══════════════════════════════════════════════════════════════════════════ */

const ExpenseIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>)
const WashIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>)
const AISparklesIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>)
const RefreshIcon = () => (<svg width="16" height="16" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M11 6.5A4.5 4.5 0 1 1 6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M6.5 2l1.5 1.5L6.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>)
const CloseIcon = () => (<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>)
const CheckMarkIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>)
const CheckMarkSmallIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>)
const ClockIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>)