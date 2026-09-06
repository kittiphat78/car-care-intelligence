'use client'

import { usePathname } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { useKioskMode } from '@/hooks/useKioskMode'
import { ToastProvider } from '@/hooks/useToast'
import { useEffect } from 'react'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  // 🛡️ ดักจับการรีเฟรชหน้าจอ (Kiosk Mode Protection)
  useKioskMode()

  // 🎨 Set initial theme from localStorage (prevent flash)
  useEffect(() => {
    const saved = localStorage.getItem('car-care-theme') || 'dark'
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  return (
    <ToastProvider>
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