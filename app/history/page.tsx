'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Record, Expense } from '@/types'
import RecordCard from '@/components/RecordCard'
import { exportToCSV } from '@/lib/export'
import EditModal from '@/components/EditModal'

type TabType    = 'income' | 'expense'
type FilterType = 'all' | 'wash' | 'polish'

const START_YEAR = new Date().getFullYear() - 5
const YEAR_OPTIONS = Array.from({ length: 16 }, (_, i) => START_YEAR + i)

export default function HistoryPage() {
  const [activeTab, setActiveTab]       = useState<TabType>('income')
  const [records, setRecords]           = useState<Record[]>([])
  const [expenses, setExpenses]         = useState<Expense[]>([])
  const [search, setSearch]             = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [filterType, setFilterType]     = useState<FilterType>('all')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')

  const [selectedItem, setSelectedItem] = useState<Record | Expense | null>(null)
  const [isModalOpen, setIsModalOpen]   = useState(false)

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    const startOfYear = new Date(selectedYear, 0, 1).toISOString()
    const endOfYear   = new Date(selectedYear + 1, 0, 1).toISOString()

    const [recordsRes, expensesRes] = await Promise.all([
      supabase.from('records').select('*')
        .gte('created_at', startOfYear).lt('created_at', endOfYear)
        .order('created_at', { ascending: false }),
      supabase.from('expenses').select('*')
        .gte('created_at', startOfYear).lt('created_at', endOfYear)
        .order('created_at', { ascending: false }),
    ])

    setRecords(recordsRes.data ?? [])
    setExpenses(expensesRes.data ?? [])
    setLoading(false)
  }, [selectedYear])

  useEffect(() => { fetchAllData() }, [fetchAllData])

  function switchTab(tab: TabType) {
    setActiveTab(tab)
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setFilterType('all')
  }

  async function handleDelete(id: string) {
    setError('')
    const table = activeTab === 'income' ? 'records' : 'expenses'
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) setError(error.message)
    else { setIsModalOpen(false); fetchAllData() }
  }

  async function handleSave(updatedFields: Partial<Record & Expense>) {
    if (!selectedItem) return
    setError('')
    const table = activeTab === 'income' ? 'records' : 'expenses'

    const updateData = activeTab === 'income'
      ? {
          plate:          updatedFields.plate,
          price:          updatedFields.price,
          services:       updatedFields.services,
          customer_name:  updatedFields.customer_name,
          payment_status: updatedFields.payment_status,
        }
      : {
          title:  updatedFields.title,
          amount: updatedFields.amount,
          note:   updatedFields.note,
        }

    const { error } = await supabase.from(table).update(updateData).eq('id', selectedItem.id)
    if (error) setError(error.message)
    else { setIsModalOpen(false); fetchAllData() }
  }

  const filteredItems = activeTab === 'income'
    ? records.filter(r => {
        const matchSearch = r.plate.toLowerCase().includes(search.toLowerCase())
          || (r.customer_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
        const matchType = filterType === 'all' || r.type === filterType
        const matchFrom = !dateFrom || new Date(r.created_at) >= new Date(dateFrom)
        const matchTo   = !dateTo   || new Date(r.created_at) <= new Date(dateTo + 'T23:59:59')
        return matchSearch && matchType && matchFrom && matchTo
      })
    : expenses.filter(e => {
        const matchSearch = e.title.toLowerCase().includes(search.toLowerCase())
        const matchFrom = !dateFrom || new Date(e.created_at) >= new Date(dateFrom)
        const matchTo   = !dateTo   || new Date(e.created_at) <= new Date(dateTo + 'T23:59:59')
        return matchSearch && matchFrom && matchTo
      })

  const grouped = filteredItems.reduce<{ [key: string]: (Record | Expense)[] }>((acc, item) => {
    const date = new Date(item.created_at).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(item)
    return acc
  }, {})

  const totalIncome  = records.reduce((s, r) => s + r.price, 0)
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0)
  
  // ✅ คำนวณจำนวนคันสะสมประจำปี
  const yearlyWashCount = records.filter(r => r.type === 'wash').length
  const yearlyPolishCount = records.filter(r => r.type === 'polish').length

  return (
    <div className="relative w-full min-h-screen pb-32 text-slate-900 bg-[#F4F6F9]">

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-[#F4F6F9]/95 backdrop-blur-md border-b border-slate-200/50 px-4 pt-4 pb-2 shadow-sm">
        <div className="max-w-2xl mx-auto">

          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-blue-600" />
              <h1 className="text-xl font-black text-slate-900 tracking-tight">คลังข้อมูล</h1>
            </div>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black text-slate-900 outline-none"
            >
              {YEAR_OPTIONS.map(y => (
                <option key={y} value={y}>พ.ศ. {y + 543}</option>
              ))}
            </select>
          </div>

          {/* Tab Toggle */}
          <div className="flex p-1 bg-slate-200/60 rounded-xl mb-3 gap-1">
            <button onClick={() => switchTab('income')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${activeTab === 'income' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
              รายรับร้าน 💰
            </button>
            <button onClick={() => switchTab('expense')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${activeTab === 'expense' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500'}`}>
              รายจ่ายร้าน 💸
            </button>
          </div>

          {/* Summary Card - เพิ่มจำนวนคันสะสมปีนี้ */}
          <div className={`relative overflow-hidden rounded-[22px] p-4 mb-3 shadow-md transition-all duration-500 border border-white/10 ${activeTab === 'income' ? 'bg-[#0D1117]' : 'bg-rose-950'}`}>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p style={{ color: '#FFFFFF', opacity: 0.8 }} className="text-[9px] font-black uppercase tracking-[0.1em] mb-0.5">
                  ยอดรวมราย{activeTab === 'income' ? 'รับ' : 'จ่าย'}ปี {selectedYear + 543}
                </p>
                <p style={{ color: '#FFFFFF' }} className="text-2xl font-black tracking-tight mb-3">
                  ฿{(activeTab === 'income' ? totalIncome : totalExpense).toLocaleString()}
                </p>
                
                {/* ✅ ส่วนแสดงสถิติจำนวนคันประจำปี (เฉพาะแถบรายรับ) */}
                {activeTab === 'income' && (
                  <div className="flex gap-3">
                    <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/5">
                      <p style={{ color: '#FFFFFF', opacity: 0.6 }} className="text-[7px] font-black uppercase tracking-wider">ล้างรถ</p>
                      <p style={{ color: '#FFFFFF' }} className="text-xs font-black">{yearlyWashCount.toLocaleString()} <span className="text-[8px] opacity-60">คัน</span></p>
                    </div>
                    <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/5">
                      <p style={{ color: '#FFFFFF', opacity: 0.6 }} className="text-[7px] font-black uppercase tracking-wider">ขัดสี</p>
                      <p style={{ color: '#FFFFFF' }} className="text-xs font-black">{yearlyPolishCount.toLocaleString()} <span className="text-[8px] opacity-60">คัน</span></p>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => exportToCSV(activeTab === 'income' ? records : expenses, `History-${activeTab}-${selectedYear}`)}
                className="bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 rounded-xl text-[10px] font-black text-white flex items-center gap-1.5 transition-all active:scale-95"
              >
                📥 CSV
              </button>
            </div>
            <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] -mr-8 -mt-8 ${activeTab === 'income' ? 'bg-blue-600/20' : 'bg-rose-600/20'}`} />
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={activeTab === 'income' ? 'ค้นหาเลขทะเบียน หรือ ชื่อลูกค้า...' : 'ค้นหารายการจ่าย...'}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none shadow-sm focus:border-blue-400 transition-all"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm">🔍</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 max-w-2xl mx-auto">
        {/* Filter Pills (income only) */}
        {activeTab === 'income' && (
          <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar py-1">
            {(['all', 'wash', 'polish'] as FilterType[]).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-1.5 rounded-full text-[9px] font-black transition-all border whitespace-nowrap ${filterType === t ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-400 border-slate-200'}`}
              >
                {t === 'all' ? 'ทั้งหมด' : t === 'wash' ? '🧼 ล้างรถ' : '✨ ขัดสี'}
              </button>
            ))}
          </div>
        )}

        {/* Date Range */}
        <div className="flex gap-2 mb-6 items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 bg-transparent text-[10px] font-black text-slate-600 outline-none" />
          <span className="text-slate-300 font-bold">→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 bg-transparent text-[10px] font-black text-slate-600 outline-none" />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 font-bold text-xs px-4 py-3 rounded-xl mb-4 animate-fade-up">
            ⚠️ {error}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse shadow-sm" />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
            <p className="text-4xl mb-3 grayscale opacity-30">📂</p>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">ไม่พบรายการ</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="mb-6">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">{date}</span>
                <div className={`px-3 py-1 rounded-full border font-black text-[9px] shadow-sm ${activeTab === 'income' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                  ฿{items.reduce((s, i) => s + ('price' in i ? i.price : i.amount), 0).toLocaleString()}
                </div>
              </div>
              <div className="grid gap-3 stagger">
                {items.map(item => (
                  activeTab === 'income' ? (
                    <div key={item.id} onClick={() => { setSelectedItem(item); setIsModalOpen(true) }} className="active:scale-[0.98] transition-all cursor-pointer">
                      <RecordCard record={item as Record} />
                    </div>
                  ) : (
                    <div
                      key={item.id}
                      onClick={() => { setSelectedItem(item); setIsModalOpen(true) }}
                      className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-xl shadow-sm">💸</div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{(item as Expense).title}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span>🕒 {new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                            {(item as Expense).note && (
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[8px] uppercase text-slate-500">• {(item as Expense).note}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-rose-600">- ฿{(item as Expense).amount.toLocaleString()}</p>
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">แตะเพื่อจัดการ</p>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <EditModal
        item={selectedItem}
        type={activeTab}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  )
}