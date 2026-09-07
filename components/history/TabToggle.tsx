import { memo } from 'react'
import { TabType } from './constants'

export const TabToggle = memo(function TabToggle({ activeTab, switchTab }: { activeTab: TabType; switchTab: (t: TabType) => void }) {
  return (
    <div className="flex bg-[var(--surface-2)] p-1.5 rounded-2xl gap-1.5 fade-up delay-1" role="tablist" aria-label="สลับประเภทรายการ">
      <button role="tab" aria-selected={activeTab === 'income'} onClick={() => switchTab('income')} className={`flex-1 py-3.5 rounded-xl text-base font-bold transition-all duration-150 ${activeTab === 'income' ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-tertiary)]'}`}>
        💰 รายรับ
      </button>
      <button role="tab" aria-selected={activeTab === 'expense'} onClick={() => switchTab('expense')} className={`flex-1 py-3.5 rounded-xl text-base font-bold transition-all duration-150 ${activeTab === 'expense' ? 'bg-[var(--surface)] text-[var(--red)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-tertiary)]'}`}>
        💸 รายจ่าย
      </button>
    </div>
  )
})
