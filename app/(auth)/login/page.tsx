import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { LoginForm } from '@/features/auth/components/LoginForm'

export const metadata: Metadata = { title: 'เข้าสู่ระบบ · คาร์แคร์' }

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? ''

// screen-specifications.md §1 — a centred box, no navigation, no decorations
export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-(--page-gutter) py-10">
      <div className="grid w-full max-w-100 grid-cols-1 gap-6">
        <header className="grid justify-items-center gap-2 text-center">
          <span aria-hidden="true" className="grid size-16 place-items-center rounded-lg bg-primary text-on-primary">
            <Icon name="car" className="size-9" />
          </span>
          <h1 className="text-title text-text">คาร์แคร์</h1>
          <p className="text-body text-text-secondary">ระบบจัดการร้านล้างรถ</p>
        </header>
        <Card>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </Card>
        <p className="text-center text-caption text-text-tertiary">
          Car Care Intelligence{VERSION && ` · v${VERSION}`}
        </p>
      </div>
    </div>
  )
}
