'use client'

import { useSyncExternalStore } from 'react'
import { Icon } from '@/components/ui/Icon'

// component-specifications.md §2.8 — bars at the very top: offline, and the test-system
// marker on every environment that is not production (ADR-12). Values are fixed at build.
const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV ?? 'development'
const DATABASE = process.env.NEXT_PUBLIC_APP_DATABASE ?? 'unknown'

const ENV_LABELS: Record<string, string> = {
  preview: 'ระบบทดสอบ (Preview)',
  development: 'เครื่องนักพัฒนา (Development)',
}

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
}

export function envLabel(appEnv: string, database: string): string | null {
  if (appEnv === 'production') return null
  let text = ENV_LABELS[appEnv] ?? appEnv
  if (database === 'production') text += ' · ⚠ กำลังใช้ฐานข้อมูลจริงของร้าน'
  else text += ' · ข้อมูลในหน้านี้ไม่ใช่ข้อมูลจริง'
  return text
}

export function StatusBar({ appEnv = APP_ENV, database = DATABASE }: { appEnv?: string; database?: string }) {
  const online = useOnline()
  const env = envLabel(appEnv, database)
  if (online && !env) return null

  return (
    <div role="status" className="sticky top-0 z-30">
      {!online && (
        <p className="flex min-h-9 items-center justify-center gap-2 bg-warning-subtle px-4 text-center text-caption font-semibold text-warning-text">
          <Icon name="alert" size="sm" />
          ไม่มีอินเทอร์เน็ต · รายการที่บันทึกแล้วไม่หาย ลองใหม่เมื่อกลับมาออนไลน์
        </p>
      )}
      {env && (
        <p
          className={`flex min-h-9 items-center justify-center px-4 text-center text-caption font-semibold text-on-primary ${database === 'production' ? 'bg-danger' : 'bg-env-banner'}`}
        >
          {env}
        </p>
      )}
    </div>
  )
}
