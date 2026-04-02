'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { supabase } from '@/lib/supabase'
import { Record, Expense } from '@/types'
import RecordCard from '@/components/RecordCard'
import { useRouter } from 'next/navigation'

type ChartMode = 'week' | 'month'

export default function Dashboard() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [records, setRecords] = useState<Record[]>([])
  const [allRecords, setAllRecords] = useState<Record[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [yesterdayRecords, setYesterdayRecords] = useState<Record[]>([])
  const [chartMode, setChartMode] = useState<ChartMode>('week')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserEmail(user.email ?? '')

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const thirtyDaysAgo = new Date(todayStart); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [todayRes, yesterdayRes, allRes, expenseRes] = await Promise.all([
      supabase.from('records').select('*').gte('created_at', todayStart.toISOString()).order('created_at', { ascending: false }),
      supabase.from('records').select('*').gte('created_at', yesterdayStart.toISOString()).lt('created_at', todayStart.toISOString()),
      supabase.from('records').select('*').gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: true }),
      supabase.from('expenses').select('*').gte('created_at', todayStart.toISOString()),
    ])

    setRecords(todayRes.data ?? [])
    setYesterdayRecords(yesterdayRes.data ?? [])
    setAllRecords(allRes.data ?? [])
    setExpenses(expenseRes.data ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchData()
    const channel = supabase.channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData])

  const todayTotalIncome = records.reduce((s, r) => s + r.price, 0)
  const todayPaid        = records.filter(r => r.payment_status === 'paid').reduce((s, r) => s + r.price, 0)
  const todayUnpaid      = records.filter(r => r.payment_status === 'unpaid').reduce((s, r) => s + r.price, 0)
  const todayExpense     = expenses.reduce((s, e) => s + e.amount, 0)
  const netProfit        = todayPaid - todayExpense
  const washCount        = records.filter(r => r.type === 'wash').length
  const polishCount      = records.filter(r => r.type === 'polish').length
  const yesterdayIncome  = yesterdayRecords.reduce((s, r) => s + r.price, 0)
  const diffAmount       = todayTotalIncome - yesterdayIncome
  const diffPct          = yesterdayIncome > 0 ? Math.round((diffAmount / yesterdayIncome) * 100) : 0
  const isUp             = diffAmount >= 0

  const chartData = useMemo(() => {
    const now = new Date()
    const days = chartMode === 'week' ? 7 : 30
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (days - 1 - i)); d.setHours(0, 0, 0, 0)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      const dayRecs = allRecords.filter(r => { const t = new Date(r.created_at); return t >= d && t < next })
      return {
        label: chartMode === 'week'
          ? d.toLocaleDateString('th-TH', { weekday: 'short' })
          : d.toLocaleDateString('th-TH', { day: 'numeric' }),
        income: dayRecs.reduce((s, r) => s + r.price, 0),
      }
    })
  }, [allRecords, chartMode])

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center animate-pulse">
        <span className="text-white text-lg">🚗</span>
      </div>
      <p className="text-slate-400 text-sm font-bold animate-pulse">กำลังโหลด...</p>
    </div>
  )

  return (
    <div className="min-h-dvh pb-32 text-slate-900">
      <div className="max-w-2xl mx-auto px-4">

        {/* ── Header ── */}
        <div className="pt-8 pb-2 flex justify-between items-center animate-fade-up">
          <div className="flex items-center gap-2.5 bg-white px-3 py-2 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center text-white text-xs shrink-0">
              👤
            </div>
            <p className="text-xs font-black text-slate-800">{userEmail.split('@')[0] || '...'}</p>
          </div>
          <button
            onClick={() => { supabase.auth.signOut(); router.push('/login') }}
            className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 active:scale-95 transition-all"
          >
            ออกจากระบบ
          </button>
        </div>

        {/* ── Net Profit Hero Card ── */}
        <div className="mt-5 mb-4 animate-fade-up" style={{ animationDelay: '40ms' }}>
          {/* เพิ่ม Border สีขาวจางๆ เพื่อช่วยตัดขอบ Card */}
          <div className="relative bg-[#0D1117] rounded-[32px] px-7 py-8 text-center overflow-hidden shadow-[0_24px_48px_rgba(0,0,0,0.4)] border border-white/10">

            {/* Decorative gradient blobs */}
            <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-blue-500/15 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

            {/* บังคับสีขาว 100% ด้วย Inline Style */}
            <p 
              style={{ color: '#FFFFFF', opacity: 1 }}
              className="text-[12px] font-black uppercase tracking-[0.2em] mb-2 drop-shadow-sm"
            >
              เงินสดที่เข้ากระเป๋าจริงวันนี้
            </p>

            <h2 
              style={{ color: '#FFFFFF' }}
              className="text-[3.5rem] font-black tracking-tight leading-none mb-5 drop-shadow-lg"
            >
              ฿{netProfit.toLocaleString()}
            </h2>

            <div className="flex items-center justify-center gap-2">
              <div className={`
                inline-flex items-center gap-1.5 px-4 py-1.5 rounded-2xl text-xs font-black
                ${isUp ? 'bg-emerald-500/20 !text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 !text-rose-400 border border-rose-500/30'}
              `}>
                <span>{isUp ? '▲' : '▼'}</span>
                <span>{Math.abs(diffPct)}%</span>
              </div>
              <span 
                style={{ color: '#FFFFFF', opacity: 0.9 }}
                className="text-[11px] font-bold uppercase tracking-wide"
              >
                เทียบจากเมื่อวาน
              </span>
            </div>
          </div>
        </div>

        {/* ── Unpaid Banner ── */}
        {todayUnpaid > 0 && (
          <div className="mb-4 animate-scale-in bg-rose-50 border-2 border-rose-200 rounded-[22px] px-5 py-4 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest mb-0.5">ยอดค้างชำระ</p>
              <p className="text-2xl font-black text-rose-700 leading-none">฿{todayUnpaid.toLocaleString()}</p>
            </div>
            <div className="bg-rose-600 text-white px-3.5 py-1.5 rounded-full text-[10px] font-black shadow-md">
              ⏳ ค้างจ่าย
            </div>
          </div>
        )}

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 gap-3 mb-3 stagger animate-fade-up" style={{ animationDelay: '80ms' }}>
          <div className="bg-white p-5 rounded-[22px] border-2 border-slate-100 shadow-sm text-center">
            <p className="text-[11px] font-black text-blue-700 uppercase tracking-widest mb-2">ล้างรถทั่วไป 🧼</p>
            <p className="text-3xl font-black text-slate-900 leading-none">{washCount}</p>
            <p className="text-[12px] text-slate-700 font-bold mt-2 uppercase">คัน</p>
          </div>
          <div className="bg-white p-5 rounded-[22px] border-2 border-slate-100 shadow-sm text-center">
            <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-2">งานขัดสี ✨</p>
            <p className="text-3xl font-black text-slate-900 leading-none">{polishCount}</p>
            <p className="text-[12px] text-slate-700 font-bold mt-2 uppercase">คัน</p>
          </div>
        </div>

        {/* ── Income / Expense ── */}
        <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
          <div className="bg-emerald-50 p-5 rounded-[22px] border-2 border-emerald-100 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <p className="text-[11px] font-black text-emerald-800 uppercase tracking-widest">รายรับ</p>
            </div>
            <p className="text-2xl font-black text-slate-900 leading-none">฿{todayTotalIncome.toLocaleString()}</p>
          </div>
          <div className="bg-rose-50 p-5 rounded-[22px] border-2 border-rose-100 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              <p className="text-[11px] font-black text-rose-800 uppercase tracking-widest">รายจ่าย</p>
            </div>
            <p className="text-2xl font-black text-slate-900 leading-none">฿{todayExpense.toLocaleString()}</p>
          </div>
        </div>

        {/* ── Chart ── */}
        <div className="bg-white rounded-[26px] p-6 mb-6 border-2 border-slate-100 shadow-md animate-fade-up" style={{ animationDelay: '160ms' }}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">แนวโน้มรายได้</h3>
            <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1">
              <button
                onClick={() => setChartMode('week')}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${chartMode === 'week' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >7 วัน</button>
              <button
                onClick={() => setChartMode('month')}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${chartMode === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >30 วัน</button>
            </div>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 800 }}
                  dy={10}
                />
                <Tooltip
                  formatter={(value: any) => [`฿${Number(value || 0).toLocaleString()}`, 'รายได้']}
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '10px 14px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#2563EB"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorInc)"
                  dot={false}
                  activeDot={{ r: 6, fill: '#2563EB', stroke: '#FFF', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Record List ── */}
        <div className="space-y-4 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="flex justify-between items-center px-1">
            <p className="font-black text-[12px] uppercase tracking-[0.2em] text-slate-800">รายการรถวันนี้</p>
            <button
              onClick={fetchData}
              className="text-[11px] font-black text-blue-700 bg-blue-100/50 px-4 py-2 rounded-xl border border-blue-200 active:scale-95 transition-all shadow-sm"
            >
              🔄 รีเฟรชข้อมูล
            </button>
          </div>

          {records.length === 0 ? (
            <div className="bg-white p-16 rounded-[30px] text-center border-2 border-dashed border-slate-200">
              <p className="text-5xl mb-4 opacity-50">🚗</p>
              <p className="text-slate-800 font-black text-base uppercase tracking-tight">ยังไม่มีงานเข้ามา</p>
              <p className="text-slate-500 text-sm font-bold mt-1">กดปุ่มบวกเพื่อเพิ่มงานใหม่</p>
            </div>
          ) : (
            <div className="grid gap-3 stagger">
              {records.map(r => <RecordCard key={r.id} record={r} />)}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}