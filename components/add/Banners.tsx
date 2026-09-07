import { memo } from 'react'

export const SuccessBanner = memo(function SuccessBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-fit max-w-[90vw] px-6 py-4 bg-[var(--green)] rounded-2xl shadow-xl shadow-emerald-500/20 text-white flex items-center gap-3 slide-down" role="status" aria-live="polite">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
      <span className="text-base font-bold">{message}</span>
    </div>
  )
})

