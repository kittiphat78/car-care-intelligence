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
      .update({ 
        plate: updatedFields.plate, 
        price: updatedFields.price, 
        services: updatedFields.services,
        customer_name: updatedFields.customer_name,
        payment_status: updatedFields.payment_status 
      })
      .eq('id', selectedRecord.id)

    if (error) alert(error.message)
    else { setIsModalOpen(false); fetchYearlyData(); fetchYesterdayStats(); }
  }

  // ✅ ฟังก์ชันอำนวยความสะดวก: กดรับเงินทันที
  async function handleMarkAsPaid(id: string) {
    const { error } = await supabase
      .from('records')
      .update({ payment_status: 'paid' })
      .eq('id', id)
    
    if (error) alert(error.message)
    else { fetchYearlyData(); }
  }

  const filtered = records.filter(r => {
    // ค้นหาได้ทั้งป้ายทะเบียน และ ชื่อเต็นท์รถ
    const matchSearch = r.plate.toLowerCase().includes(search.toLowerCase()) || 
                        (r.customer_name?.toLowerCase().includes(search.toLowerCase()))
    
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

  return (
    <div className="relative w-full h-auto min-h-screen bg-[#F4F6F9] overflow-y-visible block">
      
      {/* --- Sticky Header --- */}
      <div className="sticky top-0 z-30 bg-[#F4F6F9]/90 backdrop-blur-xl border-b border-slate-200/60 px-4 pt-6 pb-3">
        <div className="max-w-2xl mx-auto">
          
          {/* Header Row: Archive + Year Select */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-400 to-blue-600" />
              <h1 className="text-xl font-black text-slate-900 tracking-tight font-sarabun">Archive</h1>
            </div>
            <div className="relative">
              <select 
                value={selectedYear} 
                onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setSelectedMonth(null); }}
                className="appearance-none bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 text-[10px] font-black text-slate-900 shadow-sm outline-none cursor-pointer font-sarabun focus:border-blue-300 transition-colors"
              >
                {dynamicYears.map(y => <option key={y} value={y}>พ.ศ. {y + 543}</option>)}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[8px]">▼</div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="relative rounded-[20px] overflow-hidden shadow-lg shadow-blue-900/10 p-3 mb-3 border border-white/5"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
            
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-2 relative">
              <div className="flex items-baseline gap-2">
                <span className="text-[8px] font-black uppercase text-slate-500 font-sarabun tracking-wider">รายได้ปี {selectedYear + 543}</span>
                <span className="text-lg font-black text-blue-400 tracking-tight font-sarabun">
                  ฿{records.reduce((s, r) => s + r.price, 0).toLocaleString()}
                </span>
              </div>
              <button 
                onClick={() => exportToCSV(records, `Summary-${selectedYear}`)}
                className="bg-white/10 hover:bg-white/15 active:scale-90 px-2.5 py-1.5 rounded-lg text-[8px] font-black text-white/80 uppercase font-sarabun transition-all flex items-center gap-1"
              >
                <span>📥</span>
                <span>CSV</span>
              </button>
            </div>
            
            <div className="border-t border-white/[0.06] pt-2 flex items-center justify-between relative">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
                <span className="text-[7px] font-black text-blue-300/60 uppercase font-sarabun">2 วันล่าสุด:</span>
                <span className="text-xs font-black text-white font-sarabun">฿{combinedRevenue.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[7px] font-black text-slate-500 uppercase font-sarabun">รวม:</span>
                <span className="text-xs font-black text-white font-sarabun">
                  {combinedCount} <span className="text-[8px] opacity-40">คัน</span>
                </span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">🔍</span>
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="ค้นหาทะเบียน หรือ ชื่อเต็นท์รถ..."
              className="w-full pl-9 pr-4 py-2 bg-white/80 border border-slate-200/80 rounded-xl text-xs font-semibold outline-none shadow-sm focus:bg-white focus:border-blue-300 focus:shadow-blue-100 transition-all font-sarabun" 
            />
          </div>
        </div>
      </div>

      {/* --- Scrollable Content --- */}
      <div className="px-5 pt-5 pb-[450px] max-w-2xl mx-auto block overflow-visible">
        
        {/* Filter Pills */}
        <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar py-1">
          {(['all', 'wash', 'polish'] as FilterType[]).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all border whitespace-nowrap font-sarabun shadow-sm ${
                filterType === t 
                  ? t === 'wash'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
                    : t === 'polish'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-amber-100'
                    : 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
              }`}>
              {t === 'all' ? 'ทั้งหมด' : t === 'wash' ? '🧼 Wash' : '✨ Polish'}
            </button>
          ))}
        </div>

        {/* Date Range Picker */}
        <div className="flex gap-2 mb-6 items-center">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 font-sarabun outline-none focus:border-blue-300 transition-colors"
          />
          <span className="text-slate-300 self-center text-[10px] shrink-0">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 font-sarabun outline-none focus:border-blue-300 transition-colors"
          />
        </div>

        {/* Record List */}
        {loading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[76px] bg-white rounded-[24px] animate-pulse"
                style={{ opacity: 1 - (i - 1) * 0.2 }} />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-3">📂</div>
            <p className="text-sm font-black text-slate-400 font-sarabun">ไม่พบรายการ</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, recs]) => (
            <div key={date} className="mb-8">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-black text-slate-500 font-sarabun uppercase tracking-wide">{date}</span>
                </div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  ฿{recs.reduce((s, r) => s + r.price, 0).toLocaleString()}
                </span>
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

      <EditModal 
        record={selectedRecord} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        onDelete={handleDelete} 
      />
    </div>
  )
}