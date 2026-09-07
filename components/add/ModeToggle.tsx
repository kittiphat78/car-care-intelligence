import { memo } from 'react'
import { FormMode } from './Shared'

export const ModeToggle = memo(function ModeToggle({ mode, onChange }: { mode: FormMode; onChange: (m: FormMode) => void }) {
  return (
    <div className="flex bg-[var(--surface-2)] p-1.5 rounded-2xl gap-1.5" role="tablist" aria-label="เลือกรายรับหรือรายจ่าย">
      <button
        role="tab" aria-selected={mode === 'income'} aria-controls="income-panel"
        onClick={() => onChange('income')}
        className={`flex-1 py-3.5 rounded-xl text-base font-bold transition-all duration-150 active:scale-[0.98] ${mode === 'income' ? 'bg-[var(--surface)] text-[var(--accent)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-tertiary)]'
          }`}
      >💰 รายรับ</button>
      <button
        role="tab" aria-selected={mode === 'expense'} aria-controls="expense-panel"
        onClick={() => onChange('expense')}
        className={`flex-1 py-3.5 rounded-xl text-base font-bold transition-all duration-150 active:scale-[0.98] ${mode === 'expense' ? 'bg-[var(--surface)] text-[var(--red)] shadow-[var(--shadow-sm)]' : 'text-[var(--text-tertiary)]'
          }`}
      >💸 รายจ่าย</button>
    </div>
  )
})
