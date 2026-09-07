import { memo, useRef, useCallback } from 'react'
import { Card, SectionLabel } from './Shared'

const displayThaiDate = (isoDate: string) => {
  if (!isoDate) return '-'
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${parseInt(y, 10) + 543}`
}

export const DatePicker = memo(function DatePicker({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const openPicker = useCallback(() => ref.current?.showPicker(), [])
  return (
    <Card className="flex items-center justify-between cursor-pointer group" onClick={openPicker}>
      <div>
        <SectionLabel>วันที่ทำรายการ</SectionLabel>
        <div className="flex items-baseline gap-2.5">
          <span className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">{displayThaiDate(date)}</span>
          <span className="text-sm font-bold text-[var(--accent)]">เปลี่ยน</span>
        </div>
      </div>
      <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-tertiary)]" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
      </div>
      <input ref={ref} type="date" value={date} onChange={e => onChange(e.target.value)} className="absolute opacity-0 w-0 h-0 pointer-events-none" tabIndex={-1} aria-hidden="true" />
    </Card>
  )
})
