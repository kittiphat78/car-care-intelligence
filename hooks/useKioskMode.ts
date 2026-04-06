import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useKioskMode() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const navEntries = window.performance.getEntriesByType('navigation')
      if (navEntries.length === 0) return

      const navTiming = navEntries[0] as PerformanceNavigationTiming
      const currentPath = window.location.pathname
      
      // ถ้ารีเฟรชหน้าจอ + ไม่ได้อยู่หน้าแรก + ไม่ได้อยู่หน้าล็อกอิน -> ให้เด้งกลับไปหน้า Dashboard
      if (
        navTiming.type === 'reload' && 
        currentPath !== '/' && 
        currentPath !== '/login'
      ) {
        // ✅ ใช้ replace() เพื่อไม่ให้เกิดประวัติการเข้าชมซ้ำซ้อน (ป้องกันปัญหากดย้อนกลับแล้วติดลูป)
        router.replace('/')
      }
    } catch (error) {
      console.warn('เบราว์เซอร์ไม่รองรับการตรวจสอบ Navigation Timing:', error)
    }
  }, [router]) // รันแค่ครั้งแรกตอนโหลดหน้าเว็บ
}