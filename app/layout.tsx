import type { Metadata } from 'next'
import { Sarabun } from 'next/font/google'
import './globals.css'
import ClientLayout from '@/components/ClientLayout'

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sarabun',
})

export const metadata: Metadata = {
  title: 'Carwash',
  description: 'Carwash management system',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body className="font-[family-name:var(--font-sarabun)] bg-[var(--bg)] text-[var(--text-primary)] antialiased min-h-dvh">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}