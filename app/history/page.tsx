'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Record, Expense } from '@/types'
import RecordCard from '@/components/RecordCard'
import { exportToCSV } from '@/lib/export'
import EditModal from '@/components/EditModal'

type TabType    = 'income' | 'expense'
type FilterType = 'all' | 'wash' | 'polish'

const START_YEAR   = new Date().getFullYear() - 5
const YEAR_OPTIONS = Array.from({ length: 16 }, (_,i) => START_YEAR + i)

// ✅ เพิ่มตัวเลือกเดือน
const MONTH_OPTIONS = [
  { value: 0, label: 'ตลอดทั้งปี' },
  { value: 1, label: 'มกราคม' }, { value: 2, label: 'กุมภาพันธ์' },
  { value: 3, label: 'มีนาคม' }, { value: 4, label: 'เมษายน' },
  { value: 5, label: 'พฤษภาคม' }, { value: 6, label: 'มิถุนายน' },
  { value: 7, label: 'กรกฎาคม' }, { value: 8, label: 'สิงหาคม' },
  { value: 9, label: 'กันยายน' }, { value: 10, label: 'ตุลาคม' },
  { value: 11, label: 'พฤศจิกายน' }, { value: 12, label: 'ธันวาคม' }
]

export default function HistoryPage() {
  const [activeTab, setActiveTab]       = useState<TabType>('income')
  const [records, setRecords]           = useState<Record[]>([])
  const [expenses, setExpenses]         = useState<Expense[]>([])
  const [search, setSearch]             = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1) // ✅ เพิ่ม State เดือน (ค่าเริ่มต้นคือเดือนปัจจุบัน)
  const [filterType, setFilterType]     = useState<FilterType>('all')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [selectedItem, setSelectedItem] = useState<Record | Expense | null>(null)
  const [isModalOpen, setIsModalOpen]   = useState(false)

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    setError('')
    const startOfYear = new Date(selectedYear, 0, 1).toISOString()
    const endOfYear   = new Date(selectedYear + 1, 0, 1).toISOString()

    const [recordsRes, expensesRes] = await Promise.all([
      supabase.from('records').select('*').gte('created_at', startOfYear).lt('created_at', endOfYear).order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').gte('created_at', startOfYear).lt('created_at', endOfYear).order('created_at', { ascending: false }),
    ])

    if (recordsRes.error) { setError(recordsRes.error.message); setRecords([]) }
    else setRecords(recordsRes.data ?? [])

    if (expensesRes.error) { setError(expensesRes.error.message); setExpenses([]) }
    else setExpenses(expensesRes.data ?? [])

    setLoading(false)
  }, [selectedYear])

  useEffect(() => { fetchAllData() }, [fetchAllData])

  function switchTab(tab: TabType) {
    setActiveTab(tab)
    setSearch(''); setDateFrom(''); setDateTo(''); setFilterType('all')
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
          type:           updatedFields.type, 
          plate:          updatedFields.plate,
          price:          updatedFields.price,
          services:       updatedFields.services,
          customer_name:  updatedFields.customer_name,
          payment_status: updatedFields.payment_status,
          created_at:     updatedFields.created_at,
          updated_by_email: updatedFields.updated_by_email, 
          updated_at:       updatedFields.updated_at,       
        }
      : {
          title:      updatedFields.title,
          amount:     updatedFields.amount,
          note:       updatedFields.note,
          created_at: updatedFields.created_at,
          updated_by_email: updatedFields.updated_by_email, 
          updated_at:       updatedFields.updated_at,       
        }
    const { error } = await supabase.from(table).update(updateData).eq('id', selectedItem.id)
    if (error) setError(error.message)
    else { setIsModalOpen(false); fetchAllData() }
  }

  // ✅ กรองข้อมูลตามเดือนที่เลือก (สำหรับใช้สรุปยอด)
  const currentMonthRecords = selectedMonth === 0 
    ? records 
    : records.filter(r => new Date(r.created_at).getMonth() + 1 === selectedMonth)

  const currentMonthExpenses = selectedMonth === 0 
    ? expenses 
    : expenses.filter(e => new Date(e.created_at).getMonth() + 1 === selectedMonth)

  // ✅ คำนวณยอดรวมจากข้อมูลที่กรองเดือนแล้ว
  const totalIncome      = currentMonthRecords.reduce((s, r) => s + r.price, 0)
  const totalExpense     = currentMonthExpenses.reduce((s, e) => s + e.amount, 0)
  const totalWashCount   = currentMonthRecords.filter(r => r.type === 'wash').length
  const totalPolishCount = currentMonthRecords.filter(r => r.type === 'polish').length

  // ✅ กรองข้อมูลสำหรับแสดงผลใน List (เพิ่มเงื่อนไขช่อง Search)
  const filteredItems = activeTab === 'income'
    ? currentMonthRecords.filter(r => {
        const ms  = r.plate.toLowerCase().includes(search.toLowerCase()) || (r.customer_name || '').toLowerCase().includes(search.toLowerCase())
        const mt  = filterType === 'all' || r.type === filterType
        const mf  = !dateFrom || new Date(r.created_at) >= new Date(dateFrom)
        const mto = !dateTo   || new Date(r.created_at) <= new Date(dateTo + 'T23:59:59')
        return ms && mt && mf && mto
      })
    : currentMonthExpenses.filter(e => {
        const ms  = e.title.toLowerCase().includes(search.toLowerCase())
        const mf  = !dateFrom || new Date(e.created_at) >= new Date(dateFrom)
        const mto = !dateTo   || new Date(e.created_at) <= new Date(dateTo + 'T23:59:59')
        return ms && mf && mto
      })

  const grouped = filteredItems.reduce((acc, item) => {
    const date = new Date(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    if (!acc[date]) acc[date] = []
    acc[date].push(item)
    return acc
  }, {} as {[date: string]: (Record | Expense)[]})

  return (
    <div className="min-h-dvh px-4 pt-6 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between fade-up">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">ประวัติ</h1>
        <div className="flex gap-1.5">
          {/* ✅ เพิ่ม Dropdown เลือกเดือน */}
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(parseInt(e.target.value))}
            className="input py-2 px-2 text-xs w-auto appearance-none cursor-pointer"
            style={{ width: 'auto' }}
          >
            {MONTH_OPTIONS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="input py-2 px-2 text-xs w-auto appearance-none cursor-pointer"
            style={{ width: 'auto' }}
          >
            {YEAR_OPTIONS.map(y => (
              <option key={y} value={y}>{y + 543}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Tab Toggle ── */}
      <div className="flex bg-[var(--surface-2)] p-1.5 rounded-[var(--radius-lg)] gap-1.5 fade-up delay-1">
        <button
          onClick={() => switchTab('income')}
          className={`flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
            activeTab === 'income'
              ? 'bg-white text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          รายรับ
        </button>
        <button
          onClick={() => switchTab('expense')}
          className={`flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
            activeTab === 'expense'
              ? 'bg-white text-[var(--red)] shadow-[var(--shadow-sm)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          รายจ่าย
        </button>
      </div>

      {/* ── Summary + Export ── */}
      <div className="card-dark p-4 fade-up delay-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            {/* ✅ อัปเดตข้อความสรุปตามเดือนที่เลือก */}
            <p className="text-xs text-white/50 mb-1">
              {selectedMonth === 0 ? 'ยอดรวมทั้งปี' : `ยอดรวมเดือน${MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label}`}
            </p>
            <p className="text-2xl font-bold text-white">
              ฿{(activeTab === 'income' ? totalIncome : totalExpense).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'income' && (
              <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-[var(--radius-md)] px-3 py-2">
                <div className="text-center">
                  <p className="text-[10px] text-white/50 leading-none mb-1">ล้างรถ</p>
                  <p className="text-sm font-bold text-white leading-none">{totalWashCount.toLocaleString()}</p>
                  <p className="text-[9px] text-white/40 leading-none mt-0.5">คัน</p>
                </div>
                <div className="w-px h-7 bg-white/15" />
                <div className="text-center">
                  <p className="text-[10px] text-white/50 leading-none mb-1">ขัดสี</p>
                  <p className="text-sm font-bold text-white leading-none">{totalPolishCount.toLocaleString()}</p>
                  <p className="text-[9px] text-white/40 leading-none mt-0.5">คัน</p>
                </div>
              </div>
            )}
            <button
              onClick={() => exportToCSV(activeTab === 'income' ? currentMonthRecords : currentMonthExpenses, `history-${activeTab}-${selectedYear}`)}
              className="flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2.5 rounded-[var(--radius-md)] transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v8M4 6l3 3 3-3M2 10v1.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── Search & Filter ── */}
      <div className="card p-3.5 space-y-3 fade-up delay-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={activeTab === 'income' ? 'ค้นหาทะเบียน หรือชื่อลูกค้า...' : 'ค้นหารายการจ่าย...'}
            className="input text-sm w-full"
            style={{ paddingLeft: '2.5rem' }} 
          />
        </div>

        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input flex-1 text-sm py-2.5 text-center cursor-pointer" />
          <span className="text-[var(--text-tertiary)] text-sm font-medium shrink-0">—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input flex-1 text-sm py-2.5 text-center cursor-pointer" />
        </div>

        {activeTab === 'income' && (
          <div className="flex gap-2">
            {(['all','wash','polish'] as FilterType[]).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`flex-1 py-2 rounded-[var(--radius-md)] text-xs font-semibold transition-all border ${
                  filterType === t
                    ? t === 'all'  ? 'bg-[var(--text-primary)] text-white border-transparent'
                    : t === 'wash' ? 'bg-[var(--accent-light)] text-[var(--accent)] border-blue-100'
                    :                'bg-[var(--amber-light)] text-[var(--amber)] border-amber-100'
                    : 'bg-white text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'
                }`}
              >
                {t === 'all' ? 'ทั้งหมด' : t === 'wash' ? 'ล้างรถ' : 'ขัดสี'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── List ── */}
      <div className="fade-up delay-3">
        {loading ? (
          <div className="space-y-2.5">
            {[1,2,3].map(i => (
              <div key={i} className="h-[68px] bg-[var(--surface-2)] rounded-[var(--radius-lg)] animate-pulse" />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="card p-12 text-center border-dashed">
            <p className="text-3xl mb-3 opacity-20">📂</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">ไม่พบรายการ</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">ลองเปลี่ยนตัวกรองดูครับ</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => {
            const dayWashCount   = items.filter(i => 'type' in i && i.type === 'wash').length
            const dayPolishCount = items.filter(i => 'type' in i && i.type === 'polish').length
            const dayTotal       = items.reduce((s,i) => s + ('price' in i ? i.price : i.amount), 0)

            return (
              <div key={date} className="mb-6">
                <div className="sticky top-2 z-10 bg-[var(--bg)]/90 backdrop-blur-sm py-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-[var(--text-secondary)] shrink-0">{date}</span>
                    <div className="h-px flex-1 bg-[var(--border)]" />
                    <div className="flex items-center gap-2">
                      {activeTab === 'income' && (
                        <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
                          ล้าง {dayWashCount} · ขัด {dayPolishCount}
                        </span>
                      )}
                      <span className={`text-xs font-semibold shrink-0 ${activeTab === 'income' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                        ฿{dayTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  {items.map(item => (
                    <div key={item.id} className="flex flex-col gap-1.5 mb-1.5">
                      {activeTab === 'income' ? (
                        <div onClick={() => { setSelectedItem(item); setIsModalOpen(true) }} className="cursor-pointer">
                          <RecordCard record={item as Record} />
                        </div>
                      ) : (
                        <div
                          onClick={() => { setSelectedItem(item); setIsModalOpen(true) }}
                          className="card flex items-center justify-between px-4 py-3.5 cursor-pointer hover:shadow-[var(--shadow-md)] transition-shadow active:scale-[0.985]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-[10px] bg-[var(--red-light)] flex items-center justify-center shrink-0">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 3v10M3 8h10" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{(item as Expense).title}</p>
                              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                                {new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-[var(--red)]">−฿{(item as Expense).amount.toLocaleString()}</p>
                        </div>
                      )}
                      
                      {((item as Record | Expense).created_by_email || (item as Record | Expense).updated_by_email) && (
                        <div className="flex items-center justify-end gap-3 px-2 text-[10px] font-medium text-[var(--text-tertiary)] opacity-60">
                          {(item as Record | Expense).created_by_email && (
                            <span className="flex items-center gap-1">
                              ➕ เพิ่ม: {(item as Record | Expense).created_by_email?.split('@')[0]}
                            </span>
                          )}
                          {(item as Record | Expense).updated_by_email && (
                            <span className="flex items-center gap-1">
                              ✏️ แก้ไข: {(item as Record | Expense).updated_by_email?.split('@')[0]}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {error && (
        <div className="fixed bottom-28 left-4 right-4 max-w-lg mx-auto p-3 rounded-[var(--radius-md)] bg-[var(--red)] text-white text-sm font-medium text-center fade-up">
          {error}
        </div>
      )}

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