'use client'

import { useCallback, useState, useMemo } from 'react'
import { Record as AppRecord, Expense } from '@/types'
import EditModal from '@/components/EditModal'
import { useToast } from '@/hooks/useToast'
import { loadExportRange } from '@/features/history/api'
import { toAppError, toUserMessage } from '@/lib/errors'
import { reportAppError } from '@/lib/observability'
import { addDays, bangkokParts, startOfBangkokDay } from '@/lib/time/bangkok'

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
  const { info: toastInfo, error: toastError } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('income')
  const [search, setSearch] = useState('')
  const [selectedYear, setSelectedYear] = useState(() => bangkokParts().year)
  const [selectedMonth, setSelectedMonth] = useState(() => bangkokParts().month)
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
    selectedMonth === 0 ? records : records.filter(r => bangkokParts(r.created_at).month === selectedMonth)
    , [records, selectedMonth])

  const currentMonthExpenses = useMemo(() =>
    selectedMonth === 0 ? expenses : expenses.filter(e => bangkokParts(e.created_at).month === selectedMonth)
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
    // ช่วงวันที่เป็นวันไทยเต็มวัน: ตั้งแต่ 00:00 ของวันเริ่ม ถึงก่อน 00:00 ของวันถัดจากวันสิ้นสุด (ER-10)
    const fromTime = dateFrom ? startOfBangkokDay(dateFrom).getTime() : 0
    const toTime = dateTo ? startOfBangkokDay(addDays(dateTo, 1)).getTime() - 1 : Infinity
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
      const d = bangkokParts(item.created_at)
      const date = `${d.day} ${MONTH_OPTIONS[d.month].label} ${d.year + 543}`
      if (!acc[date]) acc[date] = []
      acc[date].push(item)
      return acc
    }, {} as globalThis.Record<string, (AppRecord | Expense)[]>)
    , [filteredItems])

  const openModal = useCallback((item: AppRecord | Expense) => { setSelectedItem(item); setIsModalOpen(true) }, [])
  const closeModal = useCallback(() => setIsModalOpen(false), [])

  const handleExport = useCallback(async (startYear: number, startMonth: number, endYear: number, endMonth: number, mode: 'bank' | 'internal') => {
    const getMonthName = (m: number) => MONTH_OPTIONS.find(opt => opt.value === m)?.label || ''
    const startStr = `${getMonthName(startMonth)}${startYear + 543}`
    const endStr = `${getMonthName(endMonth)}${endYear + 543}`
    const rangeLabel = startStr === endStr ? startStr : `ตั้งแต่${startStr}_ถึง${endStr}`

    // โหลดไม่ครบ = ไม่สร้างไฟล์ เพื่อไม่ให้ได้ไฟล์ที่ขาดรายรับหรือรายจ่ายโดยไม่รู้ตัว (ER-07)
    const result = await loadExportRange(startYear, startMonth, endYear, endMonth)
    if (!result.ok) {
      console.error('[History] Export Fetch Error:', result.error)
      reportAppError(result.error)
      toastError('ส่งออกไม่สำเร็จ: ' + toUserMessage(result.error))
      return
    }

    const { records, expenses } = result.data
    if (records.length === 0 && expenses.length === 0) {
      toastInfo('ไม่พบข้อมูลในช่วงเวลาที่เลือก')
      setIsExportModalOpen(false)
      return
    }

    const fileName = mode === 'internal' ? `รายงานภายใน_${rangeLabel}` : `สรุปรายรับและรายจ่าย_${rangeLabel}`

    try {
      const { exportToExcel } = await import('@/lib/export')
      await exportToExcel({ records, expenses }, fileName, mode)
      setIsExportModalOpen(false)
    } catch (e) {
      console.error('[History] Export Error:', e)
      const appErr = toAppError(e)
      reportAppError(appErr)
      toastError('สร้างไฟล์ไม่สำเร็จ: ' + toUserMessage(appErr))
    }
  }, [toastInfo, toastError])


  return (
    <div className="min-h-dvh px-4 pt-6 space-y-4 content-with-nav">
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
          defaultMonth={selectedMonth === 0 ? bangkokParts().month : selectedMonth}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExport}
        />
      )}
    </div>
  )
}