'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { loginPathFor } from '@/lib/auth/redirect'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { isSigningOut } from '../api'

// screen-specifications.md §16 · user-flows UF-AUTH-03. Supabase refreshes the session
// by itself; when that is no longer possible it reports SIGNED_OUT. Unless this tab
// signed out on purpose, the person is asked to sign in again and comes back to the
// same page. Drafts stay in this tab, so nothing typed is lost, and nothing is sent
// again on its own after signing in.
export function SessionExpiredDialog() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [expired, setExpired] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && !isSigningOut()) setExpired(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const query = searchParams.toString()
  const back = loginPathFor(query ? `${pathname}?${query}` : pathname)

  return (
    <Dialog
      open={expired}
      // Cannot be dismissed: nothing works until the person signs in again
      onClose={() => {}}
      variant="alert"
      title="กรุณาเข้าสู่ระบบอีกครั้ง"
      initialFocusRef={buttonRef}
      footer={
        <Button
          ref={buttonRef}
          fullWidth
          onClick={() => {
            // A full page load, so no data from the old session stays in memory
            window.location.assign(back)
          }}
        >
          เข้าสู่ระบบ
        </Button>
      }
    >
      <p className="text-body text-text-secondary">เซสชันหมดอายุ ข้อมูลที่กรอกไว้ยังอยู่ และจะกลับมาหลังเข้าสู่ระบบ</p>
    </Dialog>
  )
}
