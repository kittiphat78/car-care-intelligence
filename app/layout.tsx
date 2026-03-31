import type { Metadata, Viewport } from 'next'
import { Sarabun } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/BottomNav'

// เลือกใช้ Weight ที่หลากหลายขึ้นเพื่อสร้างลำดับความสำคัญของข้อความ (Hierarchy)
const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'CarCare Intelligence',
  description: 'Premium Business Management System',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // ป้องกันการเผลอซูมเข้าออกเพื่อให้เหมือน Native App ที่สุด
  themeColor: '#0F172A', // เปลี่ยนสีแถบสถานะให้เข้ากับสี Slate-950 ของ Dashboard
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" className="scroll-smooth">
      <body className={`relative min-h-screen min-w-full overflow-x-hidden bg-gradient-to-b from-blue-50 via-white to-slate-100 text-slate-900 antialiased ${sarabun.className}`}>

        {/* Main Content Wrapper: จัดวางกึ่งกลางและคุมความกว้างระดับพรีเมียม */}
        <div className="app-container relative min-h-screen">
          <main className="mt-6 max-w-6xl mx-auto pb-32 md:pb-20 transition-all duration-500">
            {children}
          </main>
        </div>

        {/* Navigation Section */}
        <BottomNav />

        {/* ใส่ลูกเล่น Gradient จางๆ เป็นพื้นหลังคงที่เพื่อให้ดูมีมิติ */}
        <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-50/50 blur-[120px]"></div>
          <div className="absolute top-[60%] -right-[10%] w-[30%] h-[50%] rounded-full bg-indigo-50/40 blur-[100px]"></div>
        </div>

      </body>
    </html>
  )
}