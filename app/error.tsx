'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { reportError } from '@/lib/observability'
import { Button, buttonClassName } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

// screen-specifications.md §7 — an unexpected error on a page. Saved data is safe;
// the reference (Next's digest) matches the server log entry.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Application Error:', error)
    reportError(error)
  }, [error])

  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-bg px-(--page-gutter) py-10">
      <div role="alert" className="grid w-full max-w-100 grid-cols-1 justify-items-center gap-3 text-center">
        <Icon name="alert" className="size-10 text-danger-text" />
        <h1 className="text-title text-text">เกิดข้อผิดพลาด</h1>
        <p className="text-body text-text-secondary">ข้อมูลที่บันทึกไว้แล้วไม่ได้รับผลกระทบ</p>
        {error.digest && <p className="text-caption text-text-tertiary select-all">รหัสอ้างอิง: {error.digest}</p>}
        <div className="mt-2 grid w-full grid-cols-1 gap-3">
          <Button leadingIcon="refresh" fullWidth onClick={() => reset()}>
            ลองอีกครั้ง
          </Button>
          <Link href="/" className={buttonClassName({ variant: 'secondary', fullWidth: true })}>
            กลับหน้าภาพรวม
          </Link>
        </div>
      </div>
    </main>
  )
}
