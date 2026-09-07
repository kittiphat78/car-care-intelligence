import { memo } from 'react'
import { MONTH_OPTIONS, YEAR_OPTIONS } from './constants'

interface HistoryHeaderProps {
  selectedMonth: number
  setSelectedMonth: (v: number) => void
  selectedYear: number
  setSelectedYear: (v: number) => void
}

export const Header = memo(function Header({ selectedMonth, setSelectedMonth, selectedYear, setSelectedYear }: HistoryHeaderProps) {
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
