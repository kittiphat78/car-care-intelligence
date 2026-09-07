import { TabType, FilterType } from './constants'

interface FilterSectionProps {
  activeTab: TabType
  search: string
  setSearch: (v: string) => void
  dateFrom: string
  setDateFrom: (v: string) => void
  dateTo: string
  setDateTo: (v: string) => void
  filterType: FilterType
  setFilterType: (v: FilterType) => void
}

export function FilterSection({ activeTab, search, setSearch, dateFrom, setDateFrom, dateTo, setDateTo, filterType, setFilterType }: FilterSectionProps) {
  return (
    <section className="card p-4 space-y-3 fade-up delay-2" aria-label="ตัวกรอง">
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" width="16" height="16" viewBox="0 0 15 15" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3" /><path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
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
          {(['all', 'wash', 'polish'] as FilterType[]).map(t => (
            <button key={t} onClick={() => setFilterType(t)} aria-pressed={filterType === t}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-150 border-2 ${filterType === t
                  ? (t === 'all' ? 'bg-[var(--text-primary)] text-white border-transparent' : t === 'wash' ? 'bg-[var(--accent-light)] text-[var(--accent)] border-blue-200' : 'bg-[var(--amber-light)] text-[var(--amber)] border-amber-200')
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)]'
                }`}
            >{t === 'all' ? 'ทั้งหมด' : t === 'wash' ? 'ล้างรถ' : 'ขัดสี'}</button>
          ))}
        </div>
      )}
    </section>
  )
}
