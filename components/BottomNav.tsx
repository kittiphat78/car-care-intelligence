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
  icon: ReactNode
  isCenter?: boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'ภาพรวม',
    icon: <OverviewIcon />,
  },
  {
    href: '/add',
    label: 'เพิ่มงาน',
    isCenter: true,
    icon: <AddIcon />,
  },
  {
    href: '/history',
    label: 'ประวัติ',
    icon: <HistoryIcon />,
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
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-6 pointer-events-none"
    >
      <div className="pointer-events-auto flex items-center gap-1.5 bg-white/90 backdrop-blur-xl border border-[var(--border)] rounded-full p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]">
        {NAV_ITEMS.map((tab) => {
          const isActive = pathname === tab.href

          // ── Center Button (Action Button) ──
          if (tab.isCenter) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200
                  ${isActive
                    ? 'bg-[var(--text-primary)] text-white'
                    : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:scale-95'
                  }
                `}
              >
                {tab.icon}
              </Link>
            )
          }

          // ── Normal Tabs ──
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`
                flex items-center justify-center gap-1.5 h-10 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                ${isActive
                  ? 'bg-[var(--text-primary)] text-white px-4 min-w-fit'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] w-10'
                }
              `}
            >
              <span className="flex items-center justify-center shrink-0">
                {tab.icon}
              </span>
              
              {isActive && (
                <span className="text-[12px] font-semibold leading-none whitespace-nowrap">
                  {tab.label}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Icon Components (Extracted for better readability)
// ─────────────────────────────────────────────────────────────────────────────

function OverviewIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity=".9" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity=".4" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity=".4" />
      <rect x="11" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity=".9" />
    </svg>
  )
}

function AddIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.5V10l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}