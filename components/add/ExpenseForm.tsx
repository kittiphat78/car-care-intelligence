import { Card, SectionLabel } from './Shared'

const EXPENSE_PRESETS = [
  { icon: '💧', label: 'ค่าน้ำยา' },
  { icon: '👷', label: 'ค่าแรง' },
  { icon: '🍚', label: 'ค่าข้าว' },
  { icon: '🏠', label: 'ค่าเช่า' },
  { icon: '⚡', label: 'ค่าไฟ' },
  { icon: '🚰', label: 'ค่าน้ำ' },
  { icon: '🗑️', label: 'ค่าขยะ' },
  { icon: '🛒', label: 'อุปกรณ์' },
]

export interface ExpenseFormProps {
  states: { title: string; amount: string; note: string }
  setters: { setTitle: (v: string) => void; setAmount: (v: string) => void; setNote: (v: string) => void }
}

export function ExpenseForm({ states, setters }: ExpenseFormProps) {
  return (
    <div className="space-y-4 fade-up" id="expense-panel" role="tabpanel">
      <Card>
        <SectionLabel required>จำนวนเงินที่จ่าย (บาท)</SectionLabel>
        <div className="relative flex items-center bg-[var(--red-light)] rounded-xl border-2 border-transparent focus-within:border-[var(--red)] focus-within:bg-[var(--surface)] transition-all mt-2 h-[64px]">
          <span className="absolute left-4 text-xl font-bold text-[var(--red)]/30 select-none" aria-hidden="true">฿</span>
          <input
            type="text"
            inputMode="numeric"
            value={states.amount}
            onChange={e => setters.setAmount(e.target.value.replace(/\D/g, ''))}
            placeholder="0"
            className="w-full text-right text-2xl font-extrabold text-[var(--red)] py-3.5 pr-5 bg-transparent placeholder:text-red-200"
            style={{ paddingLeft: '2.5rem' }}
            aria-required="true"
            aria-label="จำนวนเงิน"
          />
        </div>
      </Card>

      <Card>
        <SectionLabel required>จ่ายค่าอะไร</SectionLabel>
        <div className="flex flex-wrap gap-2 mt-2 mb-3">
          {EXPENSE_PRESETS.map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setters.setTitle(states.title === preset.label ? '' : preset.label)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-150 active:scale-95
                ${states.title === preset.label
                  ? 'bg-[var(--red)] text-white border-[var(--red)] shadow-md shadow-red-500/15'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)]'
                }`}
              aria-pressed={states.title === preset.label}
            >
              <span className="text-base" aria-hidden="true">{preset.icon}</span>{preset.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={states.title}
          onChange={e => setters.setTitle(e.target.value)}
          placeholder="หรือพิมพ์ชื่อรายการเอง..."
          className="input"
          aria-label="ชื่อรายการจ่าย"
        />
      </Card>

      <Card>
        <SectionLabel>หมายเหตุ (ถ้ามี)</SectionLabel>
        <input type="text" value={states.note} onChange={e => setters.setNote(e.target.value)} placeholder="..." className="input mt-2" aria-label="หมายเหตุรายจ่าย" />
      </Card>
    </div>
  )
}
