import { memo } from 'react'
import { FormMode } from './Shared'

export const ModeToggle = memo(function ModeToggle({ mode, onChange }: { mode: FormMode; onChange: (m: FormMode) => void }) {
  return (
    <div className="segmented-control" role="tablist" aria-label="เลือกรายรับหรือรายจ่าย">
      <button
        role="tab" aria-selected={mode === 'income'} aria-controls="income-panel"
        aria-pressed={mode === 'income'}
        onClick={() => onChange('income')}
        style={mode === 'income' ? { color: 'var(--accent)' } : undefined}
      >💰 รายรับ</button>
      <button
        role="tab" aria-selected={mode === 'expense'} aria-controls="expense-panel"
        aria-pressed={mode === 'expense'}
        onClick={() => onChange('expense')}
        style={mode === 'expense' ? { color: 'var(--red)' } : undefined}
      >💸 รายจ่าย</button>
    </div>
  )
})
