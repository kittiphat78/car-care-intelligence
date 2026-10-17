import Link from 'next/link'
import { buttonClassName } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

// screen-specifications.md §7
export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-bg px-(--page-gutter) py-10">
      <div className="grid w-full max-w-100 grid-cols-1 justify-items-center gap-3 text-center">
        <Icon name="search" className="size-10 text-text-tertiary" />
        <h1 className="text-title text-text">ไม่พบหน้านี้</h1>
        <p className="text-body text-text-secondary">ลิงก์อาจไม่ถูกต้องหรือถูกย้ายไปแล้ว</p>
        <Link href="/" className={buttonClassName({ fullWidth: true })}>
          กลับหน้าภาพรวม
        </Link>
      </div>
    </main>
  )
}
