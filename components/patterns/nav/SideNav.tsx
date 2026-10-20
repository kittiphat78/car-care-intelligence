'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/cn'
import { pushOnPlainClick } from '@/lib/url-state'
import { Icon } from '@/components/ui/Icon'
import { Switch } from '@/components/ui/Switch'
import { buttonClassName } from '@/components/ui/Button'
import { useTheme } from '@/components/patterns/theme'
import { NAV_ITEMS, badgeText, isActivePath, withLogoutParam } from './items'

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
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-(--size-sidebar) flex-col border-r border-border bg-surface lg:flex">
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <span aria-hidden="true" className="grid size-10 place-items-center rounded-md bg-primary text-on-primary">
          <Icon name="car" size="lg" />
        </span>
        <span className="text-heading text-text">คาร์แคร์</span>
      </div>

      <div className="px-4 pb-4">
        <Link href="/add" className={buttonClassName({ size: 'lg', fullWidth: true })}>
          <Icon name="plus" />
          บันทึกรายการ
        </Link>
      </div>

      <nav aria-label="เมนูหลัก" className="flex-1 overflow-y-auto px-3">
        <ul className="grid grid-cols-1 gap-1">
          {NAV_ITEMS.filter((item) => !item.isPrimary).map((item) => {
            const active = isActivePath(pathname, item.href)
            const count = badges[item.href] ?? 0
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'focus-ring flex min-h-12 items-center gap-3 rounded-md px-3 text-body',
                    active ? 'bg-primary-subtle font-semibold text-link' : 'text-text-secondary hover:bg-surface-2',
                  )}
                >
                  <Icon name={item.icon} />
                  <span className="flex-1">{item.label}</span>
                  {count > 0 && (
                    <span className="grid h-6 min-w-6 place-items-center rounded-full bg-warning px-1.5 text-caption font-bold text-on-primary">
                      <span aria-hidden="true">{badgeText(count)}</span>
                      <span className="sr-only">{`${count} ราย`}</span>
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="grid grid-cols-1 gap-2 border-t border-border px-4 pt-3 pb-5">
        <Switch label="ธีมมืด" checked={theme === 'dark'} onChange={(dark) => setTheme(dark ? 'dark' : 'light')} />
        {email && <p className="truncate text-caption text-text-secondary">{email}</p>}
        <Link
          href={withLogoutParam(pathname, searchParams.toString())}
          onClick={pushOnPlainClick}
          prefetch={false}
          scroll={false}
          className={buttonClassName({ variant: 'danger-ghost', fullWidth: true })}
        >
          <Icon name="logout" />
          ออกจากระบบ
        </Link>
        {VERSION && <p className="text-caption text-text-tertiary">เวอร์ชัน {VERSION}</p>}
      </div>
    </aside>
  )
}
