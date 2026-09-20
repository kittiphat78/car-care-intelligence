'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // โค้ดส่วนนี้สามารถส่ง Error ไปเก็บบนระบบ Monitoring (เช่น Sentry) ได้ในอนาคต
    console.error('Application Error:', error)
  }, [error])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center fade-in" style={{ background: 'var(--bg)' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, var(--red) 0%, transparent 70%)' }} />
      </div>

      <div className="card-elevated p-10 max-w-sm w-full flex flex-col items-center relative z-10 bounce-in">
        <div className="w-20 h-20 rounded-[22px] flex items-center justify-center text-4xl mb-6" style={{ background: 'var(--red-light)', border: '2px solid rgba(239,68,68,0.15)' }}>
          🚨
        </div>
        <h2 className="text-xl font-extrabold text-[var(--red)] mb-2">
          ขออภัย เกิดข้อผิดพลาด
        </h2>
        <p className="text-sm font-medium text-[var(--text-tertiary)] mb-8 leading-relaxed">
          ดูเหมือนระบบจะขัดข้องชั่วคราว<br />ไม่ต้องกังวล กรุณาลองใหม่อีกครั้ง
        </p>

        <div className="flex flex-col w-full gap-3">
          <button
            onClick={() => reset()}
            className="btn btn-primary w-full py-3.5 text-[15px]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 2v6h6" /></svg>
            ลองใหม่อีกครั้ง
          </button>

          <button
            onClick={() => window.location.href = '/'}
            className="btn btn-ghost w-full py-3.5 text-[15px]"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  )
}
