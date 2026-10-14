import type { NextConfig } from 'next'
import { version } from './package.json'
import { checkEnvironment } from './lib/env-guard'

// ADR-12: Preview/Development ห้ามชี้ฐานข้อมูล production (และ production ต้องชี้ production) ไม่งั้น build ไม่ผ่าน
const environment = checkEnvironment({
  appEnv: process.env.NEXT_PUBLIC_APP_ENV,
  vercelEnv: process.env.VERCEL_ENV,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  productionRef: process.env.PRODUCTION_SUPABASE_PROJECT_REF,
})
for (const warning of environment.warnings) console.warn(`⚠ [env-guard] ${warning}`)
if (environment.errors.length > 0) {
  throw new Error(['[env-guard] Environment misconfigured:', ...environment.errors.map(e => `  • ${e}`)].join('\n'))
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // แนบเลขเวอร์ชันไปกับรายงาน error (lib/observability.ts)
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_APP_ENV: environment.appEnv,
    NEXT_PUBLIC_APP_DATABASE: environment.database,
  },
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
          },
          {
            // Permissions-Policy: restrict access to sensitive browser APIs
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            // Content-Security-Policy: defense-in-depth against XSS
            // - 'unsafe-inline' needed for theme script and styled-jsx
            // - open-meteo.com for weather/AQI APIs
            // - supabase for auth/database
            // - generativelanguage.googleapis.com for Gemini AI
            // - fonts.googleapis.com/fonts.gstatic.com for Google Fonts
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.open-meteo.com https://air-quality-api.open-meteo.com https://generativelanguage.googleapis.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          },
        ],
      },
    ]
  },
}

export default nextConfig