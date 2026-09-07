import React from 'react'

export function ServiceTypeButton({ active, onClick, icon, label, sublabel, color }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; sublabel: string; color: 'accent' | 'amber'
}) {
  const colors = color === 'accent'
    ? { border: 'border-[var(--accent)]', bg: 'bg-[var(--accent-light)]', iconBg: active ? 'bg-[var(--accent)] text-white shadow-lg shadow-blue-500/30' : 'bg-[var(--surface-2)] text-[var(--text-tertiary)]', text: 'text-[var(--accent)]' }
    : { border: 'border-[var(--amber)]', bg: 'bg-[var(--amber-light)]', iconBg: active ? 'bg-[var(--amber)] text-white shadow-lg shadow-amber-500/30' : 'bg-[var(--surface-2)] text-[var(--text-tertiary)]', text: 'text-[var(--amber)]' }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-3.5 p-4 rounded-[var(--radius-xl)] border-2 transition-all duration-150 active:scale-[0.97]
        ${active ? `${colors.border} ${colors.bg}` : 'border-[var(--border)] bg-[var(--surface)]'
        }`}
      aria-pressed={active}
      aria-label={`${label} ${sublabel}`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 ${colors.iconBg}`}>{icon}</div>
      <div className="text-left">
        <p className={`text-base font-extrabold tracking-tight leading-tight ${active ? colors.text : 'text-[var(--text-primary)]'}`}>{label}</p>
        <p className="text-xs font-medium text-[var(--text-tertiary)] mt-0.5">{sublabel}</p>
      </div>
    </button>
  )
}
