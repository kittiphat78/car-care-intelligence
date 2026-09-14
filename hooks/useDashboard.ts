import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Record as AppRecord, Expense } from '@/types'
import { useToast } from '@/hooks/useToast'
import { getStartOfDay, getStartOfYesterday, getDaysAgo, getYearsAgo, getStartOfWeek, getStartOfMonth, getStartOfYear, parseDateMs } from '@/lib/dateUtils'

export type ChartMode = 'week' | 'month'
export interface CustomerTimePeriod {
  washCount: number
  washAmount: number
  polishCount: number
  polishAmount: number
  total: number
}

export interface CustomerBreakdownItem {
  customerName: string
  week: CustomerTimePeriod
  month: CustomerTimePeriod
  year: CustomerTimePeriod
}

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
  const { error: toastError, success: toastSuccess } = useToast()
  
  // ── States ──
  const [userEmail, setUserEmail]               = useState('')
  const [allRecords, setAllRecords]             = useState<AppRecord[]>([])
  const [expenses, setExpenses]                 = useState<Expense[]>([])
  const [chartMode, setChartMode]               = useState<ChartMode>('week')
  const [loading, setLoading]                   = useState(true)
  const [unpaidRecords, setUnpaidRecords]       = useState<AppRecord[]>([])
  const [yearRecords, setYearRecords]           = useState<AppRecord[]>([])

  // ── Data Fetching ──
  const fetchData = useCallback(async (skipAuth = false) => {
    try {
      setLoading(true)
      
      if (!skipAuth) {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) { 
          if (authError) console.error('[Dashboard] Auth Error:', authError)
          router.push('/login')
          return 
        }
        setUserEmail(user.email ?? '')
      }

      const thirtyDaysAgoIso = getDaysAgo(30).toISOString()
      const oneYearAgoIso = getYearsAgo(1).toISOString()
   
      const [allRes, expenseRes, unpaidRes, yearRes] = await Promise.all([
        supabase.from('records').select('*').gte('created_at', thirtyDaysAgoIso).order('created_at', { ascending: true }),
        supabase.from('expenses').select('*').gte('created_at', thirtyDaysAgoIso),
        supabase.from('records').select('*').eq('payment_status', 'unpaid').order('created_at', { ascending: true }),
        supabase.from('records').select('id,created_at,type,price,customer_name').gte('created_at', oneYearAgoIso).order('created_at', { ascending: true })
      ])
   
      const dbErrors = [allRes.error, expenseRes.error, unpaidRes.error, yearRes.error].filter(Boolean)
      if (dbErrors.length > 0) {
        console.error('[Dashboard] DB Fetch Error:', dbErrors)
        toastError('ไม่สามารถดึงข้อมูลได้ครบถ้วน อาจมีปัญหากับเซิร์ฟเวอร์หรืออินเทอร์เน็ต')
      }

      setAllRecords(allRes.data ?? [])
      setExpenses(expenseRes.data ?? [])
      setUnpaidRecords(unpaidRes.data ?? [])
      setYearRecords((yearRes.data ?? []) as AppRecord[])
    } catch (err) {
      console.error('[Dashboard] Unexpected Error during fetchData:', err)
      toastError('เกิดข้อผิดพลาดเครือข่าย หรือเซิร์ฟเวอร์ไม่ตอบสนอง')
    } finally {
      setLoading(false)
    }
  }, [router, toastError])
 
  // ── Real-time Subscriptions (debounced) ──
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
    try {
      const { error } = await supabase.auth.signOut()
      if (error) console.error('[Dashboard] Logout Error:', error)
    } catch (err) {
      console.error('[Dashboard] Unexpected Logout Error:', err)
    } finally {
      router.push('/login')
    }
  }, [router])

  const markAllAsPaidByCustomer = useCallback(async (customerName: string) => {
    const isGeneral = customerName === 'ลูกค้าทั่วไป (ไม่ระบุชื่อ)'
    const confirmMsg = isGeneral
      ? `ยืนยันว่า "ลูกค้าทั่วไป (ไม่ระบุชื่อ)" ชำระเงินครบแล้วทั้งหมด?`
      : `ยืนยันว่าเต็นท์/ลูกค้า "${customerName}" ชำระเงินครบแล้วทั้งหมด?`
    
    if (!window.confirm(confirmMsg)) return

    const targetName = isGeneral ? '' : customerName
    const now = new Date().toISOString()
    
    try {
      // Optimistic update
      setUnpaidRecords(prev => prev.filter(r => {
        const name = (r.customer_name || '').trim() || 'ลูกค้าทั่วไป (ไม่ระบุชื่อ)'
        return name !== (isGeneral ? 'ลูกค้าทั่วไป (ไม่ระบุชื่อ)' : customerName)
      }))

      const { error } = await supabase
        .from('records')
        .update({ payment_status: 'paid', updated_at: now, updated_by_email: userEmail })
        .eq('payment_status', 'unpaid')
        .eq('customer_name', targetName)

      if (!error) {
        fetchData()
        toastSuccess('ทำเครื่องหมายชำระเงินเรียบร้อย')
      } else {
        fetchData() // Rollback
        console.error('[Dashboard] markAllAsPaidByCustomer DB Error:', error)
        toastError('บันทึกข้อมูลไม่สำเร็จ: ' + error.message)
      }
    } catch (err) {
      fetchData() // Rollback
      console.error('[Dashboard] markAllAsPaidByCustomer Unexpected Error:', err)
      toastError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    }
  }, [userEmail, fetchData, toastSuccess, toastError])

  // ── Derived State & Computations (Memoized) ──

  // 1. สถิติภาพรวม
  const stats = useMemo<DashboardStats>(() => {
    const todayStartMs = getStartOfDay().getTime()
    const yesterdayStartMs = getStartOfYesterday().getTime()

    const todayRecords = []
    let yesterdayIncome = 0

    for (let i = allRecords.length - 1; i >= 0; i--) {
      const r = allRecords[i]
      const t = parseDateMs(r.created_at)
      if (t >= todayStartMs) {
        todayRecords.push(r)
      } else if (t >= yesterdayStartMs) {
        yesterdayIncome += r.price
      } else {
        break
      }
    }

    let todayTotalIncome = 0
    let todayPaid = 0
    let todayUnpaid = 0
    let washCount = 0
    let polishCount = 0

    for (const r of todayRecords) {
      todayTotalIncome += r.price
      if (r.payment_status === 'paid') todayPaid += r.price
      if (r.payment_status === 'unpaid') todayUnpaid += r.price
      if (r.type === 'wash') washCount++
      if (r.type === 'polish') polishCount++
    }

    const todayExpense = expenses
      .filter(e => parseDateMs(e.created_at) >= todayStartMs)
      .reduce((s, e) => s + e.amount, 0)
      
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
  }, [allRecords, expenses])

  // Today's records (derived from allRecords)
  const records = useMemo<AppRecord[]>(() => {
    const todayStartMs = getStartOfDay().getTime()
    return allRecords.filter(r => parseDateMs(r.created_at) >= todayStartMs)
  }, [allRecords])

  // 2. ข้อมูลกราฟ (bucket map — O(n))
  const chartData = useMemo(() => {
    const days = chartMode === 'week' ? 7 : 30
    
    const now = new Date()
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + 1)
    endDate.setHours(0, 0, 0, 0)
    
    const startDate = getDaysAgo(days - 1)
    const startMs = startDate.getTime()
    const endMs = endDate.getTime()
    const dayMs = 24 * 60 * 60 * 1000

    const buckets = Array.from({ length: days }, () => ({ income: 0, expense: 0 }))

    for (const r of allRecords) {
      const t = parseDateMs(r.created_at)
      if (t >= startMs && t < endMs) {
        const idx = Math.floor((t - startMs) / dayMs)
        if (idx >= 0 && idx < days) buckets[idx].income += r.price
      }
    }
    for (const e of expenses) {
      const t = parseDateMs(e.created_at)
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
    const grouped = unpaidRecords.reduce((acc, r) => {
      const name = (r.customer_name || '').trim() || 'ลูกค้าทั่วไป (ไม่ระบุชื่อ)'
      if (!acc[name]) acc[name] = []
      acc[name].push(r)
      return acc
    }, {} as globalThis.Record<string, AppRecord[]>) 

    return Object.entries(grouped)
      .map(([name, items]) => ({
        customerName: name,
        items: items.sort((a, b) => parseDateMs(a.created_at) - parseDateMs(b.created_at)),
        total: items.reduce((s, r) => s + r.price, 0)
      }))
      .sort((a, b) => b.total - a.total)
  }, [unpaidRecords])

  // 4. ยอดหนี้รวมทั้งหมด
  const totalUnpaidAmount = useMemo(
    () => unpaidRecords.reduce((s, r) => s + r.price, 0), 
    [unpaidRecords]
  )

  // 5. รายรับตามลูกค้า แยก wash/polish — คำนวณ 3 ช่วงเวลาในรอบเดียว
  const customerBreakdown = useMemo<CustomerBreakdownItem[]>(() => {
    const weekMs = getStartOfWeek().getTime()
    const monthMs = getStartOfMonth().getTime()
    const yearMs = getStartOfYear().getTime()

    const emptyPeriod = (): CustomerTimePeriod => ({ washCount: 0, washAmount: 0, polishCount: 0, polishAmount: 0, total: 0 })

    const grouped: globalThis.Record<string, { week: CustomerTimePeriod; month: CustomerTimePeriod; year: CustomerTimePeriod }> = {}

    for (const r of yearRecords) {
      const name = (r.customer_name || '').trim() || 'ลูกค้าทั่วไป'
      const t = parseDateMs(r.created_at)
      if (t < yearMs) continue

      if (!grouped[name]) grouped[name] = { week: emptyPeriod(), month: emptyPeriod(), year: emptyPeriod() }
      const g = grouped[name]

      const periods: CustomerTimePeriod[] = [g.year]
      if (t >= monthMs) periods.push(g.month)
      if (t >= weekMs) periods.push(g.week)

      for (const p of periods) {
        if (r.type === 'wash') {
          p.washCount++
          p.washAmount += r.price
        } else {
          p.polishCount++
          p.polishAmount += r.price
        }
        p.total += r.price
      }
    }

    return Object.entries(grouped)
      .map(([customerName, v]) => ({ customerName, ...v }))
      .sort((a, b) => b.month.total - a.month.total)
  }, [yearRecords])

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
    customerBreakdown,
    refresh: fetchData,
    logout,
    markAllAsPaidByCustomer
  }
}