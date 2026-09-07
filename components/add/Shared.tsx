import { ReactNode } from 'react'

export type FormMode = 'income' | 'expense'

export const SectionLabel = ({ children, required }: { children: ReactNode; required?: boolean }) => (
  <label className="block text-[12px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2.5">
    {children} {required && <span className="text-[var(--red)] normal-case text-sm">*</span>}
  </label>
)

export const Card = ({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) => (
  <div className={`bg-[var(--surface)] rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-sm)] border border-[var(--border)] ${className}`} onClick={onClick}>{children}</div>
)
