// แถบบอก environment บนทุกหน้าที่ไม่ใช่ production (ADR-12) ค่าถูกกำหนดตอน build ใน next.config.ts
const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV ?? 'development'
const DATABASE = process.env.NEXT_PUBLIC_APP_DATABASE ?? 'unknown'

const LABELS: Record<string, string> = {
  preview: 'ระบบทดสอบ (Preview)',
  development: 'เครื่องนักพัฒนา (Development)',
}

export function EnvironmentBar() {
  if (APP_ENV === 'production') return null

  const onProductionData = DATABASE === 'production'
  return (
    <div
      role="status"
      className={`sticky top-0 z-50 w-full px-4 py-1.5 text-center text-xs font-bold ${onProductionData ? 'bg-[var(--red)] text-white' : 'bg-[var(--amber)] text-black'}`}
    >
      {LABELS[APP_ENV] ?? APP_ENV}
      {onProductionData && ' · ⚠ กำลังใช้ฐานข้อมูลจริงของร้าน'}
      {DATABASE === 'other' && ' · ข้อมูลในหน้านี้ไม่ใช่ข้อมูลจริง'}
    </div>
  )
}
