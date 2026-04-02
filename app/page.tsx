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
    if (!user) { router.push('/login'); return }
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

  useEffect(() => {
    fetchData()
    const channel = supabase.channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // --- 🧮 คำนวณรายรับ (แยก จ่ายสด / ค้างชำระ) ---
  const todayTotalIncome = records.reduce((s, r) => s + r.price, 0)
  const todayPaid = records.filter(r => r.payment_status === 'paid').reduce((s, r) => s + r.price, 0)
  const todayUnpaid = records.filter(r => r.payment_status === 'unpaid').reduce((s, r) => s + r.price, 0)
  
  // --- 💸 คำนวณรายจ่าย ---
  const todayExpense = expenses.reduce((s, e) => s + e.amount, 0)
  const netProfit = todayPaid - todayExpense // กำไรสุทธิคิดจาก "เงินที่ได้จริง"

  // --- 📈 เปรียบเทียบเมื่อวาน ---
  const yesterdayIncome = yesterdayRecords.reduce((s, r) => s + r.price, 0)
  const diffAmount = todayTotalIncome - yesterdayIncome
  const diffPct = yesterdayIncome > 0 ? Math.round((diffAmount / yesterdayIncome) * 100) : 0
  const isUp = diffAmount >= 0

  // --- 🚗 แยกสถิติรถ ---
  const washCount = records.filter(r => r.type === 'wash').length
  const polishCount = records.filter(r => r.type === 'polish').length

  const chartData = useMemo(() => {
    const now = new Date(); const days = chartMode === 'week' ? 7 : 30; const result: any[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      const dayRecs = allRecords.filter(r => { const t = new Date(r.created_at); return t >= d && t < next })
      result.push({
        label: chartMode === 'week' ? d.toLocaleDateString('th-TH', { weekday: 'short' }) : d.toLocaleDateString('th-TH', { day: 'numeric' }),
        income: dayRecs.reduce((s, r) => s + r.price, 0),
      })
    }
    return result
  }, [allRecords, chartMode])

  return (
    <div className="min-h-screen bg-[#F0F2F8] pb-32 font-sarabun text-slate-900">
      <div className="max-w-2xl mx-auto px-5">
        
        {/* --- Header User --- */}
        <div className="pt-8 flex justify-between items-center mb-6">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white text-xs">👤</div>
            <p className="text-xs font-black">{user?.email?.split('@')[0] || '...'}</p>
          </div>
          <button onClick={() => { supabase.auth.signOut(); router.push('/login'); }} className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-4 py-2 rounded-xl">ออกจากระบบ</button>
        </div>

        {/* --- 💰 Main Net Profit Card (เงินสดสุทธิวันนี้) --- */}
        <div className="bg-slate-900 rounded-[35px] p-8 text-center text-white mb-6 shadow-2xl relative overflow-hidden">
            <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-[0.2em] mb-2">เงินสดที่เข้ากระเป๋าจริงวันนี้</p>
            <h2 className="text-5xl font-black mb-4">฿{netProfit.toLocaleString()}</h2>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl">
                <span className={isUp ? 'text-emerald-400' : 'text-rose-400'}>{isUp ? '▲' : '▼'} {Math.abs(diffPct)}%</span>
                <span className="text-slate-400 text-[10px] font-bold uppercase">เทียบจากเมื่อวาน</span>
            </div>
        </div>

        {/* --- 📊 Unpaid Summary (ยอดค้างชำระ) --- */}
        {todayUnpaid > 0 && (
          <div className="bg-rose-50 border-2 border-rose-100 rounded-[28px] p-5 mb-6 flex justify-between items-center animate-pulse">
            <div>
              <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest">ยอดค้างชำระ (เต็นท์/ลูกค้า)</p>
              <p className="text-2xl font-black text-rose-700">฿{todayUnpaid.toLocaleString()}</p>
            </div>
            <div className="bg-rose-600 text-white px-3 py-1 rounded-full text-[10px] font-black">⏳ ค้างจ่าย</div>
          </div>
        )}

        {/* --- 🧼 Statistics Grid --- */}
        <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm text-center">
                <p className="text-[10px] font-black text-blue-600 uppercase mb-1">ล้างรถทั่วไป</p>
                <p className="text-2xl font-black">{washCount} <span className="text-xs text-slate-400">คัน</span></p>
            </div>
            <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm text-center">
                <p className="text-[10px] font-black text-amber-500 uppercase mb-1">งานขัดสี / เต็นท์</p>
                <p className="text-2xl font-black">{polishCount} <span className="text-xs text-slate-400">คัน</span></p>
            </div>
        </div>

        {/* --- 💸 Income/Expense Details --- */}
        <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-emerald-50/50 p-5 rounded-[28px] border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">รายรับทั้งหมด</p>
                <p className="text-xl font-black">฿{todayTotalIncome.toLocaleString()}</p>
            </div>
            <div className="bg-rose-50/50 p-5 rounded-[28px] border border-rose-100">
                <p className="text-[10px] font-black text-rose-600 uppercase mb-1">รายจ่ายวันนี้</p>
                <p className="text-xl font-black">฿{todayExpense.toLocaleString()}</p>
            </div>
        </div>

        {/* --- 📈 Trend Chart --- */}
        <div className="bg-white rounded-[30px] p-6 mb-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-sm">แนวโน้มรายได้</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setChartMode('week')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold ${chartMode === 'week' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>7 วัน</button>
                <button onClick={() => setChartMode('month')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold ${chartMode === 'month' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>30 วัน</button>
            </div>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10}} dy={10} />
                <Tooltip />
                <Area type="monotone" dataKey="income" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- List --- */}
        <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">รายการรถวันนี้</h3>
              <button onClick={fetchData} className="text-[10px] font-black text-blue-600">🔄 รีเฟรช</button>
            </div>
            {records.length === 0 ? (
                <div className="bg-white p-12 rounded-[30px] text-center border-2 border-dashed border-slate-100">
                    <p className="text-slate-300 font-bold text-sm">ยังไม่มีงานเข้ามา</p>
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