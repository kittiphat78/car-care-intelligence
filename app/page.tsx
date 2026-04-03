'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { supabase } from '@/lib/supabase'
import { Record, Expense } from '@/types'
import RecordCard from '@/components/RecordCard'
import { useRouter } from 'next/navigation'

type ChartMode = 'week' | 'month'

interface WeatherData {
  icon: string
  condition: string
  temp: number
  prob: number
  aqi: number
  aqiStatus: { label: string, colorClass: string }
  message: string
  bgClass: string
  textClass: string
  badgeClass: string
}

export default function Dashboard() {
  const router = useRouter()
  const [userEmail, setUserEmail]           = useState('')
  const [records, setRecords]               = useState<Record[]>([])
  const [allRecords, setAllRecords]         = useState<Record[]>([])
  const [expenses, setExpenses]             = useState<Expense[]>([])
  const [yesterdayRecords, setYesterdayRecords] = useState<Record[]>([])
  const [chartMode, setChartMode]           = useState<ChartMode>('week')
  const [loading, setLoading]               = useState(true)

  const [totalUnpaidAmount, setTotalUnpaidAmount] = useState(0)
  const [unpaidRecords, setUnpaidRecords]         = useState<Record[]>([])
  const [isUnpaidModalOpen, setIsUnpaidModalOpen] = useState(false)

  const [weather, setWeather] = useState<WeatherData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserEmail(user.email ?? '')

    const todayStart     = new Date(); todayStart.setHours(0,0,0,0)
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate()-1)
    const thirtyDaysAgo  = new Date(todayStart); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-30)

    const [todayRes, yesterdayRes, allRes, expenseRes, unpaidRes] = await Promise.all([
      supabase.from('records').select('*').gte('created_at', todayStart.toISOString()).order('created_at', { ascending: false }),
      supabase.from('records').select('*').gte('created_at', yesterdayStart.toISOString()).lt('created_at', todayStart.toISOString()),
      supabase.from('records').select('*').gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: true }),
      supabase.from('expenses').select('*').gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('records').select('*').eq('payment_status', 'unpaid').order('created_at', { ascending: true })
    ])

    setRecords(todayRes.data ?? [])
    setYesterdayRecords(yesterdayRes.data ?? [])
    setAllRecords(allRes.data ?? [])
    setExpenses(expenseRes.data ?? [])
    
    const unpaidData = unpaidRes.data ?? []
    setUnpaidRecords(unpaidData)
    setTotalUnpaidAmount(unpaidData.reduce((s, r) => s + r.price, 0))
    
    setLoading(false)
  }, [router])

  // 🌤️ ระบบพยากรณ์ความวุ่นวาย + ฝุ่น
  useEffect(() => {
    const fetchWeather = async () => {
      let icon = '☁️'; let condition = 'กำลังอัปเดตอากาศ...'; let temp = 0; let prob = 0;
      let message = 'กำลังวิเคราะห์สภาพอากาศและฝุ่น...';
      let aqiValue = 0;
      let aqiStatus = { label: 'รอข้อมูล', colorClass: 'bg-gray-100 text-gray-500 border-gray-300' };
      let bgClass = 'from-[#F0F9FF] to-[#E0F2FE] border-[#BAE6FD]';
      let textClass = 'text-[#0369A1]';
      let badgeClass = 'bg-[#BAE6FD] text-[#0284C7]';
      let probTom = 0;

      try {
        const wRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=19.91&longitude=99.84&daily=weather_code,precipitation_probability_max,temperature_2m_max&timezone=Asia%2FBangkok&forecast_days=2');
        if (wRes.ok) {
          const data = await wRes.json();
          const codeToday = data.daily?.weather_code?.[0] || 0;
          prob = data.daily?.precipitation_probability_max?.[0] || 0;
          temp = Math.round(data.daily?.temperature_2m_max?.[0] || 30);
          probTom = data.daily?.precipitation_probability_max?.[1] || 0;

          if (codeToday <= 1) { icon = '☀️'; condition = 'แดดจัด'; }
          else if (codeToday <= 3) { icon = '⛅'; condition = 'มีเมฆบางส่วน'; }
          else if (codeToday <= 67) { icon = '🌧️'; condition = 'ฝนตก'; }
          else if (codeToday <= 82) { icon = '🌦️'; condition = 'ฝนตกหนัก'; }
          else { icon = '⛈️'; condition = 'พายุเข้า'; }

          if (codeToday <= 3) {
            message = (probTom > 50) ? `วันนี้อากาศดี รีบทำรอบกอบโกยเต็มที่เลยครับ! (พรุ่งนี้มีแววฝนตก ${probTom}%)` : 'อากาศเป็นใจ ลูกค้าเข้าต่อเนื่องแน่นอน เตรียมกำลังคนและน้ำยาให้พร้อมลุย!';
            bgClass = 'from-[#FFF7ED] to-[#FFEDD5] border-[#FED7AA]';
            textClass = 'text-[#C2410C]';
            badgeClass = 'bg-[#FED7AA] text-[#C2410C]';
          } else {
            message = `วันนี้ฟ้าฝนไม่เป็นใจ ลูกค้าน่าจะเงียบ ให้ลูกน้องสลับพักหรือเช็คสต๊อกน้ำยาได้เลยครับ`;
            bgClass = 'from-[#F3F4F6] to-[#E5E7EB] border-[#D1D5DB]';
            textClass = 'text-[#374151]';
            badgeClass = 'bg-[#D1D5DB] text-[#4B5563]';
          }
        }
      } catch (err) { 
        console.error("โหลดอากาศไม่สำเร็จ แต่ระบบจะไม่พัง:", err) 
      }

      try {
        const aqRes = await fetch('https://api.waqi.info/feed/geo:19.91;99.84/?token=demo');
        if (aqRes.ok) {
          const aqData = await aqRes.json();
          if (aqData.status === 'ok') {
            aqiValue = aqData.data.aqi;
          }
        }
      } catch (err) { 
        console.error("โหลดฝุ่นไม่สำเร็จ แต่ระบบจะไม่พัง:", err) 
      }

      if (aqiValue > 300) {
        aqiStatus = { label: 'วิกฤต', colorClass: 'bg-[#4C0519] text-white border-[#881337]' };
        message += ' 🚨 วิกฤตฝุ่นทะลุพิกัด อันตรายมากๆ ให้ช่างใส่หน้ากาก N95 ตลอดเวลา!';
      } else if (aqiValue > 200) {
        aqiStatus = { label: 'อันตรายมาก', colorClass: 'bg-purple-100 text-purple-800 border-purple-300' };
        message += ' 🚨 ฝุ่นระดับสีม่วง (200+) อันตรายมาก ให้ช่างใส่หน้ากาก N95 ด้วยนะครับ!';
      } else if (aqiValue > 150) {
        aqiStatus = { label: 'อันตราย', colorClass: 'bg-red-100 text-red-700 border-red-300' };
        message += ' 😷 ปล. วันนี้ฝุ่นแดง อย่าลืมให้ช่างใส่หน้ากากป้องกันตอนทำงานนะครับ';
      } else if (aqiValue > 100) {
        aqiStatus = { label: 'เริ่มมีผลกระทบ', colorClass: 'bg-orange-100 text-orange-700 border-orange-300' };
      } else if (aqiValue > 50) {
        aqiStatus = { label: 'ปานกลาง', colorClass: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
      } else if (aqiValue > 0) {
        aqiStatus = { label: 'ดี', colorClass: 'bg-green-100 text-green-700 border-green-300' };
      }

      setWeather({
        icon, condition, temp, prob, aqi: aqiValue, aqiStatus, message, bgClass, textClass, badgeClass
      });
    }

    fetchWeather();
  }, [])

  useEffect(() => {
    fetchData()
    const channel = supabase.channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' },  fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData]) 

  async function markAllAsPaidByCustomer(customerName: string) {
    const confirmMsg = customerName 
      ? `ยืนยันว่าเต็นท์/ลูกค้า "${customerName}" ชำระเงินครบแล้วทั้งหมด?` 
      : `ยืนยันว่า "ลูกค้าทั่วไป (ไม่ระบุชื่อ)" ชำระเงินครบแล้วทั้งหมด?`
    
    if (!window.confirm(confirmMsg)) return

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('records')
      .update({ 
        payment_status: 'paid',
        updated_at: now,
        updated_by_email: userEmail
      })
      .eq('payment_status', 'unpaid')
      .eq('customer_name', customerName)

    if (!error) fetchData() 
    else alert('เกิดข้อผิดพลาด: ' + error.message)
  }

  const todayStartLocal  = new Date(); todayStartLocal.setHours(0,0,0,0)
  const todayTotalIncome = records.reduce((s,r) => s + r.price, 0)
  const todayPaid        = records.filter(r => r.payment_status === 'paid').reduce((s,r) => s + r.price, 0)
  const todayUnpaid      = records.filter(r => r.payment_status === 'unpaid').reduce((s,r) => s + r.price, 0)
  const todayExpense     = expenses.filter(e => new Date(e.created_at) >= todayStartLocal).reduce((s,e) => s + e.amount, 0)
  const netProfit        = todayPaid - todayExpense
  const washCount        = records.filter(r => r.type === 'wash').length
  const polishCount      = records.filter(r => r.type === 'polish').length
  const yesterdayIncome  = yesterdayRecords.reduce((s,r) => s + r.price, 0)
  const diffAmount       = todayTotalIncome - yesterdayIncome
  const diffPct          = yesterdayIncome > 0 ? Math.round((diffAmount / yesterdayIncome) * 100) : 0
  const isUp             = diffAmount >= 0

  const chartData = useMemo(() => {
    const now  = new Date()
    const days = chartMode === 'week' ? 7 : 30
    return Array.from({ length: days }, (_,i) => {
      const d = new Date(now); d.setDate(d.getDate() - (days-1-i)); d.setHours(0,0,0,0)
      const next = new Date(d); next.setDate(next.getDate()+1)
      const dayRecs = allRecords.filter(r => { const t = new Date(r.created_at); return t >= d && t < next })
      return {
        label: chartMode === 'week'
          ? d.toLocaleDateString('th-TH', { weekday: 'short' })
          : d.toLocaleDateString('th-TH', { day: 'numeric' }),
        income: dayRecs.reduce((s,r) => s + r.price, 0),
      }
    })
  }, [allRecords, chartMode])

  if (loading) return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-[var(--bg)]">
      <div className="w-10 h-10 border-2 border-[var(--border)] border-t-[var(--text-primary)] rounded-full spinner" />
      <p className="text-sm text-[var(--text-secondary)]">กำลังโหลด...</p>
    </div>
  )

  return (
    <div className="min-h-dvh px-4 pt-6 pb-28 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between fade-up">
        <div>
          <p className="text-xs text-[var(--text-tertiary)] mb-0.5">สวัสดี,</p>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] leading-none">
            {userEmail.split('@')[0] || 'Admin'}
          </h2>
        </div>
        <button
          onClick={() => { supabase.auth.signOut(); router.push('/login') }}
          className="btn btn-ghost text-xs py-2 px-3"
        >
          ออกจากระบบ
        </button>
      </div>

      {/* ✅ แถบผู้จัดการร้านอัจฉริยะ */}
      {weather && (
        <div className={`card p-4 bg-gradient-to-br ${weather?.bgClass || 'from-gray-50 to-gray-100'} border fade-up delay-1 transition-colors duration-500`}>
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-3xl shrink-0">
                {weather?.icon || '🌡️'}
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 opacity-80 ${weather?.textClass || 'text-gray-700'}`}>
                  เมืองเชียงราย วันนี้ 📍
                </p>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${weather?.badgeClass || 'bg-gray-200 text-gray-700'}`}>
                    {weather?.condition || '-'} {weather?.temp || 0}°C
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${weather?.aqiStatus?.colorClass || 'bg-gray-100 text-gray-500'} flex items-center gap-1`}>
                    🌫️ AQI: {weather?.aqi > 0 ? weather.aqi : '...'} ({weather?.aqiStatus?.label || '...'})
                  </span>
                </div>
              </div>
            </div>
            {(weather?.prob ?? 0) > 0 && (
              <div className="text-right shrink-0">
                <p className={`text-[10px] font-bold opacity-70 ${weather?.textClass || 'text-gray-700'}`}>โอกาสฝนตก</p>
                <p className={`text-sm font-black ${weather?.textClass || 'text-gray-700'}`}>{weather?.prob}%</p>
              </div>
            )}
          </div>
          
          <div className="bg-white/70 rounded-lg p-2.5 border border-white/50 flex items-start gap-2 shadow-sm">
            <span className={`shrink-0 mt-0.5 ${weather?.textClass || 'text-gray-700'}`}>
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M7 2v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/></svg>
            </span>
            <p className={`text-xs font-bold leading-relaxed ${weather?.textClass || 'text-gray-700'}`}>
              {weather?.message || 'กำลังวิเคราะห์สภาพอากาศ...'}
            </p>
          </div>
        </div>
      )}

      {/* แถบแจ้งเตือนสมุดทวงหนี้ */}
      {totalUnpaidAmount > 0 && (
        <div 
          onClick={() => setIsUnpaidModalOpen(true)}
          className="bg-[var(--red)] p-4 rounded-[var(--radius-lg)] flex items-center justify-between shadow-lg shadow-red-200 cursor-pointer active:scale-[0.98] transition-all fade-up delay-1"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">📒</div>
            <div>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">ยอดค้างชำระสะสม</p>
              <p className="text-white text-xl font-black leading-none">฿{totalUnpaidAmount.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white/20 px-3 py-1.5 rounded-lg text-white text-xs font-bold border border-white/30 flex items-center gap-1">
            ดูรายละเอียด
          </div>
        </div>
      )}

      {/* ── Net Profit Hero ── */}
      <div className="card-dark p-5 fade-up delay-2">
        <p className="text-xs font-medium text-white/50 uppercase tracking-widest mb-3">
          กำไรสุทธิวันนี้
        </p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[2.75rem] font-bold tracking-tight leading-none text-white">
              ฿{netProfit.toLocaleString()}
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <span className={`
                inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full
                ${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}
              `}>
                {isUp ? '↑' : '↓'} {Math.abs(diffPct)}%
              </span>
              <span className="text-xs text-white/40">vs เมื่อวาน</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40 mb-1">รายรับรวม</p>
            <p className="text-lg font-semibold text-white">฿{todayTotalIncome.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-2.5 fade-up delay-3">
        <div className="card p-3.5">
          <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">รายจ่ายวันนี้</p>
          <p className="text-lg font-bold text-[var(--red)] leading-none">
            ฿{todayExpense.toLocaleString()}
          </p>
        </div>
        <div className="card p-3.5">
          <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">ล้างรถ</p>
          <div className="flex items-baseline gap-1">
            <p className="text-lg font-bold text-[var(--text-primary)] leading-none">{washCount}</p>
            <span className="text-xs text-[var(--text-tertiary)]">คัน</span>
          </div>
        </div>
        <div className="card p-3.5">
          <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-2">ขัดสี</p>
          <div className="flex items-baseline gap-1">
            <p className="text-lg font-bold text-[var(--text-primary)] leading-none">{polishCount}</p>
            <span className="text-xs text-[var(--text-tertiary)]">คัน</span>
          </div>
        </div>
      </div>

      {/* ── Charts Section Header ── */}
      <div className="flex items-center justify-between fade-up delay-4 mt-4 mb-2 px-1">
        <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-wide">ภาพรวมร้าน 📊</h3>
        <div className="flex bg-[var(--surface-2)] p-1 rounded-[10px] gap-1">
          {(['week','month'] as ChartMode[]).map(m => (
            <button
              key={m}
              onClick={() => setChartMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                chartMode === m
                  ? 'bg-white text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-tertiary)]'
              }`}
            >
              {m === 'week' ? '7 วัน' : '30 วัน'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 fade-up delay-4">
        {/* ── Income Area Chart ── */}
        <div className="card p-4">
          <h4 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">แนวโน้มรายได้ (บาท)</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  axisLine={false} tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }}
                  dy={8}
                />
                <Tooltip
                  formatter={(v: any) => [`฿${Number(v||0).toLocaleString()}`, 'รายได้']}
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '8px 14px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#grad)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Record List ── */}
      <div className="fade-up delay-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">รายการวันนี้</h3>
            <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
              {records.length}
            </span>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-xs text-[var(--accent)] font-semibold hover:text-[var(--accent-hover)] transition-colors py-1"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M11 6.5A4.5 4.5 0 1 1 6.5 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M6.5 2l1.5 1.5L6.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            รีเฟรช
          </button>
        </div>

        {records.length === 0 ? (
          <div className="card p-10 text-center border-dashed">
            <p className="text-3xl mb-3 opacity-20">🚗</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">ยังไม่มีงานวันนี้</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">กด + เพื่อเพิ่มรายการใหม่</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {records.map(r => <RecordCard key={r.id} record={r} />)}
          </div>
        )}
      </div>

      {/* ✅ UNPAID MODAL */}
      {isUnpaidModalOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm fade-in flex items-end sm:items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setIsUnpaidModalOpen(false)}
        >
          <div className="bg-white w-full max-w-lg rounded-[24px] slide-up overflow-hidden max-h-[85dvh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)] shrink-0">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">สมุดทวงหนี้ 📒</h2>
              <button 
                onClick={() => setIsUnpaidModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              <div className="card bg-[var(--red)] p-5 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 text-8xl opacity-10">🚨</div>
                <p className="text-white/80 text-sm font-semibold mb-1 relative z-10">ยอดค้างชำระทั้งหมด</p>
                <p className="text-4xl font-black text-white relative z-10">฿{totalUnpaidAmount.toLocaleString()}</p>
                <p className="text-white/70 text-xs mt-2 relative z-10">รวมทั้งหมด {unpaidRecords.length} คัน</p>
              </div>

              {unpaidRecords.length === 0 ? (
                <div className="card p-12 text-center border-dashed">
                  <p className="text-5xl mb-3">🎉</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">ไม่มีหนี้ค้างชำระ!</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">เก็บเงินครบทุกคันแล้ว</p>
                </div>
              ) : (
                Object.entries(unpaidRecords.reduce((acc, r) => {
                  const name = (r.customer_name || '').trim();
                  if (!acc[name]) acc[name] = [];
                  acc[name].push(r);
                  return acc;
                }, {} as { [key: string]: Record[] })).map(([customerName, items]) => {
                  const customerTotal = items.reduce((s, r) => s + r.price, 0)
                  const displayName = customerName || 'ลูกค้าทั่วไป (ไม่ระบุชื่อ)'

                  return (
                    <div key={customerName} className="card p-4 border-2 border-[var(--red-light)]">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-[var(--red)]">{displayName}</h3>
                          <p className="text-xs font-semibold text-[var(--text-tertiary)] mt-0.5">ค้างชำระ {items.length} คัน</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-[var(--red)]">฿{customerTotal.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="bg-[var(--surface-2)] rounded-[var(--radius-md)] p-3 mb-3 space-y-2">
                        {items.map((item, idx) => (
                          <div key={item.id} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--text-tertiary)] text-xs">{idx + 1}.</span>
                              <span className="font-bold text-[var(--text-primary)]">{item.plate}</span>
                              <span className="text-[10px] text-[var(--text-tertiary)] hidden sm:inline">
                                ({new Date(item.created_at).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })})
                              </span>
                            </div>
                            <span className="font-semibold text-[var(--text-secondary)]">฿{item.price}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => markAllAsPaidByCustomer(customerName)}
                        className="w-full py-3 rounded-[var(--radius-md)] bg-[var(--green-light)] text-[var(--green)] font-bold text-sm border border-[var(--green)] hover:bg-[var(--green)] hover:text-white transition-colors flex justify-center items-center gap-2 active:scale-[0.98]"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        เคลียร์ยอดชำระแล้ว (จ่ายครบ)
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}