import type { Metadata } from 'next'
import { Card } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { OnlineLabel, STATUS_PILL } from '@/components/patterns/StatusBar'
import { LoginForm } from '@/features/auth/components/LoginForm'

export const metadata: Metadata = { title: 'เข้าสู่ระบบ · คาร์แคร์' }

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? ''

// Things the app really does (no figures, no sales claims) — shown beside the form on wide screens
const FEATURES: Array<{ icon: IconName; tile: string; label: string }> = [
  { icon: 'wash', tile: 'bg-wash-subtle text-wash', label: 'บันทึกรายการ' },
  { icon: 'clock', tile: 'bg-warning-subtle text-warning-text', label: 'ค้างชำระ' },
  { icon: 'download', tile: 'bg-polish-subtle text-polish', label: 'ส่งออก Excel' },
]

// screen-specifications.md §1 — no navigation; the name and the form, side by side from lg up
export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-(--page-gutter) py-10">
      <div className="grid w-full max-w-100 grid-cols-1 gap-8 lg:max-w-5xl lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
        <header className="grid min-w-0 justify-items-center gap-3 text-center lg:justify-items-start lg:text-left">
          <p className={STATUS_PILL}>
            <OnlineLabel />
          </p>
          <h1 className="text-display break-words text-text lg:text-display-lg">คาร์แคร์</h1>
          <p className="text-title break-words text-text lg:text-title-lg">
            {/* inline-block: when the line must wrap, "ร้านล้างรถ" moves down whole */}
            ระบบจัดการ<span className="inline-block max-w-full text-gradient">ร้านล้างรถ</span>
          </p>
          <ul aria-label="ทำอะไรได้บ้าง" className="mt-2 hidden flex-wrap gap-2.5 lg:flex">
            {FEATURES.map((f) => (
              <li key={f.label} className="inline-flex min-h-11 items-center gap-2.5 rounded-full border glass py-1.5 pr-4 pl-1.5 text-body font-semibold text-text">
                <span aria-hidden="true" className={`grid size-8 place-items-center rounded-sm ${f.tile}`}>
                  <Icon name={f.icon} size="sm" />
                </span>
                {f.label}
              </li>
            ))}
          </ul>
        </header>
        <div className="grid w-full min-w-0 grid-cols-1 gap-4 justify-self-center lg:max-w-105">
          <Card>
            <LoginForm />
          </Card>
          <p className="text-center text-caption text-text-tertiary">
            Car Care Intelligence{VERSION && ` · v${VERSION}`}
          </p>
        </div>
      </div>
    </div>
  )
}
