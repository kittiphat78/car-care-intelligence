'use client'

import { useCallback, useState, useMemo } from 'react'
import { Record as AppRecord, Expense } from '@/types'
import { exportToExcel } from '@/lib/export'
import EditModal from '@/components/EditModal'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'

import { TabType, FilterType, MONTH_OPTIONS } from '@/components/history/constants'
import { useHistoryData } from '@/hooks/useHistoryData'
import { Header } from '@/components/history/Header'
import { TabToggle } from '@/components/history/TabToggle'
import { SummaryCard } from '@/components/history/SummaryCard'
import { FilterSection } from '@/components/history/FilterSection'
import { HistoryList } from '@/components/history/HistoryList'
import { ExportModal } from '@/components/history/ExportModal'
import { ErrorBanner } from '@/components/ui/ErrorBanner'

export default function HistoryPage() {
  const { info: toastInfo } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('income')
  const [search, setSearch] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedItem, setSelectedItem] = useState<AppRecord | Expense | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
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

  const summary = useMemo(() => {
    const washRecords = currentMonthRecords.filter(r => r.type === 'wash')
    const polishRecords = currentMonthRecords.filter(r => r.type === 'polish')

    return {
      totalIncome: currentMonthRecords.reduce((s, r) => s + r.price, 0),
      totalExpense: currentMonthExpenses.reduce((s, e) => s + e.amount, 0),
      totalWashCount: washRecords.length,
      totalPolishCount: polishRecords.length,
      totalWashRevenue: washRecords.reduce((s, r) => s + r.price, 0),
      totalPolishRevenue: polishRecords.reduce((s, r) => s + r.price, 0),
    }
  }, [currentMonthRecords, currentMonthExpenses])

  const filteredItems = useMemo(() => {
    const fromTime = dateFrom ? new Date(dateFrom).getTime() : 0
    const toTime = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : Infinity
    const sl = search.toLowerCase()

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
      const d = new Date(item.created_at)
      const date = `${d.getDate()} ${MONTH_OPTIONS[d.getMonth() + 1].label} ${d.getFullYear() + 543}`
      if (!acc[date]) acc[date] = []
      acc[date].push(item)
      return acc
    }, {} as globalThis.Record<string, (AppRecord | Expense)[]>)
    , [filteredItems])

  const openModal = useCallback((item: AppRecord | Expense) => { setSelectedItem(item); setIsModalOpen(true) }, [])
  const closeModal = useCallback(() => setIsModalOpen(false), [])

  const handleExport = useCallback(async (startYear: number, startMonth: number, endYear: number, endMonth: number, mode: 'bank' | 'internal') => {
    const startDate = new Date(startYear, startMonth - 1, 1).toISOString()
    const endDate = new Date(endYear, endMonth, 1).toISOString()

    const getMonthName = (m: number) => MONTH_OPTIONS.find(opt => opt.value === m)?.label || ''
    const startStr = `${getMonthName(startMonth)}${startYear + 543}`
    const endStr = `${getMonthName(endMonth)}${endYear + 543}`
    const rangeLabel = startStr === endStr ? startStr : `ตั้งแต่${startStr}_ถึง${endStr}`

    const [{ data: records }, { data: expenses }] = await Promise.all([
      supabase.from('records').select('*').gte('created_at', startDate).lt('created_at', endDate).order('created_at', { ascending: true }),
      supabase.from('expenses').select('*').gte('created_at', startDate).lt('created_at', endDate).order('created_at', { ascending: true })
    ])

    if ((!records || records.length === 0) && (!expenses || expenses.length === 0)) {
      toastInfo('ไม่พบข้อมูลในช่วงเวลาที่เลือก')
      setIsExportModalOpen(false)
      return
    }

    const exportData = { records: records || [], expenses: expenses || [] }
    const fileName = mode === 'internal' ? `รายงานภายใน_${rangeLabel}` : `สรุปรายรับและรายจ่าย_${rangeLabel}`

    exportToExcel(exportData, fileName, mode)
    setIsExportModalOpen(false)
  }, [toastInfo])


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
      <HistoryList
        loading={loading} grouped={grouped} activeTab={activeTab} onItemClick={openModal}
      />
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