'use client'

import { useCallback, useEffect, useState, useMemo, memo } from 'react'
import { supabase } from '@/lib/supabase'
import { Record as AppRecord, Expense } from '@/types'
import RecordCard from '@/components/RecordCard'
import { exportToExcel } from '@/lib/export'
import EditModal from '@/components/EditModal'

/* ═══════════════════════════════════════════════════════════════════════════
   Constants & Types
   ═══════════════════════════════════════════════════════════════════════════ */

type TabType    = 'income' | 'expense'
type FilterType = 'all' | 'wash' | 'polish'

const START_YEAR   = new Date().getFullYear() - 5
const YEAR_OPTIONS = Array.from({ length: 16 }, (_, i) => START_YEAR + i)

const MONTH_OPTIONS = [
  { value: 0, label: 'ตลอดทั้งปี' },
  { value: 1, label: 'มกราคม' }, { value: 2, label: 'กุมภาพันธ์' },
  { value: 3, label: 'มีนาคม' }, { value: 4, label: 'เมษายน' },
  { value: 5, label: 'พฤษภาคม' }, { value: 6, label: 'มิถุนายน' },
  { value: 7, label: 'กรกฎาคม' }, { value: 8, label: 'สิงหาคม' },
  { value: 9, label: 'กันยายน' }, { value: 10, label: 'ตุลาคม' },
  { value: 11, label: 'พฤศจิกายน' }, { value: 12, label: 'ธันวาคม' },
]

const getExpenseIcon = (title: string) => {
  const t = title || ''
  if (t.includes('น้ำยา')) return '💧'
  if (t.includes('แรง')) return '👷'
  if (t.includes('ข้าว') || t.includes('อาหาร')) return '🍚'
  if (t.includes('เช่า')) return '🏠'
  if (t.includes('ไฟ')) return '⚡'
  if (t.includes('น้ำ')) return '🚰'
  if (t.includes('ขยะ')) return '🗑️'
  if (t.includes('อุปกรณ์')) return '🛒'
  return '💸'
}

/* ═══════════════════════════════════════════════════════════════════════════
   Custom Hook (100% original logic)
   ═══════════════════════════════════════════════════════════════════════════ */

function useHistoryData(selectedYear: number, activeTab: TabType) {
  const [records, setRecords]   = useState<AppRecord[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const fetchAllData = useCallback(async () => {
    setLoading(true); setError('')
    const startOfYear = new Date(selectedYear, 0, 1).toISOString()
    const endOfYear   = new Date(selectedYear + 1, 0, 1).toISOString()

    const [recordsRes, expensesRes] = await Promise.all([
      supabase.from('records').select('*').gte('created_at', startOfYear).lt('created_at', endOfYear).order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').gte('created_at', startOfYear).lt('created_at', endOfYear).order('created_at', { ascending: false }),
    ])
    if (recordsRes.error) { setError(recordsRes.error.message); setRecords([]) } else setRecords(recordsRes.data ?? [])
    if (expensesRes.error) { setError(expensesRes.error.message); setExpenses([]) } else setExpenses(expensesRes.data ?? [])
    setLoading(false)
  }, [selectedYear])

  useEffect(() => { fetchAllData() }, [fetchAllData])

  const handleDelete = useCallback(async (id: string, onCloseModal: () => void) => {
    setError('')
    const table = activeTab === 'income' ? 'records' : 'expenses'
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) setError(error.message); else { onCloseModal(); fetchAllData() }
  }, [activeTab, fetchAllData])

  const handleSave = useCallback(async (updatedFields: Partial<AppRecord & Expense>, id: string, onCloseModal: () => void) => {
    setError('')
    const table = activeTab === 'income' ? 'records' : 'expenses'
    const updateData = activeTab === 'income'
      ? { type: updatedFields.type, plate: updatedFields.plate, price: updatedFields.price, services: updatedFields.services, customer_name: updatedFields.customer_name, payment_status: updatedFields.payment_status, created_at: updatedFields.created_at, updated_by_email: updatedFields.updated_by_email, updated_at: updatedFields.updated_at }
      : { title: updatedFields.title, amount: updatedFields.amount, note: updatedFields.note, created_at: updatedFields.created_at, updated_by_email: updatedFields.updated_by_email, updated_at: updatedFields.updated_at }
    const { error } = await supabase.from(table).update(updateData).eq('id', id)
    if (error) setError(error.message); else { onCloseModal(); fetchAllData() }
  }, [activeTab, fetchAllData])

  return { records, expenses, loading, error, setError, handleDelete, handleSave }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function HistoryPage() {
  const [activeTab, setActiveTab]         = useState<TabType>('income')
  const [search, setSearch]               = useState('')
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [filterType, setFilterType]       = useState<FilterType>('all')
  const [dateFrom, setDateFrom]           = useState('')
  const [dateTo, setDateTo]               = useState('')
  const [selectedItem, setSelectedItem]   = useState<AppRecord | Expense | null>(null)
  const [isModalOpen, setIsModalOpen]     = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  const { records, expenses, loading, error, handleDelete, handleSave } = useHistoryData(selectedYear, activeTab)

  const switchTab = useCallback((tab: TabType) => {
    setActiveTab(tab); setSearch(''); setDateFrom(''); setDateTo(''); setFilterType('all')
  }, [])

  const currentMonthRecords = useMemo(() =>
    selectedMonth === 0 ? records : records.filter(r => new Date(r.created_at).getMonth() + 1 === selectedMonth)
  , [records, selectedMonth])

  const currentMonthExpenses = useMemo(() =>
    selectedMonth === 0 ? expenses : expenses.filter(e => new Date(e.created_at).getMonth() + 1 === selectedMonth)
  , [expenses, selectedMonth])

  const summary = useMemo(() => ({
    totalIncome: currentMonthRecords.reduce((s, r) => s + r.price, 0),
    totalExpense: currentMonthExpenses.reduce((s, e) => s + e.amount, 0),
    totalWashCount: currentMonthRecords.filter(r => r.type === 'wash').length,
    totalPolishCount: currentMonthRecords.filter(r => r.type === 'polish').length,
  }), [currentMonthRecords, currentMonthExpenses])

  const filteredItems = useMemo(() => {
    const fromTime = dateFrom ? new Date(dateFrom).getTime() : 0
    const toTime   = dateTo   ? new Date(dateTo + 'T23:59:59').getTime() : Infinity
    const sl       = search.toLowerCase()

    if (activeTab === 'income') {
      return currentMonthRecords.filter(r => {
        const t = new Date(r.created_at).getTime()
        return (r.plate.toLowerCase().includes(sl) || (r.customer_name || '').toLowerCase().includes(sl))
          && (filterType === 'all' || r.type === filterType)
          && (!dateFrom || t >= fromTime) && (!dateTo || t <= toTime)
      })
    }
    return currentMonthExpenses.filter(e => {
      const t = new Date(e.created_at).getTime()
      return e.title.toLowerCase().includes(sl) && (!dateFrom || t >= fromTime) && (!dateTo || t <= toTime)
    })
  }, [activeTab, currentMonthRecords, currentMonthExpenses, search, filterType, dateFrom, dateTo])

  const grouped = useMemo(() =>
    filteredItems.reduce((acc, item) => {
      const date = new Date(item.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
      if (!acc[date]) acc[date] = []
      acc[date].push(item)
      return acc
    }, {} as globalThis.Record<string, (AppRecord | Expense)[]>)
  , [filteredItems])

  const openModal = useCallback((item: AppRecord | Expense) => { setSelectedItem(item); setIsModalOpen(true) }, [])
  const closeModal = useCallback(() => setIsModalOpen(false), [])

  const handleExport = useCallback(async (startYear: number, startMonth: number, endYear: number, endMonth: number) => {
    // คำนวณวันที่เริ่ม (วันที่ 1 ของเดือนที่เริ่ม)
    const startDate = new Date(startYear, startMonth - 1, 1).toISOString()
    
    // คำนวณวันที่สุดท้าย (วันที่ 1 ของเดือนถัดไปจากเดือนที่สิ้นสุด เพื่อใช้ lt)
    const endDate = new Date(endYear, endMonth, 1).toISOString()
    
    const table = activeTab === 'income' ? 'records' : 'expenses'
    const { data } = await supabase.from(table).select('*').gte('created_at', startDate).lt('created_at', endDate).order('created_at', { ascending: true })
    
    if (data && data.length > 0) {
      const getMonthName = (m: number) => MONTH_OPTIONS.find(opt => opt.value === m)?.label || ''
      const typeLabel = activeTab === 'income' ? 'สรุปรายรับ' : 'สรุปรายจ่าย'
      const startStr = `${getMonthName(startMonth)}${startYear + 543}`
      const endStr = `${getMonthName(endMonth)}${endYear + 543}`

      const fileName = startStr === endStr 
        ? `${typeLabel}_${startStr}`
        : `${typeLabel}_ตั้งแต่${startStr}_ถึง${endStr}`
        
      exportToExcel(data, fileName)
    } else {
      alert('ไม่พบข้อมูลในช่วงเวลาที่เลือก')
    }
    setIsExportModalOpen(false)
  }, [activeTab])

  return (
    <div className="min-h-dvh px-4 pt-6 space-y-4">
      <Header selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />
      <TabToggle activeTab={activeTab} switchTab={switchTab} />
      <SummaryCard
        activeTab={activeTab} selectedMonth={selectedMonth} summary={summary}
        onExport={() => setIsExportModalOpen(true)}
      />
      <FilterSection
        activeTab={activeTab} search={search} setSearch={setSearch}
        dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}
        filterType={filterType} setFilterType={setFilterType}
      />
      <HistoryList loading={loading} grouped={grouped} activeTab={activeTab} onItemClick={openModal} />
      {error && <ErrorBanner error={error} />}
      <EditModal
        item={selectedItem} type={activeTab} isOpen={isModalOpen} onClose={closeModal}
        onSave={(fields) => handleSave(fields, selectedItem!.id, closeModal)}
        onDelete={(id) => handleDelete(id, closeModal)}
      />
      {isExportModalOpen && (
        <ExportModal
          activeTab={activeTab}
          defaultYear={selectedYear}
          defaultMonth={selectedMonth === 0 ? new Date().getMonth() + 1 : selectedMonth}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════════════════════════ */

const Header = memo(function Header({ selectedMonth, setSelectedMonth, selectedYear, setSelectedYear }: any) {
  return (
    <header className="flex items-center justify-between fade-up">
      <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">ประวัติ</h1>
      <div className="flex gap-2">
        <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="input py-2.5 px-3 text-sm w-auto !min-h-[44px] font-bold" aria-label="เลือกเดือน">
          {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="input py-2.5 px-3 text-sm w-auto !min-h-[44px] font-bold" aria-label="เลือกปี">
          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y + 543}</option>)}
        </select>
      </div>
    </header>
  )
})

const TabToggle = memo(function TabToggle({ activeTab, switchTab }: { activeTab: TabType; switchTab: (t: TabType) => void }) {
  return (
    <div className="flex bg-[var(--surface-2)] p-1.5 rounded-2xl gap-1.5 fade-up delay-1" role="tablist" aria-label="สลับประเภทรายการ">
      <button role="tab" aria-selected={activeTab === 'income'} onClick={() => switchTab('income')} className={`flex-1 py-3.5 rounded-xl text-base font-bold transition-all duration-150 ${activeTab === 'income' ? 'bg-white text-[var(--text-primary)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-tertiary)]'}`}>
        💰 รายรับ
      </button>
      <button role="tab" aria-selected={activeTab === 'expense'} onClick={() => switchTab('expense')} className={`flex-1 py-3.5 rounded-xl text-base font-bold transition-all duration-150 ${activeTab === 'expense' ? 'bg-white text-[var(--red)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-tertiary)]'}`}>
        💸 รายจ่าย
      </button>
    </div>
  )
})

const SummaryCard = memo(function SummaryCard({ activeTab, selectedMonth, summary, onExport }: any) {
  return (
    <section className="card-dark p-5 fade-up delay-1" aria-label="สรุปยอดรวม">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] text-white/50 mb-1.5 font-medium">
            {selectedMonth === 0 ? 'ยอดรวมทั้งปี' : `ยอดรวมเดือน${MONTH_OPTIONS.find((m: any) => m.value === selectedMonth)?.label}`}
          </p>
          <p className="text-3xl font-extrabold text-white" aria-live="polite">
            ฿{(activeTab === 'income' ? summary.totalIncome : summary.totalExpense).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'income' && (
            <div className="flex items-center gap-2.5 bg-white/10 border border-white/10 rounded-[var(--radius-md)] px-3.5 py-2.5">
              <div className="text-center">
                <p className="text-[11px] text-white/50 leading-none mb-1">ล้างรถ</p>
                <p className="text-base font-extrabold text-white leading-none">{summary.totalWashCount}</p>
              </div>
              <div className="w-px h-8 bg-white/15" aria-hidden="true" />
              <div className="text-center">
                <p className="text-[11px] text-white/50 leading-none mb-1">ขัดสี</p>
                <p className="text-base font-extrabold text-white leading-none">{summary.totalPolishCount}</p>
              </div>
            </div>
          )}
          <button onClick={onExport} className="flex items-center gap-2 text-sm font-bold text-white/70 bg-white/10 border border-white/10 px-3.5 py-3 rounded-[var(--radius-md)] active:scale-95 transition-transform" aria-label="ดาวน์โหลด Excel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h2"/><path d="M8 17h2"/><path d="M14 13h2"/><path d="M14 17h2"/></svg>
            Excel
          </button>
        </div>
      </div>
    </section>
  )
})

function FilterSection({ activeTab, search, setSearch, dateFrom, setDateFrom, dateTo, setDateTo, filterType, setFilterType }: any) {
  return (
    <section className="card p-4 space-y-3 fade-up delay-2" aria-label="ตัวกรอง">
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" width="16" height="16" viewBox="0 0 15 15" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3"/><path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={activeTab === 'income' ? 'ค้นหาทะเบียน หรือชื่อลูกค้า...' : 'ค้นหารายการจ่าย...'}
          className="input text-[15px] w-full" style={{ paddingLeft: '2.75rem' }}
          aria-label="ค้นหา"
        />
      </div>
      <div className="flex items-center gap-2">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input flex-1 text-sm py-2.5 text-center cursor-pointer !min-h-[44px]" aria-label="วันที่เริ่มต้น" />
        <span className="text-[var(--text-tertiary)] text-base font-bold shrink-0" aria-hidden="true">—</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input flex-1 text-sm py-2.5 text-center cursor-pointer !min-h-[44px]" aria-label="วันที่สิ้นสุด" />
      </div>
      {activeTab === 'income' && (
        <div className="flex gap-2" role="group" aria-label="กรองประเภท">
          {(['all','wash','polish'] as FilterType[]).map(t => (
            <button key={t} onClick={() => setFilterType(t)} aria-pressed={filterType === t}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-150 border-2 ${
                filterType === t
                  ? (t === 'all' ? 'bg-[var(--text-primary)] text-white border-transparent' : t === 'wash' ? 'bg-[var(--accent-light)] text-[var(--accent)] border-blue-200' : 'bg-[var(--amber-light)] text-[var(--amber)] border-amber-200')
                  : 'bg-white text-[var(--text-secondary)] border-[var(--border)]'
              }`}
            >{t === 'all' ? 'ทั้งหมด' : t === 'wash' ? 'ล้างรถ' : 'ขัดสี'}</button>
          ))}
        </div>
      )}
    </section>
  )
}

function HistoryList({ loading, grouped, activeTab, onItemClick }: any) {
  if (loading) {
    return (
      <section className="space-y-3 fade-up delay-3" aria-busy="true" aria-label="กำลังโหลดรายการ">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-[76px]" />)}
      </section>
    )
  }

  if (Object.keys(grouped).length === 0) {
    return (
      <section className="fade-up delay-3">
        <div className="card p-14 text-center border-dashed border-2">
          <p className="text-4xl mb-3 opacity-20" aria-hidden="true">📂</p>
          <p className="text-base font-bold text-[var(--text-primary)]">ไม่พบรายการ</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1.5">ลองเปลี่ยนตัวกรองดูครับ</p>
        </div>
      </section>
    )
  }

  return (
    <section className="fade-up delay-3" aria-label="รายการประวัติ">
      {Object.entries(grouped).map(([date, items]: [string, any]) => {
        const dayTotal = items.reduce((s: number, i: any) => s + ('price' in i ? i.price : i.amount), 0)
        const dayWash  = items.filter((i: any) => 'type' in i && i.type === 'wash').length
        const dayPol   = items.filter((i: any) => 'type' in i && i.type === 'polish').length

        return (
          <div key={date} className="mb-6">
            <div className="sticky top-2 z-10 glass py-2.5 mb-2.5 rounded-xl px-1">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-[var(--text-secondary)] shrink-0">{date}</span>
                <div className="h-px flex-1 bg-[var(--border)]" aria-hidden="true" />
                <div className="flex items-center gap-2.5">
                  {activeTab === 'income' && <span className="text-[11px] text-[var(--text-tertiary)] font-medium shrink-0">ล้าง {dayWash} · ขัด {dayPol}</span>}
                  <span className={`text-sm font-bold shrink-0 ${activeTab === 'income' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>฿{dayTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="grid gap-2.5">
              {items.map((item: any) => (
                <div key={item.id}>
                  {activeTab === 'income' ? (
                    <div onClick={() => onItemClick(item)} className="cursor-pointer"><RecordCard record={item as AppRecord} /></div>
                  ) : (
                    <div onClick={() => onItemClick(item)} role="button" tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onItemClick(item)}
                      className="card flex items-center justify-between px-5 py-4 cursor-pointer active:scale-[0.985] transition-transform"
                      aria-label={`${item.title} ${item.amount} บาท`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-[var(--red-light)] flex items-center justify-center shrink-0" aria-hidden="true">
                          <span className="text-xl leading-none">{getExpenseIcon(item.title)}</span>
                        </div>
                        <div>
                          <p className="text-base font-bold text-[var(--text-primary)] leading-tight">{item.title}</p>
                          <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5 font-medium">
                            {new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                          </p>
                        </div>
                      </div>
                      <p className="text-base font-extrabold text-[var(--red)]">−฿{item.amount.toLocaleString()}</p>
                    </div>
                  )}
                  {/* Audit Trail */}
                  {(item.created_by_email || item.updated_by_email) && (
                    <div className="flex items-center justify-end gap-3 px-2 mt-1.5 text-[11px] font-semibold text-[var(--text-tertiary)] opacity-60">
                      {item.created_by_email && <span>➕ {item.created_by_email.split('@')[0]}</span>}
                      {item.updated_by_email && <span>✏️ {item.updated_by_email.split('@')[0]}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}

const ErrorBanner = memo(function ErrorBanner({ error }: { error: string }) {
  if (!error) return null
  return (
    <div className="fixed bottom-28 left-4 right-4 max-w-2xl mx-auto p-4 rounded-[var(--radius-md)] bg-[var(--red)] text-white text-base font-bold text-center fade-up" role="alert" aria-live="assertive">
      {error}
    </div>
  )
})

function ExportModal({ activeTab, defaultYear, defaultMonth, onClose, onExport }: any) {
  const [startYear, setStartYear] = useState(defaultYear)
  const [startMonth, setStartMonth] = useState(defaultMonth)
  const [endYear, setEndYear] = useState(defaultYear)
  const [endMonth, setEndMonth] = useState(defaultMonth)
  const [isExporting, setIsExporting] = useState(false)

  const EXPORT_MONTH_OPTIONS = MONTH_OPTIONS.filter(m => m.value !== 0)

  const handleConfirm = async () => {
    // Validate range
    const start = new Date(startYear, startMonth - 1, 1).getTime()
    const end = new Date(endYear, endMonth - 1, 1).getTime()
    if (end < start) {
      alert('เดือนที่สิ้นสุดต้องอยู่หลังจากเดือนที่เริ่มต้น')
      return
    }

    setIsExporting(true)
    await onExport(startYear, startMonth, endYear, endMonth)
    setIsExporting(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-md rounded-[28px] p-6 slide-up shadow-2xl">
        <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-4 text-center">
          ส่งออกข้อมูล (Excel)
        </h2>
        <p className="text-sm font-medium text-[var(--text-tertiary)] mb-6 text-center">
          เลือกระยะเวลาที่ต้องการดาวน์โหลดข้อมูล{activeTab === 'income' ? 'รายรับ' : 'รายจ่าย'}
        </p>

        <div className="space-y-4 mb-6 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-[2px] h-[40px] bg-[var(--border)] -z-10 hidden sm:block" />
          
          <div className="card bg-[var(--surface-2)] p-4 border border-[var(--border)] relative z-0">
            <label className="block text-[13px] font-bold text-[var(--text-secondary)] mb-2">ตั้งแต่ (เริ่มต้น)</label>
            <div className="flex gap-2">
              <select value={startMonth} onChange={e => setStartMonth(parseInt(e.target.value))} className="input py-2.5 px-3 text-sm flex-1 font-bold">
                {EXPORT_MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select value={startYear} onChange={e => setStartYear(parseInt(e.target.value))} className="input py-2.5 px-3 text-sm flex-1 font-bold">
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y + 543}</option>)}
              </select>
            </div>
          </div>

          <div className="card bg-[var(--surface-2)] p-4 border border-[var(--border)] relative z-0">
            <label className="block text-[13px] font-bold text-[var(--text-secondary)] mb-2">ถึง (สิ้นสุด)</label>
            <div className="flex gap-2">
              <select value={endMonth} onChange={e => setEndMonth(parseInt(e.target.value))} className="input py-2.5 px-3 text-sm flex-1 font-bold">
                {EXPORT_MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select value={endYear} onChange={e => setEndYear(parseInt(e.target.value))} className="input py-2.5 px-3 text-sm flex-1 font-bold">
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y + 543}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-xl font-bold text-[var(--text-secondary)] bg-[var(--surface-2)] active:scale-95 transition-transform">
            ยกเลิก
          </button>
          <button onClick={handleConfirm} disabled={isExporting} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-[var(--accent)] active:scale-95 transition-transform flex justify-center items-center gap-2">
            {isExporting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'ดาวน์โหลด'}
          </button>
        </div>
      </div>
    </div>
  )
}