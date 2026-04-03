'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/',
    label: 'ภาพรวม',
    icon: (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity=".9"/>
        <rect x="11" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity=".4"/>
        <rect x="2" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity=".4"/>
        <rect x="11" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity=".9"/>
      </svg>
    ),
  },
  {
    href: '/add',
    label: 'เพิ่มงาน',
    isCenter: true,
    icon: (
      <svg width="19" height="19" viewBox="0 0 22 22" fill="none">
        <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/history',
    label: 'ประวัติ',
    icon: (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 6.5V10l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-6 pointer-events-none">
      <div className="
        pointer-events-auto
        flex items-center gap-1.5
        bg-white/90 backdrop-blur-xl
        border border-[var(--border)]
        rounded-full p-1.5
        shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]
      ">
        {tabs.map(tab => {
          const active = pathname === tab.href

          if (tab.isCenter) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  flex items-center justify-center
                  w-10 h-10 rounded-full
                  transition-all duration-200
                  ${active
                    ? 'bg-[var(--text-primary)] text-white'
                    : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:scale-95'}
                `}
              >
                {tab.icon}
              </Link>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`
                flex items-center justify-center gap-1.5
                h-10 rounded-full
                transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                ${active
                  ? 'bg-[var(--text-primary)] text-white px-4 min-w-fit'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] w-10'}
              `}
            >
              <span className="flex items-center justify-center shrink-0">
                {tab.icon}
              </span>
              {active && (
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