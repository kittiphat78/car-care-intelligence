'use client' // ✅ ต้องใช้ Client Component เพื่อเช็ค Pathname
import { Sarabun } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import { usePathname } from 'next/navigation'

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['500', '600', '700', '800'], 
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // ✅ กำหนดหน้าที่ "ไม่ต้องการ" ให้โชว์ BottomNav (เช่น หน้า Login)
  const isLoginPage = pathname === '/login'

  return (
    <html lang="th" className="scroll-smooth">
      <body className={`relative h-auto min-h-full w-full overflow-x-hidden bg-[#F4F6F9] text-slate-900 antialiased ${sarabun.className} font-medium`}>

        <div className="app-container relative w-full block">
          {/* ปรับระยะห่างด้านล่าง (pb) เฉพาะหน้าที่ไม่ใช่ Login */}
          <main className={`max-w-6xl mx-auto transition-all duration-500 block ${isLoginPage ? 'pb-0' : 'pb-48 md:pb-24'}`}>
            {children}
          </main>
        </div>

        {/* ✅ แสดง BottomNav เฉพาะหน้าที่ "ไม่ใช่" หน้า Login */}
        {!isLoginPage && <BottomNav />}

        {/* Subtle ambient blobs — ฉากหลังละมุนๆ */}
        <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          <div className="absolute -top-[5%] -left-[5%] w-[35%] h-[35%] rounded-full bg-blue-100/20 blur-[140px]" />
          <div className="absolute top-[55%] -right-[8%] w-[28%] h-[45%] rounded-full bg-indigo-100/15 blur-[120px]" />
          <div className="absolute bottom-0 left-[30%] w-[20%] h-[20%] rounded-full bg-slate-200/30 blur-[80px]" />
        </div>

      </body>
    </html>
  )
}