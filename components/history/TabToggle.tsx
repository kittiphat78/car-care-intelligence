import { memo } from 'react'
import { TabType } from './constants'

export const TabToggle = memo(function TabToggle({ activeTab, switchTab }: { activeTab: TabType; switchTab: (t: TabType) => void }) {
  return (
    <div className="segmented-control fade-up delay-1" role="tablist" aria-label="สลับประเภทรายการ">
      <button
        role="tab"
        aria-selected={activeTab === 'income'}
        aria-pressed={activeTab === 'income'}
        onClick={() => switchTab('income')}
        style={activeTab === 'income' ? { color: 'var(--accent)' } : undefined}
      >
        💰 รายรับ
      </button>
      <button
        role="tab"
        aria-selected={activeTab === 'expense'}
        aria-pressed={activeTab === 'expense'}
        onClick={() => switchTab('expense')}
        style={activeTab === 'expense' ? { color: 'var(--red)' } : undefined}
      >
        💸 รายจ่าย
      </button>
    </div>
  )
})
