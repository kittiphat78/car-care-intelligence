import { FormMode } from './Shared'
import { PlusSmIcon, SaveIcon, Spinner } from './Icons'

export function ActionButtons({ mode, saving, onSubmit }: { mode: FormMode; saving: boolean; onSubmit: (isBulk: boolean) => void }) {
  return (
    <div className="flex gap-3">
      <button
        onClick={() => onSubmit(true)}
        disabled={saving}
        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[var(--surface)] border-2 border-[var(--border)] rounded-2xl text-[15px] font-bold text-[var(--text-secondary)] active:scale-[0.98] transition-transform disabled:opacity-50"
        aria-label="บันทึกแล้วทำรายการต่อ"
        aria-busy={saving}
      >
        {saving ? <Spinner /> : <PlusSmIcon />}
        บันทึกแล้วทำต่อ
      </button>
      <button
        onClick={() => onSubmit(false)}
        disabled={saving}
        className={`flex-[1.5] flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[15px] font-bold text-white shadow-lg active:scale-[0.98] transition-transform disabled:opacity-70
          ${mode === 'expense' ? 'bg-[var(--red)] shadow-red-500/20' : 'bg-[var(--accent)] shadow-blue-500/20'}`}
        aria-label="บันทึกและกลับหน้าหลัก"
        aria-busy={saving}
      >
        {saving ? <Spinner white /> : <SaveIcon />}
        บันทึก & กลับหน้าหลัก
      </button>
    </div>
  )
}
