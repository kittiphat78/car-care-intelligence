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
      {/* Top Header - Desktop Friendly */}
      <div className="max-w-5xl mx-auto">
        <div className="px-6 pt-12 pb-8 flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Business Intelligence</p>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Overview</h1>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            🔄
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col lg:flex-row gap-8 px-6">
          
          {/* Left Column: Stat Cards */}
          <div className="flex-1 space-y-6">
            <div className="bg-slate-950 rounded-[40px] p-10 text-white relative overflow-hidden shadow-[0_30px_60px_-15px_rgba(15,23,42,0.3)]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full -mr-20 -mt-20 blur-[80px]"></div>
              
              <div className="relative z-10">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Net Revenue</p>
                <div className="mt-3 flex items-center gap-4">
                  <span className="text-6xl font-black tracking-tight leading-none">฿{todayIncome.toLocaleString()}</span>
                  {diff !== null && (
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black shadow-lg shadow-black/20
                      ${diff >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                      {diff >= 0 ? '↗' : '↘'} {Math.abs(diff)}%
                    </div>
                  )}
                </div>
                <p className="text-slate-500 text-[11px] font-medium mt-4 uppercase tracking-wider">Updated just now</p>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4 relative z-10 border-t border-white/5 pt-8">
                <div className="bg-white/5 rounded-3xl p-5 hover:bg-white/10 transition-colors">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Wash Services</p>
                  <p className="text-3xl font-black tracking-tight">{records.filter(r => r.type === 'wash').length} <span className="text-xs font-medium text-slate-500 uppercase">Vehicles</span></p>
                </div>
                <div className="bg-white/5 rounded-3xl p-5 hover:bg-white/10 transition-colors">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Polishing</p>
                  <p className="text-3xl font-black tracking-tight">{records.filter(r => r.type === 'polish').length} <span className="text-xs font-medium text-slate-500 uppercase">Units</span></p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[30px] p-5 shadow-sm border border-slate-100">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">Revenue Breakdown</h3>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today</span>
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 8, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }} />
                    <Tooltip formatter={(value: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value)} />
                    <Legend verticalAlign="top" height={24} />
                    <Bar dataKey="revenue" name="Income (THB)" fill="#2563EB" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="count" name="Jobs" fill="#4F46E5" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column: Recent Activity */}
          <div className="flex-1 lg:max-w-md">
            <div className="flex justify-between items-end mb-6 px-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Recent Activity</h2>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">Live Feed</span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-20 bg-slate-50 rounded-[30px] animate-pulse"></div>
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="bg-slate-50 rounded-[40px] p-12 text-center border border-slate-100">
                <div className="text-4xl mb-4 grayscale">☁️</div>
                <p className="text-slate-400 font-bold text-sm">No transactions recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-4 pb-24">
                {records.map(r => <RecordCard key={r.id} record={r} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}