'use client'

import { AppLink } from '@/components/ui/AppLink'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/cn'
import { pushOnPlainClick } from '@/lib/url-state'
import { Icon } from '@/components/ui/Icon'
import { Switch } from '@/components/ui/Switch'
import { buttonClassName } from '@/components/ui/Button'
import { useTheme } from '@/components/patterns/theme'
import { NAV_ITEMS, badgeText, isActivePath, withLogoutParam } from './items'
import { PendingDot } from './TabIcon'

// component-specifications.md §2.10 — wide screens (≥ 1024px)

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? ''

export interface SideNavProps {
  email: string
  badges?: Partial<Record<string, number>>
}

export function SideNav({ email, badges = {} }: SideNavProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { theme, setTheme } = useTheme()

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-(--size-sidebar) flex-col border-r glass-float lg:flex">
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <span aria-hidden="true" className="grid size-10 place-items-center rounded-md bg-linear-135 from-primary to-gradient-to text-on-primary shadow-[0_8px_20px_-10px_var(--color-action-primary)]">
          <Icon name="car" size="lg" />
        </span>
        <span className="text-heading text-text">คาร์แคร์</span>
      </div>

      <div className="px-4 pb-4">
        <AppLink href="/add" className={buttonClassName({ size: 'lg', fullWidth: true })}>
          <Icon name="plus" />
          บันทึกรายการ
        </AppLink>
      </div>

      <nav aria-label="เมนูหลัก" className="flex-1 overflow-y-auto px-3">
        <ul className="grid grid-cols-1 gap-1">
          {NAV_ITEMS.filter((item) => !item.isPrimary).map((item) => {
            const active = isActivePath(pathname, item.href)
            const count = badges[item.href] ?? 0
            return (
              <li key={item.href}>
                <AppLink
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'focus-ring flex min-h-12 items-center gap-3 rounded-md px-3 text-body',
                    active ? 'bg-primary-subtle font-semibold text-link' : 'text-text-secondary hover:bg-glass',
                  )}
                >
                  <Icon name={item.icon} />
                  <span className="flex-1">{item.label}</span>
                  <PendingDot />
                  {count > 0 && (
                    <span className="grid h-6 min-w-6 place-items-center rounded-full bg-warning px-1.5 text-caption font-bold text-on-primary">
                      <span aria-hidden="true">{badgeText(count)}</span>
                      <span className="sr-only">{`${count} ราย`}</span>
                    </span>
                  )}
                </AppLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="grid grid-cols-1 gap-2 border-t border-glass-border px-4 pt-3 pb-5">
        <Switch label="ธีมมืด" checked={theme === 'dark'} onChange={(dark) => setTheme(dark ? 'dark' : 'light')} />
        {email && <p className="truncate text-caption text-text-secondary">{email}</p>}
        {/* A plain link: it only adds ?logout=1 here, in the browser (lib/url-state.ts) */}
        <a href={withLogoutParam(pathname, searchParams.toString())} onClick={pushOnPlainClick} className={buttonClassName({ variant: 'danger-ghost', fullWidth: true })}>
          <Icon name="logout" />
          ออกจากระบบ
        </a>
        {VERSION && <p className="text-caption text-text-tertiary">เวอร์ชัน {VERSION}</p>}
      </div>
    </aside>
  )
}
