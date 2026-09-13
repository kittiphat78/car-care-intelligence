import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center" style={{ background: 'var(--bg)' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }} />
      </div>

      <div className="card-elevated p-10 max-w-sm w-full flex flex-col items-center relative z-10 bounce-in">
        <div className="w-20 h-20 rounded-[22px] flex items-center justify-center text-4xl mb-6 float-soft" style={{ background: 'var(--accent-light)', border: '2px solid var(--border-glow)' }}>
          🔍
        </div>
        <h2 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">
          ไม่พบหน้าเว็บนี้
        </h2>
        <p className="text-sm font-medium text-[var(--text-tertiary)] mb-8 leading-relaxed">
          หน้าที่คุณกำลังค้นหาอาจถูกลบไปแล้ว<br />หรือคุณอาจพิมพ์ URL ผิด
        </p>
        <Link
          href="/"
          className="btn btn-accent w-full py-3.5 text-[15px]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          กลับไปหน้าหลัก
        </Link>
      </div>
    </div>
  )
}
