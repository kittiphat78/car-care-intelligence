import { memo } from 'react'
import { useDashboard } from '@/hooks/useDashboard'
import { RefreshIcon } from '@/components/icons/DashboardIcons'
import RecordCard from '@/components/RecordCard'

export const RecordListSection = memo(function RecordListSection({ dash }: { dash: ReturnType<typeof useDashboard> }) {
  return (
    <section className="fade-up delay-5 mt-6" aria-label="รายการวันนี้">
      <div className="section-header mb-4">
        <div className="flex items-center gap-2.5">
          <h3>รายการวันนี้</h3>
          <span className="badge text-[13px]" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{dash.records.length}</span>
        </div>
        <button onClick={() => dash.refresh()} className="flex items-center gap-2 text-sm text-[var(--accent)] font-bold py-1.5 active:scale-95 transition-transform" aria-label="รีเฟรชข้อมูล">
          <RefreshIcon /> รีเฟรช
        </button>
      </div>
      {dash.records.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-icon" aria-hidden="true">🚗</p>
          <p className="empty-state-title">ยังไม่มีงานวันนี้</p>
          <p className="empty-state-desc">กด + เพื่อเพิ่มรายการใหม่</p>
        </div>
      ) : (
        <div className="grid gap-3">{dash.records.map(r => <RecordCard key={r.id} record={r} />)}</div>
      )}
    </section>
  )
})
