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
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-[var(--bg)] text-center fade-in">
      <div className="card p-10 max-w-sm w-full flex flex-col items-center shadow-2xl border-2 border-red-100/50">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner ring-4 ring-red-50/50">
          🚨
        </div>
        <h2 className="text-xl font-extrabold text-[var(--red)] mb-2">
          ขออภัย เกิดข้อผิดพลาดขัดข้อง
        </h2>
        <p className="text-sm font-medium text-[var(--text-tertiary)] mb-8 leading-relaxed">
          ดูเหมือนระบบจะขัดข้องชั่วคราว ไม่ต้องกังวล กรุณาลองใหม่อีกครั้ง
        </p>
        
        <div className="flex flex-col w-full gap-3">
          <button
            onClick={() => reset()}
            className="w-full bg-[var(--red)] text-white font-bold py-3.5 rounded-[var(--radius-md)] active:scale-95 transition-transform hover:shadow-lg flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 2v6h6"/></svg>
            ลองใหม่อีกครั้ง
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-[var(--surface-2)] text-[var(--text-secondary)] font-bold py-3.5 rounded-[var(--radius-md)] active:scale-95 transition-transform"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  )
}
