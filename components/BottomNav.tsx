'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/',        label: 'ภาพรวม',     icon: '📈', activeColor: 'bg-blue-600' },
  { href: '/add',     label: 'เพิ่มรายการ', icon: '＋',  activeColor: 'bg-slate-900', isCenter: true },
  { href: '/history', label: 'ประวัติ',     icon: '📂', activeColor: 'bg-indigo-600' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-5 px-5 pointer-events-none"
    >
      <div className="
        relative flex items-center
        bg-[#0D1117]/90 backdrop-blur-2xl
        border border-white/[0.07]
        rounded-[28px] p-1.5 gap-1
        pointer-events-auto w-full max-w-[340px]
        shadow-[0_20px_56px_rgba(0,0,0,0.5),0_0_0_0.5px_rgba(255,255,255,0.04)]
        transition-all duration-500
      ">
        {tabs.map(tab => {
          const active = pathname === tab.href

          /* Center "add" button */
          if (tab.isCenter) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`
                  relative flex-1 flex flex-col items-center justify-center gap-0.5 py-3 px-2
                  rounded-[20px] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                  ${active
                    ? 'bg-white shadow-[0_4px_16px_rgba(255,255,255,0.12)]'
                    : 'hover:bg-white/5 active:scale-95'}
                `}
              >
                <span className={`
                  w-9 h-9 rounded-2xl flex items-center justify-center text-lg font-black
                  transition-all duration-300
                  ${active
                    ? 'bg-slate-900 text-white shadow-md scale-110'
                    : 'bg-white/10 text-white/70'}
                `}>
                  {tab.icon}
                </span>
                <span className={`text-[9px] font-black tracking-wide transition-all duration-300
                  ${active ? 'text-slate-900' : 'text-white/40'}`}>
                  {tab.label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`
                relative flex-1 flex flex-col items-center gap-1 py-3 px-2
                rounded-[20px] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${active
                  ? 'bg-white shadow-[0_4px_16px_rgba(255,255,255,0.12)] scale-[1.02]'
                  : 'hover:bg-white/5 active:scale-95'}
              `}
            >
              {/* Icon */}
              <span className={`text-xl leading-none transition-all duration-300
                ${active ? 'scale-110' : 'opacity-40 grayscale'}`}>
                {tab.icon}
              </span>

              {/* Label */}
              <span className={`
                font-black tracking-tight leading-none whitespace-nowrap transition-all duration-300
                ${active ? 'text-slate-900 text-[10px]' : 'text-white/50 text-[10px]'}
              `}>
                {tab.label}
              </span>

              {/* Active indicator */}
              {active && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-500" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}