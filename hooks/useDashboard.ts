import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Record as AppRecord, Expense } from '@/types' // ✅ alias `AppRecord` เพื่อไม่ให้ซ้ำกับ TypeScript `Record<K,T>`

export type ChartMode = 'week' | 'month'

export interface DashboardStats {
  todayTotalIncome: number
  todayPaid: number
  todayUnpaid: number
  todayExpense: number
  netProfit: number
  washCount: number
  polishCount: number
  diffAmount: number
  diffPct: number
  isUp: boolean
}

export function useDashboard() {
  const router = useRouter()
  
  // ── States ──
  const [userEmail, setUserEmail]               = useState('')
  const [records, setRecords]                   = useState<AppRecord[]>([])
  const [allRecords, setAllRecords]             = useState<AppRecord[]>([])
  const [expenses, setExpenses]                 = useState<Expense[]>([])
  const [yesterdayRecords, setYesterdayRecords] = useState<AppRecord[]>([])
  const [chartMode, setChartMode]               = useState<ChartMode>('week')
  const [loading, setLoading]                   = useState(true)
  const [unpaidRecords, setUnpaidRecords]       = useState<AppRecord[]>([])

  // ── Data Fetching ──
  const fetchData = useCallback(async (skipAuth = false) => {
    setLoading(true)
    
    // 1. Auth check
    if (!skipAuth) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { 
        router.push('/login')
        return 
      }
      setUserEmail(user.email ?? '')
    }

    // 2. Date boundaries (ใช้ Local Time ให้เป๊ะ)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
 
    // แปลงเป็น ISO String ครั้งเดียว
    const todayIso = today.toISOString()
    const yesterdayIso = yesterday.toISOString()
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString()
 
    // 3. Parallel Fetching
    const [todayRes, yesterdayRes, allRes, expenseRes, unpaidRes] = await Promise.all([
      supabase.from('records').select('*').gte('created_at', todayIso).order('created_at', { ascending: false }),
      supabase.from('records').select('*').gte('created_at', yesterdayIso).lt('created_at', todayIso),
      supabase.from('records').select('*').gte('created_at', thirtyDaysAgoIso).order('created_at', { ascending: true }),
      supabase.from('expenses').select('*').gte('created_at', thirtyDaysAgoIso),
      supabase.from('records').select('*').eq('payment_status', 'unpaid').order('created_at', { ascending: true })
    ])
 
    // 4. State updates (Fallback to empty array to prevent crash)
    setRecords(todayRes.data ?? [])
    setYesterdayRecords(yesterdayRes.data ?? [])
    setAllRecords(allRes.data ?? [])
    setExpenses(expenseRes.data ?? [])
    setUnpaidRecords(unpaidRes.data ?? [])
    
    setLoading(false)
  }, [router])
 
  // ── Real-time Subscriptions (debounced เพื่อป้องกัน rapid-fire re-fetch) ──
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    fetchData()
    const debouncedFetch = () => {
      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current)
      realtimeTimerRef.current = setTimeout(() => fetchData(true), 300)
    }
    const channel = supabase.channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, debouncedFetch)
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current)
    }
  }, [fetchData])

  // ── Actions ──
  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  const markAllAsPaidByCustomer = useCallback(async (customerName: string) => {
    const isGeneral = customerName === 'ลูกค้าทั่วไป (ไม่ระบุชื่อ)'
    const confirmMsg = isGeneral
      ? `ยืนยันว่า "ลูกค้าทั่วไป (ไม่ระบุชื่อ)" ชำระเงินครบแล้วทั้งหมด?`
      : `ยืนยันว่าเต็นท์/ลูกค้า "${customerName}" ชำระเงินครบแล้วทั้งหมด?`
    
    if (!window.confirm(confirmMsg)) return

    const targetName = isGeneral ? '' : customerName
    const now = new Date().toISOString()
    
    const { error } = await supabase
      .from('records')
      .update({ payment_status: 'paid', updated_at: now, updated_by_email: userEmail })
      .eq('payment_status', 'unpaid')
      .eq('customer_name', targetName)

    if (!error) {
      fetchData()
    } else {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }, [userEmail, fetchData])

  // ── Derived State & Computations (Memoized) ──

  // 1. สถิติภาพรวม (คำนวณใหม่เมื่อข้อมูลเปลี่ยนเท่านั้น)
  const stats = useMemo<DashboardStats>(() => {
    const todayStartLocal = new Date()
    todayStartLocal.setHours(0, 0, 0, 0)
    const todayStartMs = todayStartLocal.getTime()

    // ใช้ reduce รอบเดียวเพื่อหาค่าหลายๆ อย่างได้ (ถ้าข้อมูลเยอะๆ จะช่วยได้)
    let todayTotalIncome = 0
    let todayPaid = 0
    let todayUnpaid = 0
    let washCount = 0
    let polishCount = 0

    records.forEach(r => {
      todayTotalIncome += r.price
      if (r.payment_status === 'paid') todayPaid += r.price
      if (r.payment_status === 'unpaid') todayUnpaid += r.price
      if (r.type === 'wash') washCount++
      if (r.type === 'polish') polishCount++
    })

    // คำนวณรายจ่ายเฉพาะของวันนี้
    const todayExpense = expenses
      .filter(e => new Date(e.created_at).getTime() >= todayStartMs)
      .reduce((s, e) => s + e.amount, 0)
      
    const yesterdayIncome = yesterdayRecords.reduce((s, r) => s + r.price, 0)
    const diffAmount = todayTotalIncome - yesterdayIncome

    return {
      todayTotalIncome,
      todayPaid,
      todayUnpaid,
      todayExpense,
      netProfit: todayPaid - todayExpense,
      washCount,
      polishCount,
      diffAmount,
      diffPct: yesterdayIncome > 0 ? Math.round((diffAmount / yesterdayIncome) * 100) : 0,
      isUp: diffAmount >= 0
    }
  }, [records, expenses, yesterdayRecords])

  // 2. ข้อมูลกราฟ (ใช้ bucket map เพื่อ O(n) แทน O(days × records))
  const chartData = useMemo(() => {
    const now = new Date()
    const days = chartMode === 'week' ? 7 : 30
    
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + 1)
    endDate.setHours(0,0,0,0)
    
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - (days - 1))
    startDate.setHours(0,0,0,0)

    const startMs = startDate.getTime()
    const endMs = endDate.getTime()
    const dayMs = 24 * 60 * 60 * 1000

    // Bucket map: index → { income, expense }
    const buckets = Array.from({ length: days }, () => ({ income: 0, expense: 0 }))

    // O(n) — วนรอบเดียว, หาว่าตกอยู่ใน bucket ไหน
    for (const r of allRecords) {
      const t = new Date(r.created_at).getTime()
      if (t >= startMs && t < endMs) {
        const idx = Math.floor((t - startMs) / dayMs)
        if (idx >= 0 && idx < days) buckets[idx].income += r.price
      }
    }
    for (const e of expenses) {
      const t = new Date(e.created_at).getTime()
      if (t >= startMs && t < endMs) {
        const idx = Math.floor((t - startMs) / dayMs)
        if (idx >= 0 && idx < days) buckets[idx].expense += e.amount
      }
    }

    return buckets.map((b, i) => {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      return {
        label: chartMode === 'week' 
          ? d.toLocaleDateString('th-TH', { weekday: 'short' }) 
          : d.toLocaleDateString('th-TH', { day: 'numeric' }),
        income: b.income,
        expense: b.expense,
      }
    })
  }, [allRecords, expenses, chartMode])

  // 3. จัดกลุ่มสมุดทวงหนี้ตามลูกค้า
  const groupedUnpaid = useMemo(() => {
    // ✅ ใช้ TypeScript Record utility อย่างถูกต้อง ไม่ตีกับ type Record ของแอปเรา
    const grouped = unpaidRecords.reduce((acc, r) => {
      const name = (r.customer_name || '').trim() || 'ลูกค้าทั่วไป (ไม่ระบุชื่อ)'
      if (!acc[name]) acc[name] = []
      acc[name].push(r)
      return acc
    }, {} as globalThis.Record<string, AppRecord[]>) 

    return Object.entries(grouped)
      .map(([name, items]) => ({
        customerName: name,
        // เรียงจากค้างนานสุด → ใหม่สุด ภายในแต่ละลูกค้า
        items: items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        total: items.reduce((s, r) => s + r.price, 0)
      }))
      // Sort ให้ลูกค้าที่ค้างเยอะสุดอยู่บนสุด (Optional UX Upgrade)
      .sort((a, b) => b.total - a.total)
  }, [unpaidRecords])

  // 4. ยอดหนี้รวมทั้งหมด
  const totalUnpaidAmount = useMemo(
    () => unpaidRecords.reduce((s, r) => s + r.price, 0), 
    [unpaidRecords]
  )

  return {
    userEmail,
    loading,
    records,
    stats,
    chartData,
    groupedUnpaid,
    totalUnpaidAmount,
    chartMode,
    setChartMode,
    refresh: fetchData,
    logout,
    markAllAsPaidByCustomer
  }
}