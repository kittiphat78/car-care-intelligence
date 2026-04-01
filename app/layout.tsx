import type { Metadata, Viewport } from 'next'
import { Sarabun } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/BottomNav'

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700', '800'], // ตัด 300 ออก — เบาเกินอ่านยากบนมือถือ
})

export const metadata: Metadata = {
  title: 'CarCare Intelligence',
  description: 'Premium Business Management System',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0F172A',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" className="scroll-smooth">
      <body className={`relative min-h-screen min-w-full overflow-x-hidden bg-[#F4F6F9] text-slate-900 antialiased ${sarabun.className}`}>

        <div className="app-container relative min-h-screen">
          <main className="max-w-6xl mx-auto pb-32 md:pb-20 transition-all duration-500">
            {children}
          </main>
        </div>

        <BottomNav />

        {/* Subtle ambient blobs — ลดความจัดเพื่อให้ card สีขาวดูโดดกว่าเดิม */}
        <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          <div className="absolute -top-[5%] -left-[5%] w-[35%] h-[35%] rounded-full bg-blue-100/30 blur-[140px]" />
          <div className="absolute top-[55%] -right-[8%] w-[28%] h-[45%] rounded-full bg-indigo-100/25 blur-[120px]" />
          <div className="absolute bottom-0 left-[30%] w-[20%] h-[20%] rounded-full bg-slate-200/40 blur-[80px]" />
        </div>

      </body>
    </html>
  )
}