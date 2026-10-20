import type { IconName } from '@/components/ui/Icon'

// Main navigation (sitemap.md §2). The same list feeds BottomNav and SideNav.
export interface NavItem {
  href: string
  label: string
  icon: IconName
  /** The raised "บันทึก" button in the middle of the bottom bar */
  isPrimary?: boolean
  /** Only in SideNav: the bottom bar keeps its five places (customers, Q-1) */
  sideOnly?: boolean
  /** Other sections this bottom-bar item stands for, e.g. เพิ่มเติม for /customers */
  alsoActiveFor?: readonly string[]
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'ภาพรวม', icon: 'dashboard' },
  { href: '/debts', label: 'ค้างชำระ', icon: 'clock' },
  { href: '/add', label: 'บันทึก', icon: 'plus', isPrimary: true },
  { href: '/history', label: 'ประวัติ', icon: 'history' },
  { href: '/customers', label: 'ลูกค้า', icon: 'users', sideOnly: true },
  // On phones, ลูกค้า is reached from the card at the top of /more
  { href: '/more', label: 'เพิ่มเติม', icon: 'more', alsoActiveFor: ['/customers'] },
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
  // The customer search can hold a name or a phone number and is kept away from the
  // server (ADR-23); this link is a normal navigation, so leave it out
  if (isActivePath(pathname, '/customers')) params.delete('q')
  params.set('logout', '1')
  return `${pathname}?${params.toString()}`
}
