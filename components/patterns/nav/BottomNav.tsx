'use client'

import { useEffect, useRef } from 'react'
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
  const ref = useRef<HTMLElement>(null)

  // The bar is as tall as its text needs (see below). The page's bottom padding, the
  // ActionBar on /add and toasts sit above it through --size-nav-bottom (64px + safe area
  // by default), so that value follows the bar's real height. While hidden (≥ 1024px, or a
  // short screen on a page with a save bar, globals.css) the stylesheet value applies.
  useEffect(() => {
    const nav = ref.current
    if (!nav || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    const sync = () => {
      const h = nav.getBoundingClientRect().height
      if (h > 0) root.style.setProperty('--size-nav-bottom', `${Math.ceil(h)}px`)
      else root.style.removeProperty('--size-nav-bottom')
    }
    const observer = new ResizeObserver(sync)
    observer.observe(nav)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--size-nav-bottom')
    }
  }, [])

  return (
    <nav
      ref={ref}
      aria-label="เมนูหลัก"
      data-bottom-nav
      // Floating glass: blurs what scrolls under it, solid without blur support (ADR-28)
      className="fixed inset-x-0 bottom-0 z-20 border-t glass-float pb-[env(safe-area-inset-bottom)] shadow-elevation-2 lg:hidden"
    >
      {/* min-h in rem, not a fixed 64px: with large text (system font size, zoom) the bar
          grows and keeps its labels instead of cutting them off (WCAG 1.4.4) */}
      <ul className="mx-auto grid min-h-16 max-w-(--size-content-max) grid-cols-5">
        {NAV_ITEMS.filter((item) => !item.sideOnly).map((item) => {
          const active = isActivePath(pathname, item.href) || !!item.alsoActiveFor?.some((href) => isActivePath(pathname, href))
          const count = badges[item.href] ?? 0
          return (
            <li key={item.href} className="min-w-0">
              <AppLink
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'focus-ring relative flex h-full min-h-11 flex-col items-center justify-center gap-0.5 rounded-md px-0.5 text-caption font-medium',
                  active ? 'text-link' : 'text-text-secondary',
                )}
              >
                <TabIcon icon={item.icon} active={active} primary={item.isPrimary} />
                {/* Two lines rather than "ค้าง…": a label that does not fit (280px fold, large
                    text) breaks between Thai words, and inside a word only when one word is wider than its tab */}
                <span className="line-clamp-2 max-w-full text-center break-words">{item.label}</span>
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
