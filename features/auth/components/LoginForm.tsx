'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { NEXT_PARAM, safeNextPath } from '@/lib/auth/redirect'
import { Banner } from '@/components/ui/Banner'
import { Button, IconButton } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { TextInput } from '@/components/ui/TextInput'
import { FormField, describedBy } from '@/components/patterns/FormField'
import { useOnline } from '@/components/patterns/StatusBar'
import { SIGN_IN_MESSAGES, signIn, type SignInFailure } from '../api'

// component-specifications.md §3.14 · user-flows UF-AUTH-01

const REMEMBER_KEY = 'remembered_email'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function checkLogin(email: string, password: string): { email?: string; password?: string } {
  const errors: { email?: string; password?: string } = {}
  if (!email.trim()) errors.email = 'กรุณากรอกอีเมล'
  else if (!EMAIL.test(email.trim())) errors.email = 'รูปแบบอีเมลไม่ถูกต้อง'
  if (!password) errors.password = 'กรุณากรอกรหัสผ่าน'
  return errors
}

export function LoginForm() {
  const router = useRouter()
  const online = useOnline()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [failure, setFailure] = useState<SignInFailure | null>(null)
  const [busy, setBusy] = useState(false)

  // The email saved on this device (same key as v1)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY)
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEmail(saved)
        setRemember(true)
      }
    } catch {
      // Storage blocked: start empty
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setFailure(null)
    const found = checkLogin(email, password)
    setErrors(found)
    if (found.email) return emailRef.current?.focus()
    if (found.password) return passwordRef.current?.focus()

    setBusy(true)
    const result = await signIn(email.trim(), password)
    if (!result.ok) {
      // Clear the wrong password in the same update that shows the message, so
      // anything typed after the message appears is kept
      if (result.reason === 'invalid') setPassword('')
      setFailure(result.reason)
      setBusy(false)
      if (result.reason === 'invalid') passwordRef.current?.focus()
      return
    }
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, email.trim())
      else localStorage.removeItem(REMEMBER_KEY)
    } catch {
      // Not remembered; signing in still worked
    }
    // Back to the page that asked for a sign-in (same site only). Read from the address
    // only now: useSearchParams() would make Next send this page with an empty form box
    // that fills in after the JavaScript loads, shifting the layout (optimization-log O-01)
    router.replace(safeNextPath(new URLSearchParams(window.location.search).get(NEXT_PARAM)))
    router.refresh()
  }

  return (
    <form noValidate onSubmit={onSubmit} aria-busy={busy || undefined} className="grid grid-cols-1 gap-5">
      {failure && (
        <Banner tone="danger" title={SIGN_IN_MESSAGES[failure]}>
          {failure === 'invalid' ? 'ตรวจอีเมลและรหัสผ่านแล้วลองใหม่' : undefined}
        </Banner>
      )}

      <FormField id="login-email" label="อีเมล" error={errors.email}>
        <TextInput
          ref={emailRef}
          id="login-email"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          invalid={!!errors.email}
          aria-describedby={describedBy('login-email', { error: errors.email })}
        />
      </FormField>

      <FormField id="login-password" label="รหัสผ่าน" error={errors.password}>
        <TextInput
          ref={passwordRef}
          id="login-password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!errors.password}
          aria-describedby={describedBy('login-password', { error: errors.password })}
          suffix={
            <IconButton
              icon={showPassword ? 'eye-off' : 'eye'}
              aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
              className="-mr-3"
            />
          }
        />
      </FormField>

      <Checkbox label="จดจำอีเมล" checked={remember} onChange={setRemember} />

      <Button type="submit" size="lg" fullWidth disabled={!online} isLoading={busy} loadingText="กำลังเข้าสู่ระบบ…">
        {online ? 'เข้าสู่ระบบ' : 'ไม่มีอินเทอร์เน็ต'}
      </Button>

      <p className="text-center text-caption text-text-tertiary">ลืมรหัสผ่าน? ติดต่อผู้ดูแลร้านเพื่อตั้งรหัสผ่านใหม่</p>
    </form>
  )
}
