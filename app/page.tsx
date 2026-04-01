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
    <div className="min-h-screen bg-[#F4F6F9] page-transition">
      <div className="max-w-2xl mx-auto pb-48 px-5 font-sarabun">

        {/* --- Header --- */}
        <div className="pt-12 pb-6 flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{todayLabel}</p>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">ภาพรวมวันนี้</h1>
          </div>
          <button 
            onClick={fetchData} 
            className="group relative w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center active:scale-90 transition-all shadow-sm hover:border-blue-500"
          >
            <svg className={`w-6 h-6 text-blue-600 relative z-10 transition-transform duration-500 ${loading ? 'animate-spin' : 'group-active:rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>

        {/* --- Hero Card (ปรับกลับตามรูปภาพ image_abc0e7) --- */}
        <div className="relative rounded-[32px] overflow-hidden mb-6 shadow-xl shadow-slate-900/10 bg-[#0F172A] p-7 border border-white/5">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-2">รายได้รวมวันนี้</p>
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg ${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {isUp ? '▲' : '▼'} {diffPct !== null ? `${Math.abs(diffPct)}%` : '0%'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">คันวันนี้</p>
                <p className="text-2xl font-black text-white">{todayCount}</p>
              </div>
            </div>

            {/* Grid 2 Column (ล้างรถ / ขัดสี) - คืนค่าความชัดเจนของตัวเลขสีขาว/ฟ้า */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🧼</span>
                  <p className="text-sm font-bold text-slate-400">ล้างรถ</p>
                </div>
                <p className="text-xl font-black text-white">฿{todayWashIncome.toLocaleString()}</p>
              </div>
              <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">✨</span>
                  <p className="text-sm font-bold text-slate-400">ขัดสี</p>
                </div>
                <p className="text-xl font-black text-blue-400">฿{todayPolishIncome.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* --- ยอดสะสม --- */}
        <div className="bg-white rounded-[24px] border border-slate-100 p-6 mb-4 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">รายได้สะสมตั้งแต่เปิดร้าน</p>
          <p className="text-2xl font-black text-slate-900 tracking-tight mb-4">฿{grandTotal.toLocaleString()}</p>
          <div className="h-2.5 rounded-full overflow-hidden bg-slate-100 flex">
            <div className="bg-blue-500 transition-all duration-1000" style={{ width: grandTotal > 0 ? `${(totalWashIncome/grandTotal)*100}%` : '0%' }} />
            <div className="bg-amber-400 transition-all duration-1000" style={{ width: grandTotal > 0 ? `${(totalPolishIncome/grandTotal)*100}%` : '0%' }} />
          </div>
        </div>

        {/* --- กราฟ --- */}
        <div className="bg-white rounded-[24px] border border-slate-100 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-slate-900 uppercase">สถิติรายได้</h3>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {(['week', 'month'] as ChartMode[]).map(m => (
                <button key={m} onClick={() => setChartMode(m)} className={`px-3 py-1.5 rounded-md text-[9px] font-black transition-all ${chartMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                  {m === 'week' ? '7 วัน' : '30 วัน'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} dy={5} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: 800 }} />
                <Area type="monotone" dataKey="wash" stroke="#3B82F6" strokeWidth={3} fillOpacity={0.1} fill="#3B82F6" />
                <Area type="monotone" dataKey="polish" stroke="#F59E0B" strokeWidth={3} fillOpacity={0.1} fill="#F59E0B" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- รายการวันนี้ --- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2 mb-2">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">รายการวันนี้</h2>
            <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              สดตอนนี้
            </div>
          </div>
          {loading ? (
            <div className="h-24 bg-white rounded-[24px] animate-pulse border border-slate-100" />
          ) : records.length === 0 ? (
            <div className="bg-white rounded-[24px] p-12 text-center border border-slate-100 text-slate-400 text-sm font-bold shadow-inner">ยังไม่มีรายการสำหรับวันนี้</div>
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