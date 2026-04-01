'use client'
import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { supabase } from '@/lib/supabase'
import { Record } from '@/types'
import RecordCard from '@/components/RecordCard'

type ChartMode = 'week' | 'month'

export default function Dashboard() {
  const [records, setRecords] = useState<Record[]>([])
  const [allRecords, setAllRecords] = useState<Record[]>([])
  const [yesterday, setYesterday] = useState<Record[]>([])
  const [chartMode, setChartMode] = useState<ChartMode>('week')
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1)

    const [todayRes, yesterdayRes, allRes] = await Promise.all([
      supabase.from('records').select('*').gte('created_at', todayStart.toISOString()).order('created_at', { ascending: false }),
      supabase.from('records').select('*').gte('created_at', yesterdayStart.toISOString()).lt('created_at', todayStart.toISOString()),
      supabase.from('records').select('*').order('created_at', { ascending: true }),
    ])

    setRecords(todayRes.data ?? [])
    setYesterday(yesterdayRes.data ?? [])
    setAllRecords(allRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const channel = supabase.channel('realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const todayWash = records.filter(r => r.type === 'wash')
  const todayPolish = records.filter(r => r.type === 'polish')
  const todayWashIncome = todayWash.reduce((s, r) => s + r.price, 0)
  const todayPolishIncome = todayPolish.reduce((s, r) => s + r.price, 0)
  const todayTotal = todayWashIncome + todayPolishIncome
  const todayCount = records.length

  const yesterdayTotal = yesterday.reduce((s, r) => s + r.price, 0)
  const diffAmount = todayTotal - yesterdayTotal
  const diffPct = yesterdayTotal > 0 ? Math.round((diffAmount / yesterdayTotal) * 100) : null

  const allWash = allRecords.filter(r => r.type === 'wash')
  const allPolish = allRecords.filter(r => r.type === 'polish')
  const totalWashIncome = allWash.reduce((s, r) => s + r.price, 0)
  const totalPolishIncome = allPolish.reduce((s, r) => s + r.price, 0)
  const grandTotal = totalWashIncome + totalPolishIncome

  const chartData = useMemo(() => {
    const now = new Date()
    const days = chartMode === 'week' ? 7 : 30
    const result: { label: string; wash: number; polish: number }[] = []

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      const dayRecs = allRecords.filter(r => {
        const t = new Date(r.created_at)
        return t >= d && t < next
      })
      result.push({
        label: chartMode === 'week'
          ? d.toLocaleDateString('th-TH', { weekday: 'short' })
          : d.toLocaleDateString('th-TH', { day: 'numeric' }),
        wash: dayRecs.filter(r => r.type === 'wash').reduce((s, r) => s + r.price, 0),
        polish: dayRecs.filter(r => r.type === 'polish').reduce((s, r) => s + r.price, 0),
      })
    }
    return result
  }, [allRecords, chartMode])

  const todayLabel = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short' })
  const isUp = diffAmount >= 0

  return (
    <div className="min-h-screen bg-[#F0F2F8] page-transition">
      <div className="max-w-2xl mx-auto pb-48 px-5 font-sarabun">

        {/* --- Header --- */}
        <div className="pt-12 pb-7 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400 mb-1.5">{todayLabel}</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">ภาพรวมวันนี้</h1>
          </div>
          <button
            onClick={fetchData}
            className={`
              w-12 h-12 rounded-2xl bg-white shadow-md shadow-slate-200
              flex items-center justify-center
              border border-slate-100
              hover:shadow-lg hover:border-blue-200 hover:bg-blue-50
              active:scale-90 transition-all duration-200
            `}
          >
            <svg
              className={`w-5 h-5 text-blue-500 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>

        {/* --- Hero Card --- */}
        <div
          className="relative rounded-[28px] overflow-hidden mb-5 shadow-2xl shadow-slate-900/20"
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F2444 100%)',
          }}
        >
          {/* Subtle glow orb */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #60A5FA 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #A78BFA 0%, transparent 70%)' }} />

          <div className="relative z-10 p-7">
            {/* Top row */}
            <div className="flex justify-between items-start mb-7">
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2 tracking-wide">รายได้รวมวันนี้</p>
                <p className="text-4xl font-black text-white tracking-tight leading-none mb-3">
                  ฿{todayTotal.toLocaleString()}
                </p>
                <span className={`
                  inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl
                  ${isUp
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/20 text-red-400 border border-red-500/20'}
                `}>
                  {isUp ? '▲' : '▼'} {diffPct !== null ? `${Math.abs(diffPct)}%` : '0%'}
                  <span className="font-medium opacity-70 ml-0.5">vs เมื่อวาน</span>
                </span>
              </div>

              <div className="flex flex-col items-end gap-1">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">คันวันนี้</p>
                <div className="bg-white/10 border border-white/10 rounded-2xl px-4 py-2 text-center">
                  <p className="text-3xl font-black text-white leading-none">{todayCount}</p>
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">คัน</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-white/5 mb-5" />

            {/* Income breakdown grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/8 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/20 flex items-center justify-center text-sm">🧼</div>
                  <p className="text-xs font-bold text-slate-400">ล้างรถ</p>
                </div>
                <p className="text-2xl font-black text-white">฿{todayWashIncome.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">{todayWash.length} คัน</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/8 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center text-sm">✨</div>
                  <p className="text-xs font-bold text-slate-400">ขัดสี</p>
                </div>
                <p className="text-2xl font-black text-amber-400">฿{todayPolishIncome.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">{todayPolish.length} คัน</p>
              </div>
            </div>
          </div>
        </div>

        {/* --- ยอดสะสม --- */}
        <div className="bg-white rounded-[24px] border border-slate-100/80 p-6 mb-4 shadow-sm shadow-slate-100">
          <div className="flex justify-between items-start mb-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">รายได้สะสมตั้งแต่เปิดร้าน</p>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />ล้างรถ</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />ขัดสี</span>
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight mt-2 mb-5">฿{grandTotal.toLocaleString()}</p>

          <div className="h-3 rounded-full overflow-hidden bg-slate-100 flex gap-0.5">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000"
              style={{ width: grandTotal > 0 ? `${(totalWashIncome / grandTotal) * 100}%` : '0%' }}
            />
            <div
              className="bg-gradient-to-r from-amber-400 to-amber-300 rounded-full transition-all duration-1000"
              style={{ width: grandTotal > 0 ? `${(totalPolishIncome / grandTotal) * 100}%` : '0%' }}
            />
          </div>

          <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-400">
            <span>฿{totalWashIncome.toLocaleString()}</span>
            <span>฿{totalPolishIncome.toLocaleString()}</span>
          </div>
        </div>

        {/* --- กราฟ --- */}
        <div className="bg-white rounded-[24px] border border-slate-100/80 p-6 mb-5 shadow-sm shadow-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-wide">สถิติรายได้</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                {chartMode === 'week' ? '7 วันล่าสุด' : '30 วันล่าสุด'}
              </p>
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {(['week', 'month'] as ChartMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setChartMode(m)}
                  className={`
                    px-4 py-1.5 rounded-lg text-[10px] font-black transition-all duration-200
                    ${chartMode === m
                      ? 'bg-white text-slate-900 shadow-sm shadow-slate-200'
                      : 'text-slate-400 hover:text-slate-600'}
                  `}
                >
                  {m === 'week' ? '7 วัน' : '30 วัน'}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mb-4">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
              <span className="w-6 h-0.5 bg-blue-500 rounded-full inline-block" />ล้างรถ
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
              <span className="w-6 h-0.5 bg-amber-400 rounded-full inline-block" />ขัดสี
            </span>
          </div>

          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="washGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="polishGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                  dy={6}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '10px 14px',
                  }}
                  cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="wash" stroke="#3B82F6" strokeWidth={2.5} fill="url(#washGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#3B82F6' }} />
                <Area type="monotone" dataKey="polish" stroke="#F59E0B" strokeWidth={2.5} fill="url(#polishGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#F59E0B' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- รายการวันนี้ --- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 mb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.15em]">รายการวันนี้</h2>
            <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-full shadow-sm">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              สดตอนนี้
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-white rounded-[20px] animate-pulse border border-slate-100" style={{ opacity: 1 - i * 0.2 }} />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="bg-white rounded-[24px] p-14 text-center border border-slate-100 shadow-sm">
              <p className="text-3xl mb-3">🚗</p>
              <p className="text-slate-400 text-sm font-bold">ยังไม่มีรายการสำหรับวันนี้</p>
              <p className="text-slate-300 text-xs font-medium mt-1">รายการจะปรากฏที่นี่แบบเรียลไทม์</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {records.map(r => <RecordCard key={r.id} record={r} />)}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}