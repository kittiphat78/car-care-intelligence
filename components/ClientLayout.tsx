'use client'
import { usePathname } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  return (
    <>
      <main className={`relative w-full max-w-6xl mx-auto block transition-all duration-500 ${isLoginPage ? 'pb-0' : 'pb-48 md:pb-24'}`}>
        {children}
      </main>
      {!isLoginPage && <BottomNav />}
    </>
  )
}