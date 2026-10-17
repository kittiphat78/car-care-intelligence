import type { IconName } from '@/components/ui/Icon'

// Main navigation (sitemap.md §2). The same list feeds BottomNav and SideNav.
export interface NavItem {
  href: string
  label: string
  icon: IconName
  /** The raised "บันทึก" button in the middle of the bottom bar */
  isPrimary?: boolean
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'ภาพรวม', icon: 'dashboard' },
  { href: '/debts', label: 'ค้างชำระ', icon: 'clock' },
  { href: '/add', label: 'บันทึก', icon: 'plus', isPrimary: true },
  { href: '/history', label: 'ประวัติ', icon: 'history' },
  { href: '/more', label: 'เพิ่มเติม', icon: 'more' },
]

export function isActivePath(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

/** Count shown on a nav badge: up to 9, then "9+" */
export function badgeText(count: number): string {
  return count > 9 ? '9+' : String(count)
}

/** Current URL with ?logout=1 added, which opens the sign-out dialog over any page */
export function withLogoutParam(pathname: string, search: string): string {
  const params = new URLSearchParams(search)
  params.set('logout', '1')
  return `${pathname}?${params.toString()}`
}
