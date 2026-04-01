'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Record } from '@/types'
import RecordCard from '@/components/RecordCard'
import { exportToCSV } from '@/lib/export'
import EditModal from '@/components/EditModal' 

type FilterType = 'all' | 'wash' | 'polish'

export default function HistoryPage() {
  const [records, setRecords] = useState<Record[]>([])
  const [search, setSearch] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)

  const [yesterdayStats, setYesterdayStats] = useState({ revenue: 0, count: 0 })
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const dynamicYears = Array.from({ length: 16 }, (_, i) => {
    const startYear = new Date().getFullYear() - 5;
    return startYear + i;
  })

  async function fetchYesterdayStats() {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const start = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString()
    const end = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString()

    const { data } = await supabase
      .from('records')
      .select('price')
      .gte('created_at', start)
      .lte('created_at', end)

    if (data) {
      const revenue = data.reduce((sum, r) => sum + r.price, 0)
      setYesterdayStats({ revenue, count: data.length })
    }
  }

  async function fetchYearlyData() {
    setLoading(true)
    const startOfYear = new Date(selectedYear, 0, 1).toISOString()
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString()

    const { data } = await supabase
      .from('records')
      .select('*')
      .gte('created_at', startOfYear)
      .lte('created_at', endOfYear)
      .order('created_at', { ascending: false })

    setRecords(data ?? [])
    setLoading(false)
  }

  useEffect(() => { 
    fetchYearlyData()
    fetchYesterdayStats()
  }, [selectedYear])

  const todayDateStr = new Date().toDateString()
  const todayRecords = records.filter(r => new Date(r.created_at).toDateString() === todayDateStr)
  const todayRevenue = todayRecords.reduce((s, r) => s + r.price, 0)
  const combinedRevenue = todayRevenue + yesterdayStats.revenue
  const combinedCount = todayRecords.length + yesterdayStats.count

  async function handleDelete(id: string) {
    const { error } = await supabase.from('records').delete().eq('id', id)
    if (error) alert(error.message)
    else { setIsModalOpen(false); fetchYearlyData(); fetchYesterdayStats(); }
  }

  async function handleSave(updatedFields: any) {
    if (!selectedRecord) return
    const { error } = await supabase
      .from('records')
      .update({ plate: updatedFields.plate, price: updatedFields.price, services: updatedFields.services })
      .eq('id', selectedRecord.id)

    if (error) alert(error.message)
    else { setIsModalOpen(false); fetchYearlyData(); fetchYesterdayStats(); }
  }

  const filtered = records.filter(r => {
    const matchSearch = r.plate.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || r.type === filterType
    const matchMonth = selectedMonth === null || new Date(r.created_at).getMonth() === selectedMonth
    let matchDateRange = true
    if (dateFrom) matchDateRange = matchDateRange && new Date(r.created_at) >= new Date(dateFrom)
    if (dateTo) matchDateRange = matchDateRange && new Date(r.created_at) <= new Date(dateTo + 'T23:59:59')
    return matchSearch && matchType && matchMonth && matchDateRange
  })

  const grouped = filtered.reduce((acc, r) => {
    const date = new Date(r.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(r)
    return acc
  }, {} as { [key: string]: Record[] })

  const monthlySummary = Array.from({ length: 12 }, (_, i) => {
    const monthRecs = records.filter(r => new Date(r.created_at).getMonth() === i)
    return {
      month: i,
      label: new Date(selectedYear, i, 1).toLocaleDateString('th-TH', { month: 'short' }),
      wash: monthRecs.filter(r => r.type === 'wash').length,
      polish: monthRecs.filter(r => r.type === 'polish').length,
      total: monthRecs.reduce((s, r) => s + r.price, 0),
    }
  }).filter(m => m.total > 0 || m.wash > 0)

  return (
    <div className="relative w-full h-auto min-h-screen bg-[#F4F6F9] overflow-y-visible block">
      
      {/* --- Sticky Header: ปรับให้ Compact และโชว์การ์ดยอดรวมค้างไว้ --- */}
      <div className="sticky top-0 z-30 bg-[#F4F6F9]/80 backdrop-blur-xl border-b border-slate-200/50 px-4 pt-6 pb-3">
        <div className="max-w-2xl mx-auto">
          
          {/* Header Row: Archive + Year Select */}
          <div className="flex items-center justify-between mb-3 px-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight font-sarabun">Archive</h1>
            <div className="relative">
              <select 
                value={selectedYear} 
                onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setSelectedMonth(null); }}
                className="appearance-none bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 text-[10px] font-black text-slate-900 shadow-sm outline-none cursor-pointer font-sarabun"
              >
                {dynamicYears.map(y => <option key={y} value={y}>พ.ศ. {y + 543}</option>)}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[8px]">▼</div>
            </div>
          </div>

          {/* 📍 บัตรสรุปยอด: ย้ายเข้ามาอยู่ใน Sticky และปรับให้ Compact (โชว์ค้างตลอด) */}
          <div className="relative rounded-[20px] overflow-hidden shadow-lg shadow-blue-900/10 p-3 bg-slate-900 mb-3 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[8px] font-black uppercase text-slate-500 font-sarabun tracking-wider">รายได้ปี {selectedYear + 543}</span>
                <span className="text-lg font-black text-blue-400 tracking-tight font-sarabun">฿{records.reduce((s, r) => s + r.price, 0).toLocaleString()}</span>
              </div>
              <button 
                onClick={() => exportToCSV(records, `Summary-${selectedYear}`)}
                className="bg-white/10 p-1.5 rounded-lg text-[8px] font-black text-white/80 uppercase font-sarabun active:scale-90 transition-all"
              >
                📥 CSV
              </button>
            </div>
            
            {/* Slim Summary Bar */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[7px] font-black text-blue-300/60 uppercase font-sarabun">2 วันล่าสุด:</span>
                <span className="text-xs font-black text-white font-sarabun">฿{combinedRevenue.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[7px] font-black text-slate-500 uppercase font-sarabun">รวม:</span>
                <span className="text-xs font-black text-white font-sarabun">{combinedCount} <span className="text-[8px] opacity-40">คัน</span></span>
              </div>
            </div>
          </div>

          {/* Search Bar: Compact Version */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="ค้นหาทะเบียนรถ..."
              className="w-full pl-9 pr-4 py-2 bg-white/70 border border-slate-100 rounded-xl text-xs font-semibold outline-none shadow-sm focus:bg-white transition-all font-sarabun" 
            />
          </div>
        </div>
      </div>

      {/* --- ส่วนเนื้อหาที่เลื่อนได้ --- */}
      <div className="px-5 pt-5 pb-[450px] max-w-2xl mx-auto block overflow-visible">
        
        {/* Filter Wash/Polish + Date Picker: ปล่อยให้เลื่อนหายไปได้เพื่อเพิ่มพื้นที่ดูรถ */}
        <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar py-1">
          {(['all', 'wash', 'polish'] as FilterType[]).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all border whitespace-nowrap font-sarabun ${filterType === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>
              {t === 'all' ? 'ทั้งหมด' : t === 'wash' ? '🚿 Wash' : '✨ Polish'}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 font-sarabun outline-none" />
          <span className="text-slate-300 self-center text-[10px]">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 font-sarabun outline-none" />
        </div>

        {/* Record List */}
        {loading ? (
          <div className="space-y-4 pt-5">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-[28px] animate-pulse" />)}
          </div>
        ) : (
          Object.entries(grouped).map(([date, recs]) => (
            <div key={date} className="mb-8">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-black text-slate-700 font-sarabun uppercase">{date}</span>
                <span className="text-[10px] font-black text-blue-600">฿{recs.reduce((s, r) => s + r.price, 0).toLocaleString()}</span>
              </div>
              <div className="grid gap-2.5">
                {recs.map(r => (
                  <div key={r.id} onClick={() => { setSelectedRecord(r); setIsModalOpen(true); }} className="cursor-pointer active:scale-95 transition-transform">
                    <RecordCard record={r} />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <EditModal record={selectedRecord} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} onDelete={handleDelete} />
    </div>
  )
}