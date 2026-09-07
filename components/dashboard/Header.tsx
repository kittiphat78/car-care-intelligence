import { memo } from 'react'
import { useTheme } from '@/hooks/useTheme'

export const Header = memo(function Header({ userEmail, onLogout }: { userEmail: string; onLogout: () => void }) {
  const { theme, toggle } = useTheme()
  return (
    <header className="flex items-center justify-between fade-up">
      <div>
        <p className="text-sm text-[var(--text-tertiary)] mb-0.5 font-medium">สวัสดี,</p>
        <h2 className="text-xl font-extrabold text-[var(--text-primary)] leading-tight tracking-tight">
          {userEmail.split('@')[0] || 'Admin'}
        </h2>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={toggle} className="theme-toggle" aria-label={`เปลี่ยนเป็นโหมด${theme === 'dark' ? 'สว่าง' : 'มืด'}`}>
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>
        <button onClick={onLogout} className="btn btn-ghost text-sm py-2.5 px-4" aria-label="ออกจากระบบ">
          ออกจากระบบ
        </button>
      </div>
    </header>
  )
})
