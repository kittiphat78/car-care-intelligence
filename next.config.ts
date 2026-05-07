import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // ไม่มีอะไรพิเศษ — ใช้ค่า default ของ Next.js ทั้งหมด
  // TypeScript และ ESLint จะทำงานปกติตอน build
  async headers() {
    return [
      {
        // ใช้กับทุกๆ Route ในแอปพลิเคชัน
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ],
      },
    ]
  },
}

export default nextConfig