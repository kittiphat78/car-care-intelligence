import { useState } from 'react'
import { TabType, MONTH_OPTIONS, YEAR_OPTIONS } from './constants'
import { useToast } from '@/hooks/useToast'

interface ExportModalProps {
  activeTab: TabType
  defaultYear: number
  defaultMonth: number
  onClose: () => void
  onExport: (startYear: number, startMonth: number, endYear: number, endMonth: number, mode: 'bank' | 'internal') => Promise<void>
}

export function ExportModal({ activeTab, defaultYear, defaultMonth, onClose, onExport }: ExportModalProps) {
  const { error: toastError } = useToast()
  const [startYear, setStartYear] = useState(defaultYear)
  const [startMonth, setStartMonth] = useState(defaultMonth)
  const [endYear, setEndYear] = useState(defaultYear)
  const [endMonth, setEndMonth] = useState(defaultMonth)
  const [exportMode, setExportMode] = useState<'bank' | 'internal'>('bank')
  const [isExporting, setIsExporting] = useState(false)

  const EXPORT_MONTH_OPTIONS = MONTH_OPTIONS.filter(m => m.value !== 0)

  const handleConfirm = async () => {
    // Validate range
    const start = new Date(startYear, startMonth - 1, 1).getTime()
    const end = new Date(endYear, endMonth - 1, 1).getTime()
    if (end < start) {
      toastError('เดือนที่สิ้นสุดต้องอยู่หลังจากเดือนที่เริ่มต้น')
      return
    }

    setIsExporting(true)
    await onExport(startYear, startMonth, endYear, endMonth, exportMode)
    setIsExporting(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[var(--surface)] w-full max-w-md rounded-[28px] p-6 slide-up shadow-2xl">
        <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-4 text-center">
          ส่งออกข้อมูล (Excel)
        </h2>

        {/* Mode Selection */}
        <div className="flex bg-[var(--surface-2)] p-1 rounded-xl gap-1 mb-5">
          <button onClick={() => setExportMode('bank')} className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${exportMode === 'bank' ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-tertiary)]'}`}>ฉบับให้ธนาคารดู</button>
          <button onClick={() => setExportMode('internal')} className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${exportMode === 'internal' ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-tertiary)]'}`}>ฉบับดูภายใน (Dashboard)</button>
        </div>

        <p className="text-sm font-medium text-[var(--text-tertiary)] mb-6 text-center">
          {exportMode === 'bank' ? `เลือกระยะเวลาที่ต้องการดาวน์โหลดข้อมูล${activeTab === 'income' ? 'รายรับ' : 'รายจ่าย'}` : 'ดาวน์โหลดรายงานสรุปภาพรวมพร้อมข้อมูลดิบ'}
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
