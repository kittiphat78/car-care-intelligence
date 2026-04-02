import type { Metadata } from 'next'
import { Sarabun } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import ClientLayout from '@/components/ClientLayout'

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Carwash',
  description: 'Carwash management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="scroll-smooth">
      <body className={`${sarabun.className} relative min-h-dvh w-full overflow-x-hidden bg-[#F0F2F7] text-slate-900 antialiased`}>
        <div className="ambient-bg" aria-hidden="true" />
        <div
          className="fixed inset-0 -z-[9] pointer-events-none opacity-[0.018]"
          style={{
            backgroundImage: `linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
          aria-hidden="true"
        />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}