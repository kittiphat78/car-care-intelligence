'use client'
import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '@/lib/supabase'
import { Record } from '@/types'
import RecordCard from '@/components/RecordCard'

export default function Dashboard() {
  const [records, setRecords] = useState<Record[]>([])
  const [yesterday, setYesterday] = useState<Record[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1)

    const [todayRes, yesterdayRes] = await Promise.all([
      supabase.from('records').select('*').gte('created_at', todayStart.toISOString()).order('created_at', { ascending: false }),
      supabase.from('records').select('*').gte('created_at', yesterdayStart.toISOString()).lt('created_at', todayStart.toISOString()),
    ])
    setRecords(todayRes.data ?? []); setYesterday(yesterdayRes.data ?? []); setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const channel = supabase.channel('realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const todayIncome = records.reduce((s, r) => s + r.price, 0)
  const yestIncome = yesterday.reduce((s, r) => s + r.price, 0)
  const diff = yestIncome === 0 ? null : Math.round(((todayIncome - yestIncome) / yestIncome) * 100)

  const chartData = useMemo(() => {
    const washTotal = records.filter(r => r.type === 'wash').reduce((s, r) => s + r.price, 0)
    const polishTotal = records.filter(r => r.type === 'polish').reduce((s, r) => s + r.price, 0)
    const washCount = records.filter(r => r.type === 'wash').length
    const polishCount = records.filter(r => r.type === 'polish').length

    return [
      { name: 'Wash', count: washCount, revenue: washTotal },
      { name: 'Polish', count: polishCount, revenue: polishTotal },
    ]
  }, [records])

  return (
    <div className="min-h-screen bg-[#FDFDFD] page-transition">
      <div className="max-w-6xl mx-auto pb-10">
        {/* Header */}
        <div className="px-6 pt-16 pb-10 flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mb-1">Business Intelligence</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Overview</h1>
          </div>
          <button 
            onClick={fetchData}
            className="w-14 h-14 rounded-[22px] bg-white shadow-sm border border-slate-100 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
          >
            <span className="text-xl">🔄</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 px-6">
          
          {/* Left Column */}
          <div className="flex-1 space-y-10">
            {/* Revenue Card */}
            <div className="bg-slate-950 rounded-[45px] p-12 text-white relative overflow-hidden shadow-[0_40px_80px_-15px_rgba(15,23,42,0.3)]">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-20 -mt-20 blur-[100px]"></div>
              
              <div className="relative z-10">
                <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em]">Net Revenue</p>
                <div className="mt-5 flex items-center gap-5">
                  <span className="text-7xl font-black tracking-tighter leading-none">฿{todayIncome.toLocaleString()}</span>
                  {diff !== null && (
                    <div className={`px-4 py-2 rounded-2xl text-xs font-black shadow-lg
                      ${diff >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                      {diff >= 0 ? '▲' : '▼'} {Math.abs(diff)}%
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-12 grid grid-cols-2 gap-6 relative z-10 border-t border-white/5 pt-10">
                <div className="bg-white/5 rounded-[30px] p-6 border border-white/5">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Wash Services</p>
                  <p className="text-4xl font-black tracking-tight">{records.filter(r => r.type === 'wash').length} <span className="text-xs font-medium text-slate-600 uppercase ml-1">Cars</span></p>
                </div>
                <div className="bg-white/5 rounded-[30px] p-6 border border-white/5">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Polishing</p>
                  <p className="text-4xl font-black tracking-tight">{records.filter(r => r.type === 'polish').length} <span className="text-xs font-medium text-slate-600 uppercase ml-1">Units</span></p>
                </div>
              </div>
            </div>

            {/* Chart Card */}
            <div className="bg-white rounded-[40px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-slate-50">
              <div className="mb-8 flex items-center justify-between px-2">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Revenue Breakdown</h3>
                <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-widest">Today</span>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 800 }} 
                      dy={10}
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: '#F8FAFC' }}
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', padding: '16px' }}
                      itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                      formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, '']}
                    />
                    <Bar dataKey="revenue" name="Revenue" fill="#0F172A" radius={[12, 12, 12, 12]} barSize={40} />
                    <Bar dataKey="count" name="Jobs" fill="#3B82F6" radius={[12, 12, 12, 12]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex-1 lg:max-w-md space-y-8">
            <div className="flex justify-between items-end px-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Activity</h2>
              <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase tracking-widest">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                Live Feed
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-24 bg-slate-50 rounded-[35px] animate-pulse"></div>
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="bg-slate-50 rounded-[45px] p-16 text-center border border-slate-100">
                <div className="text-5xl mb-6 grayscale opacity-20">📂</div>
                <p className="text-slate-400 font-bold text-sm">Waiting for transactions...</p>
              </div>
            ) : (
              <div className="space-y-4 pb-20">
                {records.map(r => <RecordCard key={r.id} record={r} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}