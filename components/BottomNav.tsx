'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/',        label: 'Insight',    icon: '📊' },
  { href: '/add',     label: 'New Entry',  icon: '➕' },
  { href: '/history', label: 'Archive',    icon: '📜' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-6 pointer-events-none">
      <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[35px] flex items-center p-2.5 pointer-events-auto w-full max-w-[340px] transition-all duration-500">
        {tabs.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex-1 flex flex-col items-center gap-1.5 py-3 rounded-[28px] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${active 
                  ? 'bg-white text-slate-950 shadow-xl scale-100' 
                  : 'text-slate-500 hover:text-slate-300 active:scale-95'}`}
            >
              {active && (
                <div className="absolute -top-1 w-1 h-1 bg-white rounded-full animate-pulse" />
              )}
              
              <span className={`text-xl transition-transform duration-300 ${active ? 'scale-110' : ''}`}>
                {tab.icon}
              </span>
              
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-opacity duration-300
                ${active ? 'opacity-100' : 'opacity-40'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}