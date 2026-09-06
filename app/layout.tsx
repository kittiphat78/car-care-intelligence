import type { Metadata, Viewport } from 'next'
import { Sarabun } from 'next/font/google'
import './globals.css'
import ClientLayout from '@/components/ClientLayout'

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-sarabun',
})

export const metadata: Metadata = {
  title: 'Car Care Intelligence',
  description: 'ระบบจัดการร้านล้างรถอัจฉริยะ',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0A0A0F',
}

// Inline script to prevent flash of wrong theme
const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('car-care-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', t);
    } catch(e) {}
  })();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={sarabun.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-[family-name:var(--font-sarabun)] antialiased min-h-dvh">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}