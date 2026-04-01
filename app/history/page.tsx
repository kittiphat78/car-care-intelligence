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

  // --- States สำหรับยอดเมื่อวาน ---
  const [yesterdayStats, setYesterdayStats] = useState({ revenue: 0, count: 0 })

  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const dynamicYears = Array.from({ length: 16 }, (_, i) => {
    const startYear = new Date().getFullYear() - 5;
    return startYear + i;
  })

  // ── ฟังก์ชันดึงยอดของเมื่อวาน ──
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
    fetchYesterdayStats() // เรียกใช้เมื่อโหลดหน้า
  }, [selectedYear])

  // คำนวณยอดรวม 2 วัน (วันนี้ + เมื่อวาน)
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
    <div className="min-h-screen bg-[#F4F6F9] page-transition">
      <div className="sticky top-0 z-30 bg-[#F4F6F9]/95 backdrop-blur-2xl border-b border-slate-200/60 px-5 pt-10 pb-4">
        <div className="max-w-2xl mx-auto">
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 mb-0.5">ประวัติรายการ</p>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none font-sarabun">Archive</h1>
            </div>
            
            <div className="relative">
              <select value={selectedYear} onChange={(e) => { setSelectedYear(parseInt(e.target.value)); setSelectedMonth(null); }}
                className="appearance-none bg-white border border-slate-200 rounded-2xl pl-4 pr-10 py-2.5 text-sm font-black text-slate-900 shadow-sm outline-none focus:ring-4 focus:ring-slate-900/5 cursor-pointer font-sarabun">
                {dynamicYears.map(y => <option key={y} value={y}>พ.ศ. {y + 543}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
            </div>
          </div>

          {/* Yearly Card + Combined Stats */}
          <div className="relative rounded-[24px] overflow-hidden mb-4 shadow-lg shadow-slate-900/10 p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950" />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">รายได้ปี พ.ศ. {selectedYear + 543}</p>
                  <p className="text-2xl font-black text-blue-400 tracking-tight">฿{records.reduce((s, r) => s + r.price, 0).toLocaleString()}</p>
                </div>
                <button onClick={() => exportToCSV(records, `Summary-${selectedYear}`)}
                  className="bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 rounded-xl text-[10px] font-black text-white/80 uppercase transition-all">
                  📥 CSV
                </button>
              </div>

              {/* ส่วนที่เพิ่ม: สรุปยอด 2 วันล่าสุด */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black text-blue-300 uppercase tracking-widest mb-0.5">ยอดรวม 2 วัน (เมื่อวาน+วันนี้)</p>
                  <p className="text-base font-black text-white">฿{combinedRevenue.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">จำนวนรถรวม</p>
                  <p className="text-base font-black text-white">{combinedCount} <span className="text-[10px] opacity-40 uppercase">คัน</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            {(['all', 'wash', 'polish'] as FilterType[]).map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border ${filterType === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>
                {t === 'all' ? 'ทั้งหมด' : t === 'wash' ? '🚿 Wash' : '✨ Polish'}
              </button>
            ))}
          </div>

          <div className="relative mb-3">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาทะเบียนรถ..."
              className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold outline-none shadow-sm transition-all font-sarabun" />
          </div>

          <div className="flex gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 font-sarabun" />
            <span className="text-slate-300 font-black self-center">—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 font-sarabun" />
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 pb-32 max-w-2xl mx-auto">
        {monthlySummary.length > 0 && !search && !dateFrom && !dateTo && filterType === 'all' && (
          <div className="mb-6 px-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 font-sarabun">สรุปรายเดือน</p>
            <div className="grid grid-cols-2 gap-2">
              {monthlySummary.map(m => (
                <button key={m.month} onClick={() => setSelectedMonth(selectedMonth === m.month ? null : m.month)}
                  className={`text-left rounded-[18px] px-4 py-3 border transition-all ${selectedMonth === m.month ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <p className="text-[9px] font-black uppercase tracking-wider mb-1 text-slate-400 font-sarabun">{m.label} พ.ศ. {selectedYear + 543}</p>
                  <p className="text-lg font-black tracking-tight">฿{m.total.toLocaleString()}</p>
                  <p className="text-[10px] mt-0.5 text-slate-400 font-sarabun">🚿 {m.wash} · ✨ {m.polish}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="animate-pulse space-y-3 pt-5">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-[22px]" />)}
          </div>
        ) : (
          Object.entries(grouped).map(([date, recs]) => (
            <div key={date} className="mb-7">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[11px] font-black text-slate-700 font-sarabun">{date}</span>
                <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl">฿{recs.reduce((s, r) => s + r.price, 0).toLocaleString()}</span>
              </div>
              <div className="grid gap-2.5">
                {recs.map(r => (
                  <div key={r.id} onClick={() => { setSelectedRecord(r); setIsModalOpen(true); }}>
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