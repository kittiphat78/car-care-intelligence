'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// 1. Types & Configurations
// ─────────────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: (active: boolean) => ReactNode
  isCenter?: boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'ภาพรวม',
    icon: (active) => <OverviewIcon active={active} />,
  },
  {
    href: '/add',
    label: 'เพิ่มงาน',
    isCenter: true,
    icon: (active) => <AddIcon active={active} />,
  },
  {
    href: '/history',
    label: 'ประวัติ',
    icon: (active) => <HistoryIcon active={active} />,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// 2. Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      {/* Blur backdrop */}
      <div className="glass border-t border-[var(--border)] safe-bottom">
        <div className="max-w-2xl mx-auto flex items-stretch">
          {NAV_ITEMS.map((tab) => {
            const isActive = pathname === tab.href

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
                      w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200
                      ${isActive
                        ? 'bg-[var(--accent)] text-white shadow-lg shadow-blue-500/25 scale-105'
                        : 'bg-[var(--accent)] text-white hover:shadow-md hover:shadow-blue-500/20 active:scale-95'
                      }
                    `}
                  >
                    {tab.icon(isActive)}
                  </div>
                  <span className={`text-[11px] font-bold mt-1 transition-colors ${
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
                  }`}>
                    {tab.label}
                  </span>
                </Link>
              )
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                className="flex-1 flex flex-col items-center justify-center py-2.5 group transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isActive 
                    ? 'bg-[var(--text-primary)] text-white' 
                    : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] group-hover:bg-[var(--surface-2)]'
                }`}>
                  {tab.icon(isActive)}
                </div>
                <span className={`text-[11px] font-bold mt-1 transition-colors ${
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
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Icon Components
// ─────────────────────────────────────────────────────────────────────────────

function OverviewIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="7" height="7" rx="2" fill="currentColor" opacity={active ? 1 : 0.7} />
      <rect x="11" y="2" width="7" height="7" rx="2" fill="currentColor" opacity={active ? 0.6 : 0.35} />
      <rect x="2" y="11" width="7" height="7" rx="2" fill="currentColor" opacity={active ? 0.6 : 0.35} />
      <rect x="11" y="11" width="7" height="7" rx="2" fill="currentColor" opacity={active ? 1 : 0.7} />
    </svg>
  )
}

function AddIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function HistoryIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 6v4.5l2.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}