import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Record as AppRecord, DEFAULT_CUSTOMER_NAME_UNPAID } from '@/types'
import { useToast } from '@/hooks/useToast'
import { parseDateMs } from '@/lib/dateUtils'
import { loadDashboard, markCustomerPaid } from '@/features/dashboard/api'
import {
  EMPTY_TODAY, toChartData, toCustomerBreakdown, toStats,
  type ChartMode, type CustomerTotals, type DayTotal, type TodayTotals,
} from '@/features/dashboard/logic'
import { toUserMessage } from '@/lib/errors'
import { reportAppError } from '@/lib/observability'
import { bangkokToday } from '@/lib/time/bangkok'

export type { ChartMode, CustomerTimePeriod, CustomerBreakdownItem, DashboardStats } from '@/features/dashboard/logic'

export function useDashboard() {
  const router = useRouter()
  const { error: toastError, success: toastSuccess } = useToast()
  
  // ── States ──
  const [userEmail, setUserEmail]               = useState('')
  const [todayRecords, setTodayRecords]         = useState<AppRecord[]>([])
  const [todayTotals, setTodayTotals]           = useState<TodayTotals>(EMPTY_TODAY)
  const [series, setSeries]                     = useState<DayTotal[]>([])
  const [customers, setCustomers]               = useState<CustomerTotals[]>([])
  const [chartMode, setChartMode]               = useState<ChartMode>('week')
  const [loading, setLoading]                   = useState(true)
  const [unpaidRecords, setUnpaidRecords]       = useState<AppRecord[]>([])
  const [today, setToday]                       = useState(bangkokToday)

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

      // ยอดรวมคำนวณในฐานข้อมูล (M006) แทนการโหลดข้อมูลทั้งปีมารวมใน browser
      const day = bangkokToday()
      const data = await loadDashboard(day)

      const failure = [data.todayRecords, data.today, data.series, data.customers, data.unpaidRecords].find(r => !r.ok)
      if (failure && !failure.ok) {
        console.error('[Dashboard] DB Fetch Error:', failure.error)
        reportAppError(failure.error)
        toastError(`ไม่สามารถดึงข้อมูลได้ครบถ้วน: ${toUserMessage(failure.error)}`)
      }

      setToday(day)
      setTodayRecords(data.todayRecords.ok ? data.todayRecords.data : [])
      setTodayTotals(data.today.ok ? data.today.data : EMPTY_TODAY)
      setSeries(data.series.ok ? data.series.data : [])
      setCustomers(data.customers.ok ? data.customers.data : [])
      setUnpaidRecords(data.unpaidRecords.ok ? data.unpaidRecords.data : [])
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
    const isGeneral = customerName === DEFAULT_CUSTOMER_NAME_UNPAID
    const confirmMsg = isGeneral
      ? `ยืนยันว่า "${DEFAULT_CUSTOMER_NAME_UNPAID}" ชำระเงินครบแล้วทั้งหมด?`
      : `ยืนยันว่าเต็นท์/ลูกค้า "${customerName}" ชำระเงินครบแล้วทั้งหมด?`
    
    if (!window.confirm(confirmMsg)) return

    const targetName = isGeneral ? '' : customerName

    try {
      // Optimistic update
      setUnpaidRecords(prev => prev.filter(r => {
        const name = (r.customer_name || '').trim() || DEFAULT_CUSTOMER_NAME_UNPAID
        return name !== (isGeneral ? DEFAULT_CUSTOMER_NAME_UNPAID : customerName)
      }))

      const result = await markCustomerPaid(targetName, userEmail)

      if (result.ok) {
        fetchData()
        toastSuccess('ทำเครื่องหมายชำระเงินเรียบร้อย')
      } else {
        fetchData() // Rollback
        console.error('[Dashboard] markAllAsPaidByCustomer DB Error:', result.error)
        reportAppError(result.error)
        toastError('บันทึกข้อมูลไม่สำเร็จ: ' + toUserMessage(result.error))
      }
    } catch (err) {
      fetchData() // Rollback
      console.error('[Dashboard] markAllAsPaidByCustomer Unexpected Error:', err)
      toastError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    }
  }, [userEmail, fetchData, toastSuccess, toastError])

  // ── Derived State & Computations (Memoized) ──

  // 1. สถิติภาพรวม
  const stats = useMemo(() => toStats(todayTotals), [todayTotals])

  // Today's records
  const records = todayRecords

  // 2. ข้อมูลกราฟ 7 หรือ 30 วัน
  const chartData = useMemo(() => toChartData(series, chartMode, today), [series, chartMode, today])

  // 3. จัดกลุ่มสมุดทวงหนี้ตามลูกค้า
  const groupedUnpaid = useMemo(() => {
    const grouped = unpaidRecords.reduce((acc, r) => {
      const name = (r.customer_name || '').trim() || DEFAULT_CUSTOMER_NAME_UNPAID
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

  // 5. รายรับตามลูกค้า แยก wash/polish (สัปดาห์ / เดือน / ปี)
  const customerBreakdown = useMemo(() => toCustomerBreakdown(customers), [customers])

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