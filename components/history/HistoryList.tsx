import { Record as AppRecord, Expense } from '@/types'
import { TabType, getExpenseIcon } from './constants'
import RecordCard from '@/components/RecordCard'

interface HistoryListProps {
  loading: boolean
  grouped: globalThis.Record<string, (AppRecord | Expense)[]>
  activeTab: TabType
  onItemClick: (item: AppRecord | Expense) => void
}

export function HistoryList({ loading, grouped, activeTab, onItemClick }: HistoryListProps) {
  if (loading) {
    return (
      <section className="space-y-3 fade-up delay-3" aria-busy="true" aria-label="กำลังโหลดรายการ">
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-[76px]" />)}
      </section>
    )
  }

  if (Object.keys(grouped).length === 0) {
    return (
      <section className="fade-up delay-3">
        <div className="card p-14 text-center border-dashed border-2 border-[var(--border)]">
          <p className="text-4xl mb-3 opacity-20" aria-hidden="true">📂</p>
          <p className="text-base font-bold text-[var(--text-primary)]">ไม่พบรายการ</p>
          <p className="text-sm text-[var(--text-tertiary)] mt-1.5">ลองเปลี่ยนตัวกรองดูครับ</p>
        </div>
      </section>
    )
  }

  return (
    <section className="fade-up delay-3" aria-label="รายการประวัติ">
      {Object.entries(grouped).map(([date, items]) => {
        const dayTotal = items.reduce((s, i) => s + ('price' in i ? (i as AppRecord).price : (i as Expense).amount), 0)
        const dayWash = items.filter((i) => 'type' in i && (i as AppRecord).type === 'wash').length
        const dayPol = items.filter((i) => 'type' in i && (i as AppRecord).type === 'polish').length

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
              {items.map((item) => {
                return (
                  <div key={item.id}>
                    {activeTab === 'income' ? (
                      <div className="cursor-pointer" onClick={() => onItemClick(item)}>
                        <RecordCard record={item as AppRecord} />
                      </div>
                    ) : (
                      <div onClick={() => onItemClick(item)} role="button" tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onItemClick(item)}
                        className="card bg-[var(--surface)] cursor-pointer transition-all duration-150 active:scale-[0.985] overflow-hidden"
                        aria-label={`${(item as Expense).title} ${(item as Expense).amount} บาท`}
                      >
                        {/* Accent bar */}
                        <div className="h-[3px] w-full bg-[var(--red)]" aria-hidden="true" />

                        <div className="flex items-center gap-3.5 px-4 py-4 sm:px-5">
                          {/* Icon */}
                          <div className="w-12 h-12 min-w-[48px] rounded-2xl bg-[var(--red-light)] flex items-center justify-center text-xl shrink-0" aria-hidden="true">
                            {getExpenseIcon((item as Expense).title)}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="badge badge-unpaid">รายจ่าย</span>
                            </div>
                            <p className="font-extrabold text-[var(--text-primary)] text-[17px] tracking-wide leading-tight truncate">
                              {(item as Expense).title}
                            </p>
                          </div>

                          {/* Price */}
                          <div className="text-right shrink-0">
                            <p className="text-lg font-extrabold leading-tight text-[var(--red)]">
                              −฿{(item as Expense).amount.toLocaleString()}
                            </p>
                            <p className="text-[12px] text-[var(--text-tertiary)] mt-1 font-medium">
                              {new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {(item.created_by_email || item.updated_by_email) && (
                      <div className="flex items-center justify-end gap-3 px-2 mt-1.5 text-[11px] font-semibold text-[var(--text-tertiary)] opacity-60">
                        {item.created_by_email && <span>➕ {item.created_by_email.split('@')[0]}</span>}
                        {item.updated_by_email && <span>✏️ {item.updated_by_email.split('@')[0]}</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}
