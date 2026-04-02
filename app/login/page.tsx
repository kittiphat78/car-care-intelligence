'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false) // ✅ ฟีเจอร์จดจำฉัน
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // ✅ ดึงอีเมลที่เคยบันทึกไว้เมื่อเปิดหน้าจอ
  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      alert('❌ เข้าสู่ระบบไม่สำเร็จ: ' + error.message)
    } else if (data.session) {
      // ✅ ถ้าติ๊กจดจำ ให้บันทึกอีเมลลงเครื่อง ถ้าไม่ติ๊กให้ลบทิ้ง
      if (rememberMe) {
        localStorage.setItem('remembered_email', email)
      } else {
        localStorage.removeItem('remembered_email')
      }

      router.refresh()
      router.push('/')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center px-6 font-sarabun text-slate-900">
      <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-blue-900/5 border border-slate-100 max-w-md mx-auto w-full">
        
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-sm border border-blue-100/50">
            🔐
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">เข้าสู่ระบบ</h1>
          <p className="text-slate-400 font-bold mt-2">ระบบจัดการร้านล้างรถ 🧼✨</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="px-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">อีเมล</label>
            <input 
              type="email" 
              name="email" 
              autoComplete="email"
              placeholder="พ่อ@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-[22px] px-6 py-4 text-lg font-bold outline-none focus:border-blue-500 focus:bg-white transition-all"
              required
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="px-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">รหัสผ่าน</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[22px] px-6 py-4 text-lg font-bold outline-none focus:border-blue-500 focus:bg-white transition-all"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-xl bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors"
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          {/* ✅ Remember Me & Forget Pass Row */}
          <div className="flex items-center justify-between px-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <div className="w-6 h-6 border-2 border-slate-200 rounded-lg peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
                  <div className={`w-2 h-2 bg-white rounded-sm transition-transform ${rememberMe ? 'scale-100' : 'scale-0'}`} />
                </div>
              </div>
              <span className="text-sm font-bold text-slate-500 group-hover:text-slate-700 transition-colors">จดจำฉันไว้</span>
            </label>
          </div>

          {/* Login Button */}
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-5 rounded-[25px] text-xl font-black text-white transition-all shadow-xl
            ${loading 
              ? 'bg-slate-300' 
              : 'bg-slate-900 active:scale-[0.98] shadow-slate-200 hover:bg-black'
            }`}
          >
            {loading ? '⏳ กำลังดำเนินการ...' : 'ตกลง เข้าสู่ระบบ ✅'}
          </button>
        </form>

        <p className="text-center mt-10 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
          CARWASH MANAGEMENT SYSTEM
        </p>
      </div>
    </div>
  )
}