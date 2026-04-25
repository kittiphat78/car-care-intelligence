'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { memo, ReactNode } from 'react'

/* ─── Nav Config ─── */
interface NavItem {
  href: string
  label: string
  icon: (active: boolean) => ReactNode
  isCenter?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',        label: 'ภาพรวม', icon: (a) => <GridIcon active={a} /> },
  { href: '/add',     label: 'เพิ่มงาน', icon: (a) => <PlusIcon active={a} />, isCenter: true },
  { href: '/history', label: 'ประวัติ', icon: (a) => <ClockIcon active={a} /> },
]

/* ─── Main Component (memoized — only re-renders on route change) ─── */
const BottomNav = memo(function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="การนำทางหลัก"
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      <div className="glass border-t border-[var(--border)] safe-bottom">
        <div className="max-w-2xl mx-auto flex items-stretch">
          {NAV_ITEMS.map((tab) => {
            const isActive = pathname === tab.href

            /* ── Center (Add) Button ── */
            if (tab.isCenter) {
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-label={tab.label}
                  aria-current={isActive ? 'page' : undefined}
                  className="flex-1 flex flex-col items-center justify-center py-2 group"
                >
                  <div
                    className={`
                      w-[52px] h-[52px] rounded-2xl flex items-center justify-center
                      bg-[var(--accent)] text-white
                      transition-transform duration-150 ease-out
                      active:scale-90
                      ${isActive ? 'shadow-lg shadow-blue-500/25' : 'shadow-md shadow-blue-500/15'}
                    `}
                    aria-hidden="true"
                  >
                    {tab.icon(isActive)}
                  </div>
                  <span className={`text-[11px] font-bold mt-1 transition-colors duration-150 ${
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
                  }`}>
                    {tab.label}
                  </span>
                </Link>
              )
            }

            /* ── Normal Tab ── */
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                className="flex-1 flex flex-col items-center justify-center py-2.5 group"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ease-out ${
                    isActive
                      ? 'bg-[var(--text-primary)] text-white'
                      : 'text-[var(--text-tertiary)]'
                  }`}
                  aria-hidden="true"
                >
                  {tab.icon(isActive)}
                </div>
                <span className={`text-[11px] font-bold mt-1 transition-colors duration-150 ${
                  isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
                }`}>
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
})

export default BottomNav

/* ─── SVG Icons ─── */
function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="7" height="7" rx="2" fill="currentColor" opacity={active ? 1 : 0.65} />
      <rect x="11" y="2" width="7" height="7" rx="2" fill="currentColor" opacity={active ? 0.55 : 0.35} />
      <rect x="2" y="11" width="7" height="7" rx="2" fill="currentColor" opacity={active ? 0.55 : 0.35} />
      <rect x="11" y="11" width="7" height="7" rx="2" fill="currentColor" opacity={active ? 1 : 0.65} />
    </svg>
  )
}
function PlusIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
function ClockIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 6v4.5l2.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}