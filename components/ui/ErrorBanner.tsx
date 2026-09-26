import { memo } from 'react'

interface ErrorBannerProps {
  error: string
  variant?: 'fixed' | 'inline' | 'form'
}

export const ErrorBanner = memo(function ErrorBanner({ error, variant = 'fixed' }: ErrorBannerProps) {
  if (!error) return null

  if (variant === 'form') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--red-light)] border border-[rgba(239,68,68,0.2)] pop-in" role="alert" aria-live="assertive">
        <svg width="18" height="18" viewBox="0 0 15 15" fill="none" className="shrink-0" aria-hidden="true"><circle cx="7.5" cy="7.5" r="6.5" stroke="var(--red)" strokeWidth="1.3"/><path d="M7.5 4.5v4M7.5 10.5v.5" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round"/></svg>
        <p className="text-[15px] font-semibold text-[var(--red)]">{error}</p>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className="w-full p-4 rounded-[var(--radius-md)] bg-[var(--red-light)] border-2 border-[rgba(239,68,68,0.2)] text-[var(--red)] text-sm font-bold text-center fade-up" role="alert" aria-live="assertive">
        🚨 {error}
      </div>
    )
  }

  return (
    <div className="fixed bottom-28 left-4 right-4 max-w-2xl mx-auto p-4 rounded-[var(--radius-md)] bg-[var(--red)] text-white text-base font-bold text-center fade-up z-50" role="alert" aria-live="assertive">
      {error}
    </div>
  )
})

