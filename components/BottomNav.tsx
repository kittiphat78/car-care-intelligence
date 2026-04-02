'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/',        label: 'ภาพรวม',     icon: '📈' },
  { href: '/add',     label: 'เพิ่มรายการ', icon: '📝' },
  { href: '/history', label: 'ประวัติ',     icon: '📂' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 px-6 pointer-events-none"
    >
      <div className="
        bg-slate-950/95 backdrop-blur-2xl
        border border-white/[0.08]
        shadow-[0_24px_60px_rgba(0,0,0,0.45),0_0_0_0.5px_rgba(255,255,255,0.05)]
        rounded-[32px] flex items-center p-1.5 gap-1
        pointer-events-auto w-full max-w-[360px]
        transition-all duration-500
      ">
        {tabs.map(tab => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`
                relative flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-[24px]
                transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${active
                  ? 'bg-white shadow-lg shadow-white/10 scale-[1.02]'
                  : 'hover:bg-white/5 active:scale-95'}
              `}
            >
              {/* Icon */}
              <span className={`text-xl leading-none transition-all duration-300 ${active ? 'scale-110' : 'opacity-50 grayscale'}`}>
                {tab.icon}
              </span>

              {/* Label */}
              <span className={`
                font-black tracking-tight leading-none whitespace-nowrap transition-all duration-300
                ${active
                  ? 'text-slate-900 text-[11px] opacity-100'
                  : 'text-slate-500 text-[10px] opacity-90'}
              `}>
                {tab.label}
              </span>

              {/* Active dot */}
              {active && (
                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-slate-400" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}