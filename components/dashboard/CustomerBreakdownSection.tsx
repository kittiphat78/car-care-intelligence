import { memo, useState } from 'react'
import { CustomerBreakdownItem, CustomerTimePeriod } from '@/hooks/useDashboard'

const TOP_N = 5

export const CustomerBreakdownSection = memo(function CustomerBreakdownSection({
  data,
}: {
  data: CustomerBreakdownItem[]
}) {
  const [showAll, setShowAll] = useState(false)
  const activeCustomers = data.filter(d => d.month.total > 0)
  const displayed = showAll ? activeCustomers : activeCustomers.slice(0, TOP_N)
  const hasMore = activeCustomers.length > TOP_N

  return (
    <section className="fade-up delay-5 mt-6" aria-label="รายรับตามลูกค้า">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">รายรับตามลูกค้า</h3>
          {activeCustomers.length > 0 && (
            <span className="badge text-[12px]" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
              {activeCustomers.length} ราย
            </span>
          )}
        </div>
      </div>

      {activeCustomers.length === 0 ? (
        <div className="card p-10 text-center border-dashed border-2 border-[var(--border)]">
          <p className="text-3xl mb-2 opacity-20" aria-hidden="true">👥</p>
          <p className="text-sm font-bold text-[var(--text-tertiary)]">ยังไม่มีข้อมูลในช่วงนี้</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {displayed.map((item, idx) => (
              <CustomerBreakdownCard key={item.customerName} item={item} rank={idx + 1} />
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full mt-3 py-3 rounded-2xl border-2 border-dashed border-[var(--border)] text-[13px] font-bold text-[var(--text-tertiary)] active:scale-[0.98] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {showAll ? '▲ ย่อรายการ' : `▼ ดูทั้งหมด ${activeCustomers.length} ราย`}
            </button>
          )}
        </>
      )}
    </section>
  )
})

const PeriodDetail = memo(function PeriodDetail({
  title,
  period
}: {
  title: string
  period: CustomerTimePeriod
}) {
  if (period.total === 0) return null

  return (
    <div className="py-3 border-t border-[var(--border)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-bold text-[var(--text-secondary)]">{title}</span>
        <span className="text-[15px] font-black text-[var(--text-primary)]">฿{period.total.toLocaleString()}</span>
      </div>
      <div className="space-y-1.5 pl-1">
        {period.washCount > 0 && (
          <div className="flex items-center justify-between text-[13px]">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <span className="text-[11px]" aria-hidden="true">💧</span>
              <span>ล้างรถ ({period.washCount} คัน)</span>
            </div>
            <span className="font-semibold text-[var(--text-primary)]">฿{period.washAmount.toLocaleString()}</span>
          </div>
        )}
        {period.polishCount > 0 && (
          <div className="flex items-center justify-between text-[13px]">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <span className="text-[11px]" aria-hidden="true">✨</span>
              <span>ขัดสี ({period.polishCount} คัน)</span>
            </div>
            <span className="font-semibold text-[var(--text-primary)]">฿{period.polishAmount.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
})

const CustomerBreakdownCard = memo(function CustomerBreakdownCard({
  item,
  rank,
}: {
  item: CustomerBreakdownItem
  rank: number
}) {
  const [expanded, setExpanded] = useState(false)
  const isTop = rank === 1
  const customerInitial = item.customerName === 'ลูกค้าทั่วไป'
    ? '👤'
    : item.customerName.charAt(0)
  const monthData = item.month
  const totalCars = monthData.washCount + monthData.polishCount

  return (
    <article
      className="card p-0 overflow-hidden"
      aria-label={`รายรับจาก ${item.customerName}`}
    >
      {/* Top accent bar */}
      {isTop && (
        <div
          className="h-[3px]"
          style={{ background: 'linear-gradient(90deg, var(--accent), var(--amber))' }}
          aria-hidden="true"
        />
      )}

      {/* Clickable header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-4 pt-4 pb-4 sm:px-5 text-left active:bg-[var(--surface-2)] transition-colors duration-100"
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-base font-black shrink-0"
              style={
                isTop
                  ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }
                  : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
              }
            >
              {customerInitial}
            </div>
            <div>
              <p className="font-extrabold text-[15px] text-[var(--text-primary)] leading-tight">
                {item.customerName}
              </p>
              <p className="text-[12px] text-[var(--text-tertiary)] font-medium mt-0.5">
                บริการ {totalCars} คัน
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p
                className="text-xl font-black leading-tight"
                style={{ color: isTop ? 'var(--accent)' : 'var(--text-primary)' }}
              >
                ฿{monthData.total.toLocaleString()}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] font-medium mt-0.5">ยอดเดือนนี้</p>
            </div>
            <svg
              className={`w-5 h-5 text-[var(--text-tertiary)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Mini service pills (collapsed) */}
        {!expanded && monthData.total > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {monthData.washCount > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                💧 ล้าง {monthData.washCount}
              </span>
            )}
            {monthData.polishCount > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'var(--amber-light)', color: '#92400E' }}>
                ✨ ขัดสี {monthData.polishCount}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Expanded detail */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: expanded ? '500px' : '0', opacity: expanded ? 1 : 0 }}
      >
        <div className="px-4 pb-4 sm:px-5">
          {/* Progress bar: wash vs polish ratio for the month */}
          {monthData.washCount > 0 && monthData.polishCount > 0 && (
            <div className="mb-3 mt-1">
              <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: 'var(--surface-2)' }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${Math.round((monthData.washAmount / monthData.total) * 100)}%`,
                    background: 'var(--accent)',
                  }}
                  aria-hidden="true"
                />
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${Math.round((monthData.polishAmount / monthData.total) * 100)}%`,
                    background: 'var(--amber)',
                  }}
                  aria-hidden="true"
                />
              </div>
            </div>
          )}

          <PeriodDetail title="🗓️ สรุปยอดเดือนนี้" period={item.month} />
          {item.year.total > item.month.total && (
            <PeriodDetail title="📊 ภาพรวมสะสมปีนี้" period={item.year} />
          )}
        </div>
      </div>
    </article>
  )
})
