'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/',        label: 'ภาพรวม',   icon: '📈' }, // ดูสถิติง่ายๆ
  { href: '/add',     label: 'เพิ่มรายการ', icon: '📝' }, // บันทึกงานใหม่
  { href: '/history', label: 'ประวัติ',    icon: '📂' }, // ดูย้อนหลัง
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-6 pointer-events-none font-sarabun">
      <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-[35px] flex items-center p-2 pointer-events-auto w-full max-w-[350px] transition-all duration-500">
        {tabs.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex-1 flex flex-col items-center gap-1.5 py-3 rounded-[28px] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${active 
                  ? 'bg-white text-slate-950 shadow-xl scale-100' 
                  : 'text-slate-300 hover:text-white active:scale-95'}`}
            >
              {active && (
                <div className="absolute -top-1 w-1 h-1 bg-white rounded-full animate-pulse" />
              )}
              
              {/* ปรับขนาดไอคอนให้พอดีสายตา */}
              <span className={`text-xl transition-transform duration-300 ${active ? 'scale-110' : 'opacity-70'}`}>
                {tab.icon}
              </span>
              
              {/* 📍 ล็อกขนาดตัวภาษาไทยให้พอดี ไม่แตกแถว */}
              <span className={`font-black tracking-tight leading-none whitespace-nowrap transition-all duration-300
                ${active 
                  ? 'text-slate-950 text-[11px] opacity-100' 
                  : 'text-slate-300 text-[10px] opacity-80'}`}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}