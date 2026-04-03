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
  const [userEmail, setUserEmail]           = useState('')
  const [records, setRecords]               = useState<Record[]>([])
  const [allRecords, setAllRecords]         = useState<Record[]>([])
  const [expenses, setExpenses]             = useState<Expense[]>([])
  const [yesterdayRecords, setYesterdayRecords] = useState<Record[]>([])
  const [chartMode, setChartMode]           = useState<ChartMode>('week')
  const [loading, setLoading]               = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserEmail(user.email ?? '')

    const todayStart     = new Date(); todayStart.setHours(0,0,0,0)
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate()-1)
    const thirtyDaysAgo  = new Date(todayStart); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-30)

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' },  fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData])

  const todayTotalIncome = records.reduce((s,r) => s + r.price, 0)
  const todayPaid        = records.filter(r => r.payment_status === 'paid').reduce((s,r) => s + r.price, 0)
  const todayUnpaid      = records.filter(r => r.payment_status === 'unpaid').reduce((s,r) => s + r.price, 0)
  const todayExpense     = expenses.reduce((s,e) => s + e.amount, 0)
  const netProfit        = todayPaid - todayExpense
  const washCount        = records.filter(r => r.type === 'wash').length
  const polishCount      = records.filter(r => r.type === 'polish').length
  const yesterdayIncome  = yesterdayRecords.reduce((s,r) => s + r.price, 0)
  const diffAmount       = todayTotalIncome - yesterdayIncome
  const diffPct          = yesterdayIncome > 0 ? Math.round((diffAmount / yesterdayIncome) * 100) : 0
  const isUp             = diffAmount >= 0

  const chartData = useMemo(() => {
    const now  = new Date()
    const days = chartMode === 'week' ? 7 : 30
    return Array.from({ length: days }, (_,i) => {
      const d = new Date(now); d.setDate(d.getDate() - (days-1-i)); d.setHours(0,0,0,0)
      const next = new Date(d); next.setDate(next.getDate()+1)
      const dayRecs = allRecords.filter(r => { const t = new Date(r.created_at); return t >= d && t < next })
      return {
        label: chartMode === 'week'
          ? d.toLocaleDateString('th-TH', { weekday: 'short' })
          : d.toLocaleDateString('th-TH', { day: 'numeric' }),
        income: dayRecs.reduce((s,r) => s + r.price, 0),
      }
    })
  }, [allRecords, chartMode])

  /* Loading */
  if (loading) return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-[var(--bg)]">
      <div className="w-10 h-10 border-2 border-[var(--border)] border-t-[var(--text-primary)] rounded-full spinner" />
      <p className="text-sm text-[var(--text-secondary)]">กำลังโหลด...</p>
    </div>
  )

  return (
    // ✅ FIX: ลบ pb-32 ออก — ClientLayout จัดการ pb-28 ให้แล้ว
    <div className="min-h-dvh px-4 pt-6 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between fade-up">
        <div>
          <p className="text-xs text-[var(--text-tertiary)] mb-0.5">สวัสดี,</p>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] leading-none">
            {userEmail.split('@')[0] || 'Admin'}
          </h2>
        </div>
        <button
          onClick={() => { supabase.auth.signOut(); router.push('/login') }}
          className="btn btn-ghost text-xs py-2 px-3"
        >
          ออกจากระบบ
        </button>
      </div>

      {/* ── Net Profit Hero ── */}
      <div className="card-dark p-5 fade-up delay-1">
        <p className="text-xs font-medium text-white/50 uppercase tracking-widest mb-3">
          กำไรสุทธิวันนี้
        </p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[2.75rem] font-bold tracking-tight leading-none text-white">
              ฿{netProfit.toLocaleString()}
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <span className={`
                inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full
                ${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}
              `}>
                {isUp ? '↑' : '↓'} {Math.abs(diffPct)}%
              </span>
              <span className="text-xs text-white/40">vs เมื่อวาน</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40 mb-1">รายรับรวม</p>
            <p className="text-lg font-semibold text-white">฿{todayTotalIncome.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* ── Unpaid Alert ── */}
      {todayUnpaid > 0 && (
        <div className="flex items-center justify-between p-4 rounded-[var(--radius-lg)] bg-[var(--red-light)] border border-red-100 fade-up delay-2">
          <div>
            <p className="text-xs font-semibold text-[var(--red)] uppercase tracking-wide mb-0.5">ค้างชำระ</p>
            <p className="text-xl font-bold text-[var(--red)]">฿{todayUnpaid.toLocaleString()}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 3v6M9 12.5v.5" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="9" r="7.5" stroke="#DC2626" strokeWidth="1.3"/>
            </svg>
          </div>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-2.5 fade-up delay-2">
        {/* Expense */}
        <div className="card p-3.5">
          <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">รายจ่าย</p>
          <p className="text-lg font-bold text-[var(--red)] leading-none">
            ฿{todayExpense.toLocaleString()}
          </p>
        </div>
        {/* Wash */}
        <div className="card p-3.5">
          <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">ล้างรถ</p>
          <div className="flex items-baseline gap-1">
            <p className="text-lg font-bold text-[var(--text-primary)] leading-none">{washCount}</p>
            <span className="text-xs text-[var(--text-tertiary)]">คัน</span>
          </div>
        </div>
        {/* Polish */}
        <div className="card p-3.5">
          <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">ขัดสี</p>
          <div className="flex items-baseline gap-1">
            <p className="text-lg font-bold text-[var(--text-primary)] leading-none">{polishCount}</p>
            <span className="text-xs text-[var(--text-tertiary)]">คัน</span>
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="card p-4 fade-up delay-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">แนวโน้มรายได้</h3>
          <div className="flex bg-[var(--surface-2)] p-1 rounded-[10px] gap-1">
            {(['week','month'] as ChartMode[]).map(m => (
              <button
                key={m}
                onClick={() => setChartMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  chartMode === m
                    ? 'bg-white text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-tertiary)]'
                }`}
              >
                {m === 'week' ? '7 วัน' : '30 วัน'}
              </button>
            ))}
          </div>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                axisLine={false} tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }}
                dy={8}
              />
              <Tooltip
                formatter={(v: any) => [`฿${Number(v||0).toLocaleString()}`, 'รายได้']}
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '8px 14px',
                }}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#2563EB"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#grad)"
                dot={false}
                activeDot={{ r: 5, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Record List ── */}
      <div className="fade-up delay-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">รายการวันนี้</h3>
            <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
              {records.length}
            </span>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-xs text-[var(--accent)] font-semibold hover:text-[var(--accent-hover)] transition-colors py-1"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M11 6.5A4.5 4.5 0 1 1 6.5 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M6.5 2l1.5 1.5L6.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            รีเฟรช
          </button>
        </div>

        {records.length === 0 ? (
          <div className="card p-10 text-center border-dashed">
            <p className="text-3xl mb-3 opacity-20">🚗</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">ยังไม่มีงานวันนี้</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">กด + เพื่อเพิ่มรายการใหม่</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {records.map(r => <RecordCard key={r.id} record={r} />)}
          </div>
        )}
      </div>

    </div>
  )
}