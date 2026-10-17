import type { Metadata, Viewport } from 'next'
import { Sarabun } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/patterns/Providers'
import { THEME_COLOR, THEME_STORAGE_KEY } from '@/components/patterns/theme-constants'

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

// Pinch-zoom stays on (AC-32-1, ER-19). Theme colour follows the saved theme via the
// script below; this is the dark default.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: THEME_COLOR.dark,
}

// Applies the saved theme before the first paint, so the page never flashes the wrong one
const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('${THEME_STORAGE_KEY}') === 'light' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', t);
      var setMeta = function() {
        var m = document.querySelector('meta[name="theme-color"]');
        if (m) m.setAttribute('content', t === 'light' ? '${THEME_COLOR.light}' : '${THEME_COLOR.dark}');
      };
      setMeta();
      document.addEventListener('DOMContentLoaded', setMeta);
    } catch(e) {}
  })();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={sarabun.variable} data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-bg font-sans text-body tracking-normal text-text antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
