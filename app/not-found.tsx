import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-[var(--bg)] text-center slide-up">
      <div className="card p-10 max-w-sm w-full flex flex-col items-center shadow-xl border border-[var(--border)]">
        <div className="w-20 h-20 bg-[var(--surface-2)] rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner">
          🔍
        </div>
        <h2 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">
          ไม่พบหน้าเว็บนี้
        </h2>
        <p className="text-sm font-medium text-[var(--text-tertiary)] mb-8 leading-relaxed">
          หน้าที่คุณกำลังค้นหาอาจถูกลบไปแล้ว หรือคุณอาจพิมพ์ URL ผิด
        </p>
        <Link 
          href="/" 
          className="w-full bg-[var(--text-primary)] text-white font-bold py-3.5 rounded-[var(--radius-md)] active:scale-95 transition-transform hover:shadow-lg flex items-center justify-center gap-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          กลับไปหน้าหลัก
        </Link>
      </div>
    </div>
  )
}
