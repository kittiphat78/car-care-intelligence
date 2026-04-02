'use client'
import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { supabase } from '@/lib/supabase'
import { Record, Expense } from '@/types'
import RecordCard from '@/components/RecordCard'
import { useRouter } from 'next/navigation'

type ChartMode = 'week' | 'month'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [records, setRecords] = useState<Record[]>([])
  const [allRecords, setAllRecords] = useState<Record[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [yesterdayRecords, setYesterdayRecords] = useState<Record[]>([])
  const [chartMode, setChartMode] = useState<ChartMode>('week')
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1)

    const [todayRes, yesterdayRes, allRes, expenseRes] = await Promise.all([
      supabase.from('records').select('*').gte('created_at', todayStart.toISOString()).order('created_at', { ascending: false }),
      supabase.from('records').select('*').gte('created_at', yesterdayStart.toISOString()).lt('created_at', todayStart.toISOString()),
      supabase.from('records').select('*').order('created_at', { ascending: true }),
      supabase.from('expenses').select('*').gte('created_at', todayStart.toISOString())
    ])

    setRecords(todayRes.data ?? [])
    setYesterdayRecords(yesterdayRes.data ?? [])
    setAllRecords(allRes.data ?? [])
    setExpenses(expenseRes.data ?? [])
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  useEffect(() => {
    fetchData()
    // ติดตาม Realtime ทั้ง 2 ตาราง
    const channel = supabase.channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // --- คำนวณรายรับ ---
  const todayIncome = records.reduce((s, r) => s + r.price, 0)
  const yesterdayIncome = yesterdayRecords.reduce((s, r) => s + r.price, 0)
  
  // --- คำนวณรายจ่าย ---
  const todayExpense = expenses.reduce((s, e) => s + e.amount, 0)
  
  // --- กำไรสุทธิวันนี้ ---
  const netProfit = todayIncome - todayExpense

  const diffAmount = todayIncome - yesterdayIncome
  const diffPct = yesterdayIncome > 0 ? Math.round((diffAmount / yesterdayIncome) * 100) : 0
  
  // ✅ กำหนดค่า isUp เพื่อแก้ปัญหา Runtime ReferenceError
  const isUp = diffAmount >= 0

  // --- กราฟ (รวมรายรับ) ---
  const chartData = useMemo(() => {
    const now = new Date()
    const days = chartMode === 'week' ? 7 : 30
    const result: any[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      const dayRecs = allRecords.filter(r => {
        const t = new Date(r.created_at)
        return t >= d && t < next
      })
      result.push({
        label: chartMode === 'week' ? d.toLocaleDateString('th-TH', { weekday: 'short' }) : d.toLocaleDateString('th-TH', { day: 'numeric' }),
        income: dayRecs.reduce((s, r) => s + r.price, 0),
      })
    }
    return result
  }, [allRecords, chartMode])

  return (
    <div className="min-h-screen bg-[#F0F2F8] pb-32 font-sarabun">
      <div className="max-w-2xl mx-auto px-5">

        {/* --- Top User Info & Logout --- */}
        <div className="pt-8 flex justify-between items-center bg-white/50 p-4 rounded-[24px] mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg">👤</div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">กำลังใช้งานโดย</p>
              <p className="text-sm font-black text-slate-900">{user?.email ? user.email.split('@')[0] : 'กำลังโหลด...'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-red-500 bg-red-50 px-4 py-2 rounded-xl active:scale-95 transition-all">ออกจากระบบ 🚪</button>
        </div>

        {/* --- Header --- */}
        <div className="py-6 flex justify-between items-end">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
            <h1 className="text-3xl font-black text-slate-900">สรุปบัญชีวันนี้</h1>
          </div>
          <button onClick={fetchData} className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center active:scale-90 transition-all ${loading ? 'animate-spin' : ''}`}>🔄</button>
        </div>

        {/* --- Main Net Profit Card (Hero) --- */}
        <div className="bg-slate-900 rounded-[35px] p-8 text-center text-white mb-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">กำไรสุทธิวันนี้ (หักรายจ่ายแล้ว)</p>
            <h2 className="text-5xl font-black mb-4">฿{netProfit.toLocaleString()}</h2>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/10">
                <span className={isUp ? 'text-emerald-400' : 'text-rose-400'}>{isUp ? '▲' : '▼'} {Math.abs(diffPct)}%</span>
                <span className="text-slate-400 text-[10px] font-bold uppercase">จากเมื่อวาน</span>
            </div>
        </div>

        {/* --- Income vs Expense Grid --- */}
        <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white p-6 rounded-[30px] border border-emerald-100 shadow-sm">
                <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">รายรับวันนี้ 🧼</p>
                <p className="text-2xl font-black text-slate-900">฿{todayIncome.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">{records.length} คัน</p>
            </div>
            <div className="bg-white p-6 rounded-[30px] border border-rose-100 shadow-sm">
                <p className="text-[10px] font-black text-rose-600 uppercase mb-2">รายจ่ายวันนี้ 💸</p>
                <p className="text-2xl font-black text-slate-900">฿{todayExpense.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">{expenses.length} รายการ</p>
            </div>
        </div>

        {/* --- Statistics Graph (Income Only) --- */}
        <div className="bg-white rounded-[30px] p-6 mb-8 border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-900 text-sm">แนวโน้มรายได้</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setChartMode('week')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${chartMode === 'week' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>7 วัน</button>
                <button onClick={() => setChartMode('month')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${chartMode === 'month' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>30 วัน</button>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10}} dy={10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="income" stroke="#3B82F6" strokeWidth={3} fill="url(#incomeGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- Recent Records --- */}
        <div className="space-y-4">
            <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs px-2">งานล่าสุดของวันนี้</h3>
            {records.length === 0 ? (
                <div className="bg-white p-10 rounded-[30px] text-center border border-dashed border-slate-300">
                    <p className="text-slate-400 font-bold">ยังไม่มีข้อมูลของวันนี้</p>
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