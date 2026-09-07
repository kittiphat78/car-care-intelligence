import { memo } from 'react'

interface ErrorBannerProps {
  error: string
  variant?: 'fixed' | 'inline'
}

export const ErrorBanner = memo(function ErrorBanner({ error, variant = 'fixed' }: ErrorBannerProps) {
  if (!error) return null

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
