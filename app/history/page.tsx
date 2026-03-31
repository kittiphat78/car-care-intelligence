'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Record } from '@/types'
import RecordCard from '@/components/RecordCard'

type Filter = 'all' | 'wash' | 'polish'

export default function HistoryPage() {
  const [records, setRecords] = useState<Record[]>([])
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<Filter>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300)
      setRecords(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered = records.filter(r => {
    const matchType   = filter === 'all' || r.type === filter
    const matchSearch = r.plate.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const grouped = filtered.reduce((acc, r) => {
    const date = new Date(r.created_at).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(r)
    return acc
  }, {} as { [key: string]: Record[] })

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-slate-100 page-transition text-slate-900">
      {/* Search & Filter Header (ลอยตัวเวลาเลื่อน) */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 pt-12 pb-6 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-6">Archive</h1>
        
        <div className="space-y-4">
          {/* Search Bar: ดีไซน์แบบ Minimal */}
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by license plate..."
              className="w-full pl-11 pr-4 py-4 bg-slate-100/50 border-transparent rounded-[20px] text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
            />
          </div>

          {/* Filter Chips: หรูหราด้วยเส้นขอบบางๆ */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {([
              { key: 'all',    label: 'All Activity' },
              { key: 'wash',   label: '🚗 Car Wash' },
              { key: 'polish', label: '✨ Polishing' },
            ] as const).map(tab => (
              <button 
                key={tab.key} 
                onClick={() => setFilter(tab.key)}
                className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border
                  ${filter === tab.key
                    ? 'bg-slate-950 border-slate-950 text-white shadow-lg shadow-slate-200'
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List Content */}
      <div className="px-6 pt-6 pb-24">
        {loading ? (
          <div className="space-y-4 pt-10">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-24 bg-slate-50 rounded-[28px] animate-pulse"></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-32">
            <div className="text-6xl mb-6 grayscale opacity-20">📂</div>
            <p className="text-slate-400 font-bold tracking-tight">No records found matching your search.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, recs]) => (
            <div key={date} className="mb-10">
              {/* Date Header: สไตล์นิตยสารพรีเมียม */}
              <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex items-center gap-3">
                  <div className="h-[2px] w-4 bg-blue-600 rounded-full"></div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">{date}</span>
                </div>
                <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                  SUM ฿{recs.reduce((s, r) => s + r.price, 0).toLocaleString()}
                </div>
              </div>

              <div className="grid gap-3">
                {recs.map(r => <RecordCard key={r.id} record={r} />)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}