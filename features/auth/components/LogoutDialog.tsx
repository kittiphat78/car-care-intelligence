'use client'

import { useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { toUserMessage } from '@/lib/errors'
import { forgetScreens } from '@/lib/screen-memory'
import { replaceUrl } from '@/lib/url-state'
import { forgetCustomers } from '@/features/customers/memory'
import { signOut } from '../api'
import { clearLocalDrafts } from '../drafts'

// screen-specifications.md §12 — opened from any page with ?logout=1, so the browser's
// back button closes it (URL state, design-to-code-map.md §4).
export function LogoutDialog({ email }: { email: string }) {
  const router = useRouter()
  const toast = useToast()
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
    // In the browser only, so the dialog closes at once (lib/url-state.ts)
    replaceUrl(query ? `${pathname}?${query}` : pathname)
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
    forgetCustomers()
    forgetScreens()
    // The server could not be reached, but this device is signed out (UF-AUTH-04)
    if (result.data.localOnly) toast.info('ออกจากระบบในเครื่องนี้แล้ว')
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
      <div className="grid grid-cols-1 gap-2 text-body">
        {email && <p className="text-text">บัญชี {email}</p>}
        <p className="text-text-secondary">ออกเฉพาะเครื่องนี้ เครื่องอื่นที่ใช้บัญชีนี้ยังใช้งานได้ตามปกติ</p>
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
