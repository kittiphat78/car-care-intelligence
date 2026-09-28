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
  robots: {
    index: false,
    follow: false,
  },
  // ── PWA Manifest ──
  manifest: '/manifest.json',
  // ── iOS Web App ──
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'คาร์แคร์',
  },
  // ── Icons ──
  icons: {
    icon: [
      { url: '/icons/icon.svg',                     type: 'image/svg+xml' },
      { url: '/icons/manifest-icon-192.maskable.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/manifest-icon-512.maskable.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/favicon-196.png',               sizes: '196x196', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // ── Kiosk / Tablet Mode: ป้องกันการ Pinch-Zoom โดยไม่ตั้งใจ ──
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0A0A0F' },
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
  ],
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