'use client'

import { useState, useEffect, memo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ─────────────────────────────────────────────────────────────────────────────
// 1. Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe]     = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('remembered_email')
    if (saved) { 
      setEmail(saved)
      setRememberMe(true) 
    }
  }, [])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // ใช้ FormData เพื่อความปลอดภัยและเข้าถึงค่าง่าย
    const formData     = new FormData(e.currentTarget)
    const emailValue   = formData.get('email') as string
    const passwordValue = formData.get('password') as string

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: emailValue,
        password: passwordValue,
      })

      if (authError) { 
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
        setLoading(false)
        return 
      }

      if (data.session) {
        if (rememberMe) localStorage.setItem('remembered_email', emailValue)
        else localStorage.removeItem('remembered_email')
        
        router.refresh()
        router.push('/')
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-12 bg-[var(--bg)]">
      
      <BrandLogo />

      <div className="card-elevated w-full max-w-sm p-6 fade-up delay-1">
        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          
          {/* ── Email Field ── */}
          <div>
            <label htmlFor="emailInput" className="label cursor-pointer">อีเมล</label>
            <input
              id="emailInput"
              type="email"
              name="email"
              autoComplete="username email"
              placeholder="example@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>

          {/* ── Password Field ── */}
          <div>
            <label htmlFor="passwordInput" className="label cursor-pointer">รหัสผ่าน</label>
            <div className="relative">
              <input
                id="passwordInput"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input pr-12"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* ── Remember Me ── */}
          <label htmlFor="rememberCheckbox" className="flex items-center gap-2.5 cursor-pointer py-1 group w-max">
            <div className="relative">
              <input
                id="rememberCheckbox"
                type="checkbox"
                className="sr-only peer"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <div className="w-5 h-5 rounded-[5px] border-2 border-[var(--border)] bg-white peer-checked:bg-[var(--accent)] peer-checked:border-[var(--accent)] transition-all flex items-center justify-center group-hover:border-[var(--accent-hover)]">
                {rememberMe && <CheckIcon />}
              </div>
            </div>
            <span className="text-sm text-[var(--text-secondary)] select-none">จดจำอีเมลไว้</span>
          </label>

          {/* ── Error Banner ── */}
          <ErrorBanner error={error} />

          {/* ── Submit Button ── */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3.5 text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" aria-hidden="true" />
                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              'เข้าสู่ระบบ'
            )}
          </button>

        </form>
      </div>

      <p className="mt-8 text-[11px] text-[var(--text-tertiary)] tracking-widest uppercase fade-up delay-2 select-none">
        Carwash Management System
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Sub-Components & SVGs (Clean UI)
// ─────────────────────────────────────────────────────────────────────────────

const BrandLogo = memo(function BrandLogo() {
  return (
    <div className="mb-8 text-center fade-up select-none">
      <div className="w-14 h-14 rounded-[16px] bg-[var(--text-primary)] flex items-center justify-center mx-auto mb-4 shadow-[var(--shadow-md)]">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
          <path d="M4 16c0-2 1-4 3-5l2-5h8l2 5c2 1 3 3 3 5v2H4v-2z" fill="white" fillOpacity=".9"/>
          <circle cx="8" cy="20" r="2.5" fill="white"/>
          <circle cx="18" cy="20" r="2.5" fill="white"/>
          <path d="M2 16h22" stroke="white" strokeWidth="1.2" strokeOpacity=".4"/>
        </svg>
      </div>
      <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Carwash</h1>
      <p className="text-sm text-[var(--text-secondary)] mt-1">ระบบจัดการร้านล้างรถ</p>
    </div>
  )
})

const ErrorBanner = memo(function ErrorBanner({ error }: { error: string }) {
  if (!error) return null
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-[var(--radius-md)] bg-[var(--red-light)] border border-red-100 fade-up" role="alert">
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0" aria-hidden="true">
        <circle cx="7.5" cy="7.5" r="6.5" stroke="#DC2626" strokeWidth="1.3"/>
        <path d="M7.5 4.5v4M7.5 10.5v.5" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <p className="text-sm font-medium text-[var(--red)]">{error}</p>
    </div>
  )
})

const EyeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
    <path d="M1 8.5C2.5 5 5.5 3 8.5 3s6 2 7.5 5.5C14.5 12 11.5 14 8.5 14S2.5 12 1 8.5z" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)

const EyeOffIcon = () => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
    <path d="M1 8.5C2.5 5 5.5 3 8.5 3s6 2 7.5 5.5C14.5 12 11.5 14 8.5 14S2.5 12 1 8.5z" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M2 2l13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)