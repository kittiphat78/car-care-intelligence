'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Record, Expense } from '@/types'
import RecordCard from '@/components/RecordCard'
import { exportToCSV } from '@/lib/export'
import EditModal from '@/components/EditModal' 

type TabType = 'income' | 'expense'
type FilterType = 'all' | 'wash' | 'polish'

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('income')
  const [records, setRecords] = useState<Record[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [search, setSearch] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)

  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const dynamicYears = Array.from({ length: 16 }, (_, i) => {
    const startYear = new Date().getFullYear() - 5;
    return startYear + i;
  })

  async function fetchAllData() {
    setLoading(true)
    const startOfYear = new Date(selectedYear, 0, 1).toISOString()
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString()

    // ดึงทั้งรายรับและรายจ่ายพร้อมกัน
    const [recordsRes, expensesRes] = await Promise.all([
      supabase.from('records').select('*').gte('created_at', startOfYear).lte('created_at', endOfYear).order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').gte('created_at', startOfYear).lte('created_at', endOfYear).order('created_at', { ascending: false })
    ])

    setRecords(recordsRes.data ?? [])
    setExpenses(expensesRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { 
    fetchAllData()
  }, [selectedYear])

  async function handleDelete(id: string) {
    const table = activeTab === 'income' ? 'records' : 'expenses'
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) alert(error.message)
    else { setIsModalOpen(false); fetchAllData(); }
  }

  async function handleSave(updatedFields: any) {
    if (activeTab === 'expense') return // ตัวอย่างนี้เน้นแก้ Record ก่อน
    if (!selectedRecord) return
    const { error } = await supabase
      .from('records')
      .update({ plate: updatedFields.plate, price: updatedFields.price, services: updatedFields.services })
      .eq('id', selectedRecord.id)

    if (error) alert(error.message)
    else { setIsModalOpen(false); fetchAllData(); }
  }

  // --- Logic การกรองข้อมูล ---
  const filteredRecords = records.filter(r => {
    const matchSearch = r.plate.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || r.type === filterType
    let matchDateRange = true
    if (dateFrom) matchDateRange = matchDateRange && new Date(r.created_at) >= new Date(dateFrom)
    if (dateTo) matchDateRange = matchDateRange && new Date(r.created_at) <= new Date(dateTo + 'T23:59:59')
    return matchSearch && matchType && matchDateRange
  })

  const filteredExpenses = expenses.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase())
    let matchDateRange = true
    if (dateFrom) matchDateRange = matchDateRange && new Date(e.created_at) >= new Date(dateFrom)
    if (dateTo) matchDateRange = matchDateRange && new Date(e.created_at) <= new Date(dateTo + 'T23:59:59')
    return matchSearch && matchDateRange
  })

  // Grouping ข้อมูลตามวันที่
  const currentItems = activeTab === 'income' ? filteredRecords : filteredExpenses
  const grouped = currentItems.reduce((acc, item: any) => {
    const date = new Date(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(item)
    return acc
  }, {} as { [key: string]: any[] })

  const totalIncome = records.reduce((s, r) => s + r.price, 0)
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="relative w-full h-auto min-h-screen bg-[#F4F6F9] pb-40">
      
      {/* --- Sticky Header --- */}
      <div className="sticky top-0 z-30 bg-[#F4F6F9]/90 backdrop-blur-xl border-b border-slate-200/60 px-4 pt-6 pb-3">
        <div className="max-w-2xl mx-auto">
          
          <div className="flex items-center justify-between mb-4 px-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight font-sarabun">ประวัติบัญชี</h1>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-900 outline-none font-sarabun"
            >
              {dynamicYears.map(y => <option key={y} value={y}>พ.ศ. {y + 543}</option>)}
            </select>
          </div>

          {/* สลับ Tab รายรับ/รายจ่าย */}
          <div className="flex p-1 bg-slate-200/50 rounded-2xl mb-4">
            <button onClick={() => setActiveTab('income')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeTab === 'income' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>รายรับ 🧼</button>
            <button onClick={() => setActiveTab('expense')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeTab === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>รายจ่าย 💸</button>
          </div>

          {/* Summary Card แบบ Dynamic ตาม Tab */}
          <div className={`relative rounded-[22px] p-4 mb-4 shadow-lg transition-all ${activeTab === 'income' ? 'bg-slate-900' : 'bg-rose-900'}`}>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[8px] font-black uppercase text-white/40 mb-1">ยอดรวม{activeTab === 'income' ? 'รายรับ' : 'รายจ่าย'}ปีนี้</p>
                <p className="text-2xl font-black text-white">฿{(activeTab === 'income' ? totalIncome : totalExpense).toLocaleString()}</p>
              </div>
              <button 
                onClick={() => exportToCSV(activeTab === 'income' ? records : expenses, `History-${activeTab}-${selectedYear}`)}
                className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black text-white flex items-center gap-2"
              >
                📥 โหลด CSV
              </button>
            </div>
          </div>

          <div className="relative">
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder={activeTab === 'income' ? "ค้นหาทะเบียนรถ..." : "ค้นหาชื่อรายการจ่าย..."}
              className="w-full pl-4 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none shadow-sm focus:border-blue-300 font-sarabun" 
            />
          </div>
        </div>
      </div>

      {/* --- Content --- */}
      <div className="px-5 pt-6 max-w-2xl mx-auto">
        
        {/* กรองประเภทยานพาหนะ (เฉพาะหน้า Income) */}
        {activeTab === 'income' && (
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar py-1">
            {(['all', 'wash', 'polish'] as FilterType[]).map(t => (
              <button key={t} onClick={() => setFilterType(t)} className={`px-5 py-2 rounded-full text-[10px] font-black transition-all border font-sarabun ${filterType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-200'}`}>
                {t === 'all' ? 'ทั้งหมด' : t === 'wash' ? '🧼 ล้างรถ' : '✨ ขัดสี'}
              </button>
            ))}
          </div>
        )}

        {/* ช่วงวันที่ */}
        <div className="flex gap-2 mb-8 items-center bg-white p-2 rounded-xl border border-slate-100">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 bg-transparent text-[10px] font-black text-slate-600 outline-none" />
          <span className="text-slate-300">→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 bg-transparent text-[10px] font-black text-slate-600 outline-none" />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-[20px] animate-pulse" />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[30px] border border-dashed border-slate-300">
            <p className="text-4xl mb-4">📂</p>
            <p className="text-sm font-black text-slate-400 font-sarabun">ไม่พบรายการที่ค้นหา</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="mb-8">
              <div className="flex items-center justify-between mb-4 px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{date}</span>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full ${activeTab === 'income' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                  ฿{items.reduce((s, i) => s + (i.price || i.amount), 0).toLocaleString()}
                </span>
              </div>
              <div className="grid gap-3">
                {items.map((item: any) => (
                  activeTab === 'income' ? (
                    <div key={item.id} onClick={() => { setSelectedRecord(item); setIsModalOpen(true); }} className="active:scale-95 transition-all">
                      <RecordCard record={item} />
                    </div>
                  ) : (
                    <div key={item.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center text-lg">💸</div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{item.title}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">{new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</p>
                        </div>
                      </div>
                      <p className="text-lg font-black text-rose-600">- ฿{item.amount.toLocaleString()}</p>
                    </div>
                  )
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