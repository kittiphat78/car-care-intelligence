'use client'
import { usePathname } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

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