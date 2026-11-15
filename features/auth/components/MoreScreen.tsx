'use client'

import { AppLink } from '@/components/ui/AppLink'
import { usePathname, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Switch } from '@/components/ui/Switch'
import { buttonClassName } from '@/components/ui/Button'
import { PageHeader } from '@/components/patterns/PageHeader'
import { useTheme } from '@/components/patterns/theme'
import { envLabel } from '@/components/patterns/StatusBar'
import { withLogoutParam } from '@/components/patterns/nav/items'
import { pushOnPlainClick } from '@/lib/url-state'

// screen-specifications.md §6 — /more

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? ''
const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV ?? 'development'
const DATABASE = process.env.NEXT_PUBLIC_APP_DATABASE ?? 'unknown'

// Each heading carries its icon in a coloured tile, like the home shortcuts (ADR-28)
function Section({ title, icon, tile, children }: { title: string; icon: IconName; tile: string; children: React.ReactNode }) {
  return (
    <Card as="section" aria-label={title} className="grid grid-cols-1 gap-3">
      <h2 className="flex items-center gap-3 text-subheading text-text">
        <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-sm ${tile}`}>
          <Icon name={icon} size="sm" />
        </span>
        {title}
      </h2>
      {children}
    </Card>
  )
}

export function MoreScreen({ email }: { email: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { theme, setTheme } = useTheme()
  const env = envLabel(APP_ENV, DATABASE)

  return (
    <div className="mx-auto grid max-w-140 grid-cols-1 gap-4 pb-6">
      <PageHeader title="เพิ่มเติม" />

      {/* The way to the customer directory on phones (Q-1); SideNav has it on wide screens */}
      <AppLink href="/customers" className="focus-ring block rounded-lg">
        <Card interactive className="flex min-h-18 items-center gap-4">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-md bg-primary-subtle text-link">
            <Icon name="users" size="lg" />
          </span>
          <span className="grid min-w-0 flex-1 grid-cols-1">
            <span className="text-heading text-text">ลูกค้า</span>
            <span className="text-body text-text-secondary">ชื่อ เบอร์โทร และทะเบียนรถ</span>
          </span>
          <Icon name="chevron-right" className="text-text-tertiary" />
        </Card>
      </AppLink>

      <Section title="บัญชี" icon="user" tile="bg-primary-subtle text-link">
        <p className="min-w-0 text-body break-all text-text-secondary">{email || '—'}</p>
      </Section>

      <Section title="การแสดงผล" icon="palette" tile="bg-polish-subtle text-polish">
        <Switch label="ธีมมืด" checked={theme === 'dark'} onChange={(dark) => setTheme(dark ? 'dark' : 'light')} />
      </Section>

      <Section title="เกี่ยวกับ" icon="info" tile="bg-wash-subtle text-wash">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body">
          <dt className="text-text-secondary">เวอร์ชัน</dt>
          <dd className="text-text">{VERSION || '—'}</dd>
          {env && (
            <>
              <dt className="text-text-secondary">ระบบ</dt>
              <dd className="text-text">{env}</dd>
            </>
          )}
        </dl>
        <p className="text-caption text-text-tertiary">ลืมรหัสผ่านหรือต้องการบัญชีใหม่ ติดต่อผู้ดูแลร้าน</p>
      </Section>

      {/* A plain link: it only adds ?logout=1 here, in the browser (lib/url-state.ts) */}
      <a href={withLogoutParam(pathname, searchParams.toString())} onClick={pushOnPlainClick} className={buttonClassName({ variant: 'danger-ghost', fullWidth: true })}>
        <Icon name="logout" />
        ออกจากระบบ
      </a>
    </div>
  )
}
