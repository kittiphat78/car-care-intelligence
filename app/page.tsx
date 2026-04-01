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

  // ── วันนี้ ──
  const todayWash = records.filter(r => r.type === 'wash')
  const todayPolish = records.filter(r => r.type === 'polish')
  const todayWashIncome = todayWash.reduce((s, r) => s + r.price, 0)
  const todayPolishIncome = todayPolish.reduce((s, r) => s + r.price, 0)
  const todayTotal = todayWashIncome + todayPolishIncome
  const todayCount = records.length

  // ── เมื่อวาน ──
  const yesterdayTotal = yesterday.reduce((s, r) => s + r.price, 0)
  const yesterdayCount = yesterday.length
  const diffAmount = todayTotal - yesterdayTotal
  const diffPct = yesterdayTotal > 0 ? Math.round((diffAmount / yesterdayTotal) * 100) : null
  const diffCountPct = yesterdayCount > 0 ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100) : null

  // ── สะสมทั้งหมด ──
  const allWash = allRecords.filter(r => r.type === 'wash')
  const allPolish = allRecords.filter(r => r.type === 'polish')
  const totalWashIncome = allWash.reduce((s, r) => s + r.price, 0)
  const totalPolishIncome = allPolish.reduce((s, r) => s + r.price, 0)
  const grandTotal = totalWashIncome + totalPolishIncome

  // ── กราฟ ──
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
    <div className="min-h-screen bg-[#F4F6F9] page-transition">
      <div className="max-w-2xl mx-auto pb-32 px-5">

        {/* ── Header ── */}
        <div className="pt-14 pb-6 flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">{todayLabel}</p>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Overview</h1>
          </div>
          <button
            onClick={fetchData}
            className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-90 transition-all shadow-sm"
          >
            <span className="text-base">🔄</span>
          </button>
        </div>

        {/* ── Hero Card: ยอดรวมวันนี้ ── */}
        <div className="relative rounded-[28px] overflow-hidden mb-4 shadow-xl shadow-slate-900/10">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950" />
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />

          <div className="relative z-10 p-6">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3">รายได้วันนี้</p>

            {/* ยอดเงิน + เปรียบเทียบ */}
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-4xl font-black text-white tracking-tight">฿{todayTotal.toLocaleString()}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {isUp ? '▲' : '▼'} {diffPct !== null ? `${Math.abs(diffPct)}%` : 'วันแรก'}
                  </span>
                  <span className="text-[10px] text-slate-500">vs เมื่อวาน ฿{yesterdayTotal.toLocaleString()}</span>
                </div>
              </div>
              {/* จำนวนคันวันนี้รวม */}
              <div className="text-right">
                <p className="text-4xl font-black text-white">{todayCount}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  คันวันนี้
                  {diffCountPct !== null && (
                    <span className={`ml-1.5 font-black ${diffCountPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {diffCountPct >= 0 ? ' ▲' : ' ▼'}{Math.abs(diffCountPct)}%
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="h-px bg-white/5 mb-4" />

            {/* Wash vs Polish วันนี้ */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-2xl px-4 py-3">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">🚿 ล้างรถ</p>
                <p className="text-xl font-black text-white">฿{todayWashIncome.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{todayWash.length} คัน</p>
              </div>
              <div className="bg-white/5 rounded-2xl px-4 py-3">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">✨ ขัดสี</p>
                <p className="text-xl font-black text-blue-400">฿{todayPolishIncome.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{todayPolish.length} งาน</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── ยอดสะสมทั้งหมดตั้งแต่เปิดร้าน ── */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5 mb-4">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">ยอดสะสมตั้งแต่เปิดร้าน</p>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-3xl font-black text-slate-900 tracking-tight">฿{grandTotal.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">{allRecords.length} รายการทั้งหมด</p>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-1.5 justify-end">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] font-bold text-slate-500">{allWash.length} คัน</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[10px] font-bold text-slate-500">{allPolish.length} งาน</span>
              </div>
            </div>
          </div>

          {/* Stacked progress bar */}
          {grandTotal > 0 && (
            <>
              <div className="flex rounded-full overflow-hidden h-2.5 bg-slate-100 mb-2">
                <div
                  className="bg-blue-500 transition-all duration-700"
                  style={{ width: `${Math.round((totalWashIncome / grandTotal) * 100)}%` }}
                />
                <div
                  className="bg-amber-400 transition-all duration-700"
                  style={{ width: `${Math.round((totalPolishIncome / grandTotal) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-black text-blue-500">🚿 ฿{totalWashIncome.toLocaleString()}</span>
                <span className="text-[10px] font-black text-amber-500">✨ ฿{totalPolishIncome.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>

        {/* ── กราฟรายได้ย้อนหลัง ── */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5 mb-4">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-black text-slate-900">รายได้ย้อนหลัง</h3>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {(['week', 'month'] as ChartMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setChartMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    chartMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  {m === 'week' ? '7 วัน' : '30 วัน'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -35, bottom: 0 }}>
                <defs>
                  <linearGradient id="washGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="polishGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} dy={6} />
                <Tooltip
                  cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid #F1F5F9', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', padding: '10px 14px', fontSize: '11px', fontWeight: 800 }}
                  formatter={(value: any, name: string) => [`฿${Number(value).toLocaleString()}`, name === 'wash' ? '🚿 Wash' : '✨ Polish']}
                />
                <Area type="monotone" dataKey="wash" stroke="#3B82F6" strokeWidth={2} fill="url(#washGrad)" dot={false} />
                <Area type="monotone" dataKey="polish" stroke="#F59E0B" strokeWidth={2} fill="url(#polishGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-blue-500 rounded" />
              <span className="text-[10px] font-bold text-slate-400">Wash</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-amber-400 rounded" />
              <span className="text-[10px] font-bold text-slate-400">Polish</span>
            </div>
          </div>
        </div>

        {/* ── Activity Feed ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-black text-slate-900">รายการวันนี้</h2>
            <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Live
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-white rounded-[22px] animate-pulse border border-slate-100" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="bg-white rounded-[24px] p-12 text-center border border-slate-100">
              <div className="text-4xl mb-3 opacity-20 grayscale">📂</div>
              <p className="text-slate-400 font-bold text-sm">ยังไม่มีรายการวันนี้</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {records.map(r => <RecordCard key={r.id} record={r} />)}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}