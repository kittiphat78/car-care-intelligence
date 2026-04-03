'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/',
    label: 'ภาพรวม',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
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
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/history',
    label: 'ประวัติ',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" opacity=".4"/>
        <path d="M10 6.5V10l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-6">
      <div className="
        flex items-center gap-1
        bg-white/90 backdrop-blur-xl
        border border-[var(--border)]
        rounded-[18px] p-1.5
        shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]
        w-full max-w-[320px]
      ">
        {tabs.map(tab => {
          const active = pathname === tab.href

          if (tab.isCenter) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-3
                  rounded-[13px] transition-all duration-200
                  ${active
                    ? 'bg-[var(--text-primary)] text-white shadow-sm'
                    : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'}
                `}
              >
                <span className="flex items-center justify-center">{tab.icon}</span>
                <span className="text-[10px] font-semibold leading-none">{tab.label}</span>
              </Link>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`
                flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-3
                rounded-[13px] transition-all duration-200
                ${active
                  ? 'bg-[var(--surface-2)] text-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-2)]/60'}
              `}
            >
              <span className="flex items-center justify-center">{tab.icon}</span>
              <span className={`text-[10px] font-semibold leading-none transition-colors ${active ? 'text-[var(--text-primary)]' : ''}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}