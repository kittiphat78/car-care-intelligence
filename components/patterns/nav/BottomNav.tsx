'use client'

import { AppLink } from '@/components/ui/AppLink'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { NAV_ITEMS, badgeText, isActivePath } from './items'
import { TabIcon } from './TabIcon'

// component-specifications.md §2.10 — phones and tablets (< 1024px)

export interface BottomNavProps {
  /** Badge numbers by href, e.g. { '/debts': 3 } (customers with unpaid jobs) */
  badges?: Partial<Record<string, number>>
}

export function BottomNav({ badges = {} }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-elevation-2 lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-(--size-content-max) grid-cols-5">
        {NAV_ITEMS.filter((item) => !item.sideOnly).map((item) => {
          const active = isActivePath(pathname, item.href) || !!item.alsoActiveFor?.some((href) => isActivePath(pathname, href))
          const count = badges[item.href] ?? 0
          return (
            <li key={item.href} className="min-w-0">
              <AppLink
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'focus-ring relative flex h-full min-h-11 flex-col items-center justify-center gap-0.5 rounded-md text-caption font-medium',
                  active ? 'text-link' : 'text-text-secondary',
                )}
              >
                <TabIcon icon={item.icon} active={active} primary={item.isPrimary} />
                <span className="truncate">{item.label}</span>
                {count > 0 && (
                  <span className="absolute top-0.5 left-[calc(50%+6px)] grid h-5 min-w-5 place-items-center rounded-full bg-warning px-1 text-caption leading-none font-bold text-on-primary">
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
  )
}
