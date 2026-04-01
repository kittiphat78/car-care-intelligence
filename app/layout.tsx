import type { Metadata, Viewport } from 'next'
import { Sarabun } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/BottomNav'

// ปรับน้ำหนักฟอนต์: เน้น 500 ขึ้นไปเพื่อให้ตัวหนังสือดูอิ่มและอ่านง่าย
const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['500', '600', '700', '800'], 
})

export const metadata: Metadata = {
  title: 'CarCare Intelligence',
  description: 'Premium Business Management System',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,    // ปล่อยให้ขยายได้ถ้าพ่อแม่มองไม่เห็น
  userScalable: true, // เปิดให้ใช้นิ้วถ่างขยายหน้าจอได้ (Accessibility)
  themeColor: '#0F172A',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" className="scroll-smooth">
      <body className={`relative h-auto min-h-full w-full overflow-x-hidden bg-[#F4F6F9] text-slate-900 antialiased ${sarabun.className} font-medium`}>

        <div className="app-container relative w-full block">
          {/* ปรับระยะห่างด้านล่าง (pb) ให้มากขึ้นเพื่อให้รายการสุดท้ายลอยพ้นแถบเมนูสีดำแน่นอน */}
          <main className="max-w-6xl mx-auto pb-48 md:pb-24 transition-all duration-500 block">
            {children}
          </main>
        </div>

        <BottomNav />

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