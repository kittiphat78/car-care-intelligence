'use client'

import { useState, memo } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, TooltipProps } from 'recharts'
import RecordCard from '@/components/RecordCard'
import { useWeather, WeatherData } from '@/hooks/useWeather'
import { useDashboard, DashboardStats } from '@/hooks/useDashboard'
import { Record as AppRecord } from '@/types'

export default function Dashboard() {
  const weather = useWeather()
  const dash = useDashboard()
  const [isUnpaidModalOpen, setIsUnpaidModalOpen] = useState(false)

  if (dash.loading) return <LoadingScreen />

  return (
    <div className="min-h-dvh px-4 pt-6 pb-28 space-y-5">
      <Header userEmail={dash.userEmail} onLogout={dash.logout} />

      {weather && <WeatherWidget weather={weather} />}

      {dash.totalUnpaidAmount > 0 && (
        <UnpaidAlert 
          totalAmount={dash.totalUnpaidAmount} 
          onClick={() => setIsUnpaidModalOpen(true)} 
        />
      )}

      <NetProfitHero stats={dash.stats} />
      <StatsRow stats={dash.stats} />
      <ChartsSection dash={dash} />
      <RecordListSection dash={dash} />

      {isUnpaidModalOpen && (
        <UnpaidModal
          unpaidData={dash.groupedUnpaid}
          totalAmount={dash.totalUnpaidAmount}
          onClose={() => setIsUnpaidModalOpen(false)}
          onMarkPaid={dash.markAllAsPaidByCustomer}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 🧱 Sub-Components
// ─────────────────────────────────────────────────────────────────────────────

const LoadingScreen = memo(function LoadingScreen() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-[var(--bg)]">
      <div className="w-12 h-12 border-[3px] border-[var(--border)] border-t-[var(--accent)] rounded-full spinner" />
      <p className="text-base text-[var(--text-secondary)] font-medium">กำลังโหลด...</p>
    </div>
  )
})

const Header = memo(function Header({ userEmail, onLogout }: { userEmail: string; onLogout: () => void }) {
  return (
    <header className="flex items-center justify-between fade-up">
      <div>
        <p className="text-sm text-[var(--text-tertiary)] mb-0.5 font-medium">สวัสดี,</p>
        <h2 className="text-xl font-extrabold text-[var(--text-primary)] leading-tight tracking-tight">
          {userEmail.split('@')[0] || 'Admin'}
        </h2>
      </div>
      <button onClick={onLogout} className="btn btn-ghost text-sm py-2.5 px-4">
        ออกจากระบบ
      </button>
    </header>
  )
})

const WeatherWidget = memo(function WeatherWidget({ weather }: { weather: WeatherData }) {
  return (
    <section className={`card p-5 bg-gradient-to-br ${weather.bgClass} border fade-up delay-1 transition-all duration-500 hover:shadow-[var(--shadow-md)]`}>
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-white/50 flex items-center justify-center text-3xl shrink-0" aria-hidden="true">
            {weather.icon}
          </div>
          <div>
            <p className={`text-[11px] font-extrabold uppercase tracking-widest mb-1.5 opacity-80 ${weather.textClass}`}>
              เมืองเชียงราย ตอนนี้ 📍
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-[13px] font-bold px-2.5 py-1 rounded-lg shadow-sm ${weather.badgeClass}`}>
                {weather.condition} {weather.temp}°C
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border shadow-sm ${weather.aqiStatus.colorClass} flex items-center gap-1`}>
                <span className="opacity-80">🌫️ AQI:</span> {weather.aqi > 0 ? weather.aqi : '...'} ({weather.aqiStatus.label})
              </span>
            </div>
          </div>
        </div>
        {weather.prob > 0 && (
          <div className="text-right shrink-0 bg-white/40 px-3 py-2 rounded-xl border border-white/50 shadow-sm">
            <p className={`text-[10px] font-bold uppercase tracking-wider opacity-70 ${weather.textClass}`}>โอกาสฝน</p>
            <div className="flex items-baseline justify-end gap-0.5 mt-0.5">
              <p className={`text-lg font-extrabold leading-none ${weather.textClass}`}>{weather.prob}</p>
              <p className={`text-xs font-bold ${weather.textClass}`}>%</p>
            </div>
          </div>
        )}
      </div>
      <div className="bg-white/60 backdrop-blur-md rounded-2xl p-3.5 border border-white/60 flex items-start gap-3 shadow-sm">
        <span className={`shrink-0 mt-0.5 ${weather.textClass}`} aria-hidden="true">
          <AISparklesIcon />
        </span>
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
      className="bg-gradient-to-r from-[var(--red)] to-[#B91C1C] p-5 rounded-[var(--radius-xl)] flex items-center justify-between shadow-lg shadow-red-200/50 cursor-pointer active:scale-[0.98] transition-all fade-up delay-1"
    >
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl" aria-hidden="true">📒</div>
        <div>
          <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider">ยอดค้างชำระสะสม</p>
          <p className="text-white text-2xl font-extrabold leading-tight">฿{totalAmount.toLocaleString()}</p>
        </div>
      </div>
      <div className="bg-white/20 px-4 py-2 rounded-xl text-white text-sm font-bold border border-white/30 flex items-center gap-1">
        ดูรายละเอียด
      </div>
    </div>
  )
})

const NetProfitHero = memo(function NetProfitHero({ stats }: { stats: DashboardStats }) {
  return (
    <section className="card-dark p-6 fade-up delay-2">
      <p className="text-[13px] font-semibold text-white/50 uppercase tracking-widest mb-3">กำไรสุทธิวันนี้</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[3rem] font-extrabold tracking-tight leading-none text-white">
            ฿{stats.netProfit.toLocaleString()}
          </p>
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
    <section className="grid grid-cols-3 gap-3 fade-up delay-3">
      <div className="card p-4">
        <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2.5">รายจ่ายวันนี้</p>
        <p className="text-xl font-extrabold text-[var(--red)] leading-none">฿{stats.todayExpense.toLocaleString()}</p>
      </div>
      <div className="card p-4">
        <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2.5">ล้างรถ</p>
        <div className="flex items-baseline gap-1">
          <p className="text-xl font-extrabold text-[var(--text-primary)] leading-none">{stats.washCount}</p>
          <span className="text-sm text-[var(--text-tertiary)] font-medium">คัน</span>
        </div>
      </div>
      <div className="card p-4">
        <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide mb-2.5">ขัดสี</p>
        <div className="flex items-baseline gap-1">
          <p className="text-xl font-extrabold text-[var(--text-primary)] leading-none">{stats.polishCount}</p>
          <span className="text-sm text-[var(--text-tertiary)] font-medium">คัน</span>
        </div>
      </div>
    </section>
  )
})

const ChartsSection = memo(function ChartsSection({ dash }: { dash: ReturnType<typeof useDashboard> }) {
  return (
    <>
      <div className="flex items-center justify-between fade-up delay-4 mt-5 mb-2.5 px-1">
        <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">ภาพรวมร้าน 📊</h3>
        <div className="flex bg-[var(--surface-2)] p-1 rounded-xl gap-1">
          {(['week','month'] as const).map(m => (
            <button
              key={m}
              onClick={() => dash.setChartMode(m)}
              className={`px-3.5 py-2 rounded-lg text-sm font-bold transition-all ${
                dash.chartMode === m ? 'bg-white text-[var(--text-primary)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {m === 'week' ? '7 วัน' : '30 วัน'}
            </button>
          ))}
        </div>
      </div>
      <section className="grid gap-3 fade-up delay-4">
        <div className="card p-5">
          <h4 className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-5">แนวโน้มรายได้ (บาท)</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dash.chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#A39E96', fontSize: 11, fontWeight: 600 }} dy={8} />
                {/* ✅ แก้ไข Type Error บรรทัดที่ 225 ที่นี่ครับ */}
                <Tooltip
                  formatter={(value: any) => {
                    const num = Number(value) || 0;
                    return [`฿${num.toLocaleString()}`, 'รายได้'];
                  }}
                  contentStyle={{ 
                    borderRadius: '14px', 
                    border: '1px solid var(--border)', 
                    boxShadow: 'var(--shadow-md)', 
                    fontSize: '14px', 
                    fontWeight: 700, 
                    padding: '10px 16px' 
                  }}
                />
                <Area type="monotone" dataKey="income" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#grad)" dot={false} activeDot={{ r: 6, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </>
  )
})

const RecordListSection = memo(function RecordListSection({ dash }: { dash: ReturnType<typeof useDashboard> }) {
  return (
    <section className="fade-up delay-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-bold text-[var(--text-primary)]">รายการวันนี้</h3>
          <span className="badge text-[13px]" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
            {dash.records.length}
          </span>
        </div>
        <button onClick={dash.refresh} className="flex items-center gap-2 text-sm text-[var(--accent)] font-bold hover:text-[var(--accent-hover)] transition-colors py-1.5">
          <RefreshIcon /> รีเฟรช
        </button>
      </div>

      {dash.records.length === 0 ? (
        <div className="card p-12 text-center border-dashed border-2">
          <p className="text-4xl mb-3 opacity-20">🚗</p>
          <p className="text-base font-bold text-[var(--text-primary)]">ยังไม่มีงานวันนี้</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1.5">กด + เพื่อเพิ่มรายการใหม่</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {dash.records.map(r => <RecordCard key={r.id} record={r} />)}
        </div>
      )}
    </section>
  )
})

interface UnpaidGroup {
  customerName: string
  items: AppRecord[]
  total: number
}

const UnpaidModal = memo(function UnpaidModal({ 
  unpaidData, 
  totalAmount, 
  onClose, 
  onMarkPaid 
}: { 
  unpaidData: UnpaidGroup[]; 
  totalAmount: number; 
  onClose: () => void; 
  onMarkPaid: (name: string) => void;
}) {
  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm fade-in flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] slide-up overflow-hidden max-h-[85dvh] flex flex-col">
        <header className="flex items-center justify-between p-6 border-b border-[var(--border)] shrink-0">
          <h2 className="text-xl font-extrabold text-[var(--text-primary)]">สมุดทวงหนี้ 📒</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors" aria-label="Close modal">
            <CloseIcon />
          </button>
        </header>

        <div className="overflow-y-auto p-6 space-y-5">
          <div className="card bg-gradient-to-br from-[var(--red)] to-[#B91C1C] p-6 relative overflow-hidden border-0">
            <div className="absolute -right-4 -top-4 text-8xl opacity-10" aria-hidden="true">🚨</div>
            <p className="text-white/80 text-sm font-bold mb-1.5 relative z-10">ยอดค้างชำระทั้งหมด</p>
            <p className="text-4xl font-extrabold text-white relative z-10">฿{totalAmount.toLocaleString()}</p>
            <p className="text-white/70 text-sm mt-2 relative z-10 font-medium">รวมทั้งหมด {unpaidData.reduce((acc, curr) => acc + curr.items.length, 0)} คัน</p>
          </div>

          {unpaidData.map(({ customerName, items, total }) => (
            <article key={customerName} className="card p-5 border-2 border-red-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-[var(--red)]">{customerName}</h3>
                  <p className="text-sm font-semibold text-[var(--text-tertiary)] mt-0.5">ค้างชำระ {items.length} คัน</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold text-[var(--red)]">฿{total.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-[var(--surface-2)] rounded-[var(--radius-md)] p-4 mb-4 space-y-2.5">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex justify-between items-center text-[15px]">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[var(--text-tertiary)] text-sm font-medium">{idx + 1}.</span>
                      <span className="font-bold text-[var(--text-primary)]">{item.plate}</span>
                      <span className="text-[11px] text-[var(--text-tertiary)] hidden sm:inline">
                        ({new Date(item.created_at).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })})
                      </span>
                    </div>
                    <span className="font-bold text-[var(--text-secondary)]">฿{item.price}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onMarkPaid(customerName)}
                className="w-full py-3.5 rounded-[var(--radius-md)] bg-[var(--green-light)] text-[var(--green)] font-bold text-base border-2 border-[var(--green)] hover:bg-[var(--green)] hover:text-white transition-colors flex justify-center items-center gap-2 active:scale-[0.98]"
              >
                <CheckMarkIcon /> เคลียร์ยอดชำระแล้ว (จ่ายครบ)
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. SVG Icons (Extracted for cleanliness)
// ─────────────────────────────────────────────────────────────────────────────

const AISparklesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
  </svg>
)

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 13 13" fill="none">
    <path d="M11 6.5A4.5 4.5 0 1 1 6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M6.5 2l1.5 1.5L6.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const CheckMarkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)