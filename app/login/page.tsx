'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false) // ดูรหัสผ่าน
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // พยายามเข้าสู่ระบบ
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      alert('❌ เข้าสู่ระบบไม่สำเร็จ: ' + error.message)
    } else if (data.session) {
      // บังคับ Refresh เพื่อให้ Middleware เห็น Cookie ใหม่และจำ Session
      router.refresh()
      router.push('/')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-6 font-sarabun">
      <div className="bg-white p-8 rounded-[35px] shadow-xl border-2 border-slate-100 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4 text-blue-600">🔐</div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">เข้าสู่ระบบ</h1>
          <p className="text-slate-500 font-bold mt-2">สำหรับพ่อและแม่ 🧼✨</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* ส่วนของอีเมล */}
          <div className="space-y-2">
            <label className="px-2 text-sm font-black uppercase text-slate-400">อีเมล</label>
            <input 
              type="email" 
              name="email" // เพิ่ม name เพื่อให้ Browser จำรหัสได้
              autocomplete="email"
              placeholder="พ่อ@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-[22px] px-6 py-4 text-lg font-bold outline-none focus:border-blue-500 transition-all"
              required
            />
          </div>

          {/* ส่วนของรหัสผ่าน */}
          <div className="space-y-2">
            <label className="px-2 text-sm font-black uppercase text-slate-400">รหัสผ่าน</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" // เพิ่ม name เพื่อให้ Browser จำรหัสได้
                autocomplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-[22px] px-6 py-4 text-lg font-bold outline-none focus:border-blue-500 transition-all"
                required
              />
              {/* ปุ่มดวงตา ดูรหัสผ่าน */}
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-xl bg-white rounded-full shadow-sm"
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          {/* ปุ่มตกลง */}
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-5 rounded-[25px] text-xl font-black text-white transition-all shadow-lg
            ${loading ? 'bg-slate-300' : 'bg-blue-600 active:scale-95 shadow-blue-200 hover:bg-blue-700'}`}
          >
            {loading ? '⏳ กำลังเข้าเครื่อง...' : 'ตกลง ✅'}
          </button>
        </form>

        <p className="text-center mt-6 text-[10px] font-black text-slate-300 uppercase tracking-widest">
          CARWASH MANAGEMENT SYSTEM V2
        </p>
      </div>
    </div>
  )
}