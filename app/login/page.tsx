'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 1. โหลดอีเมลที่เคยจดจำไว้ในเครื่อง (localStorage)
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

    // ใช้ FormData เพื่อให้ Browser เข้าใจว่าเป็นข้อมูลฟอร์มมาตรฐาน
    const formData = new FormData(e.currentTarget)
    const emailValue = formData.get('email') as string
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
        // จัดการระบบ "จดจำฉันไว้" (อีเมล)
        if (rememberMe) {
          localStorage.setItem('remembered_email', emailValue)
        } else {
          localStorage.removeItem('remembered_email')
        }

        // สำคัญ: บังคับ Refresh เพื่อให้ Session ใหม่ทำงาน
        router.refresh()
        router.push('/')
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 text-slate-900 bg-[#F8FAFC] font-sarabun">
      <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-blue-900/5 border border-slate-100 max-w-md mx-auto w-full">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-sm border border-blue-100/50">
            🔐
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">เข้าสู่ระบบ</h1>
          <p className="text-slate-400 font-bold mt-2">ระบบจัดการร้านล้างรถ 🧼✨</p>
        </div>

        {/* ✅ ต้องมี action และ method เพื่อให้ Browser รู้ว่าเป็น Login Form */}
        <form onSubmit={handleLogin} action="#" method="POST" className="space-y-6">

          {/* Email */}
          <div className="space-y-2">
            <label className="px-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">อีเมล</label>
            <input
              type="email"
              name="email" // ✅ ห้ามลบ name
              autoComplete="username email" // ✅ ช่วยให้ Browser รู้ว่านี่คือช่อง Username
              placeholder="example@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-[22px] px-6 py-4 text-lg font-bold outline-none focus:border-blue-500 focus:bg-white transition-all"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="px-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">รหัสผ่าน</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password" // ✅ ห้ามลบ name
                autoComplete="current-password" // ✅ บอก Browser ว่านี่คือรหัสผ่านปัจจุบัน
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[22px] px-6 py-4 text-lg font-bold outline-none focus:border-blue-500 focus:bg-white transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-xl bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50"
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          {/* Remember Me Toggle */}
          <div className="flex items-center px-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
                <div className="w-6 h-6 border-2 border-slate-200 rounded-lg peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
                  <div className={`w-2 h-2 bg-white rounded-sm transition-transform ${rememberMe ? 'scale-100' : 'scale-0'}`} />
                </div>
              </div>
              <span className="text-sm font-bold text-slate-500 group-hover:text-slate-700 transition-colors">จดจำฉันไว้ (อีเมล)</span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 font-bold text-sm px-5 py-4 rounded-2xl animate-in fade-in slide-in-from-top-1">
              ⚠️ {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit" // ✅ ต้องเป็น submit
            disabled={loading}
            className={`w-full py-5 rounded-[25px] text-xl font-black text-white transition-all shadow-xl active:scale-[0.98] ${
              loading ? 'bg-slate-400' : 'bg-slate-900 shadow-slate-200 hover:bg-black'
            }`}
          >
            {loading ? '⏳ กำลังดำเนินการ...' : 'ตกลง เข้าสู่ระบบ ✅'}
          </button>

        </form>

        <p className="text-center mt-10 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
          CARWASH MANAGEMENT SYSTEM V2
        </p>
      </div>
    </div>
  )
}