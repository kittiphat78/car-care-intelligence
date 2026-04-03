'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  // ✅ บังคับเตะกลับหน้าแรก ถ้ารีเฟรชหน้าจอ (Kiosk Mode)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const navEntries = window.performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const navTiming = navEntries[0] as PerformanceNavigationTiming;
        
        // ถ้ารีเฟรชหน้าจอ + ไม่ได้อยู่หน้าแรก + ไม่ได้อยู่หน้าล็อกอิน -> ให้เด้งกลับไปหน้า Dashboard
        if (
          navTiming.type === 'reload' && 
          window.location.pathname !== '/' && 
          window.location.pathname !== '/login'
        ) {
          window.location.href = '/'; 
        }
      }
    }
  }, []);

  return (
    <>
      <main className={`
        relative w-full max-w-lg mx-auto block
        ${isLoginPage ? 'pb-0' : 'pb-28'}
      `}>
        {children}
      </main>
      {!isLoginPage && <BottomNav />}
    </>
  )
}