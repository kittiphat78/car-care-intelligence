'use client'

import { usePathname } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { useKioskMode } from '@/hooks/useKioskMode'
import { useGlobalErrorReporting } from '@/hooks/useGlobalErrorReporting'
import { ToastProvider } from '@/hooks/useToast'
import { EnvironmentBar } from '@/components/ui/EnvironmentBar'
import { useEffect } from 'react'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  // 🛡️ ดักจับการรีเฟรชหน้าจอ (Kiosk Mode Protection)
  useKioskMode()

  // 📡 ส่ง error ที่ไม่ถูกจับไปที่ log ของ server (ADR-11)
  useGlobalErrorReporting()

  // 🎨 Set initial theme from localStorage (prevent flash)
  useEffect(() => {
    const saved = localStorage.getItem('car-care-theme') || 'dark'
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  return (
    <ToastProvider>
      <EnvironmentBar />
      <main
        className={`
          relative w-full max-w-2xl mx-auto block
          ${isLoginPage ? 'pb-0' : 'pb-[100px]'}
        `}
      >
        {children}
      </main>

      {!isLoginPage && <BottomNav />}
    </ToastProvider>
  )
}