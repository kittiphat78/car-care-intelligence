'use client'

import { useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { toUserMessage } from '@/lib/errors'
import { clearLocalDrafts, signOut } from '../api'

// screen-specifications.md §12 — opened from any page with ?logout=1, so the browser's
// back button closes it (URL state, design-to-code-map.md §4).
export function LogoutDialog({ email }: { email: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = searchParams.get('logout') === '1'

  function close() {
    if (busy) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete('logout')
    const query = params.toString()
    setError(null)
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  async function confirm() {
    setBusy(true)
    setError(null)
    const result = await signOut()
    if (!result.ok) {
      setBusy(false)
      setError(toUserMessage(result.error))
      return
    }
    clearLocalDrafts()
    router.replace('/login')
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      variant="alert"
      title="ออกจากระบบ?"
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={close} disabled={busy}>
            ยกเลิก
          </Button>
          <Button variant="danger" onClick={confirm} isLoading={busy} loadingText="กำลังออก…">
            ออกจากระบบ
          </Button>
        </>
      }
    >
      <div className="grid gap-2 text-body">
        {email && <p className="text-text">บัญชี {email}</p>}
        <p className="text-text-secondary">ข้อมูลที่กรอกค้างในเครื่องนี้จะถูกล้าง</p>
        {error && (
          <Banner tone="danger" title="ออกจากระบบไม่สำเร็จ">
            {error}
          </Banner>
        )}
      </div>
    </Dialog>
  )
}
