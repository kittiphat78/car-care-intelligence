'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { reportAppError } from '@/lib/observability'
import { keepScreen, keptScreen } from '@/lib/screen-memory'
import { bangkokToday } from '@/lib/time/bangkok'
import { loadDashboard, type DashboardData } from './api'

// Data of the dashboard. Each part keeps its own Result so one failure shows an error
// in that card only (screen-specifications.md §2.2). Realtime changes reload quietly.

export interface DashboardState {
  day: string
  data: DashboardData | null
  /** First load still running */
  loading: boolean
  /** A reload after the first one (the ⟳ button spins) */
  refreshing: boolean
  loadedAt: Date | null
  refresh: () => void
}

interface KeptDashboard {
  day: string
  data: DashboardData
  loadedAt: Date
}

/** What the dashboard showed last in this tab, if it is still for today */
function keptForToday(): KeptDashboard | null {
  const kept = keptScreen<KeptDashboard>('dashboard')
  return kept && kept.day === bangkokToday() ? kept : null
}

export function useDashboardData(): DashboardState {
  // Back on the dashboard: the last figures at once, a fresh copy right after (the ⟳ spins)
  const [kept] = useState(keptForToday)
  const [day, setDay] = useState(() => kept?.day ?? bangkokToday())
  const [data, setData] = useState<DashboardData | null>(kept?.data ?? null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(kept?.loadedAt ?? null)
  const latest = useRef(0)

  const load = useCallback(async () => {
    const call = ++latest.current
    setRefreshing(true)
    const today = bangkokToday()
    const result = await loadDashboard(today)
    // An older, slower reload must not overwrite a newer one
    if (call !== latest.current) return
    for (const part of Object.values(result)) if (!part.ok) reportAppError(part.error)
    const at = new Date()
    keepScreen<KeptDashboard>('dashboard', { day: today, data: result, loadedAt: at })
    setDay(today)
    setData(result)
    setLoadedAt(at)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    // Initial load: data arrives asynchronously, outside this effect's render
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
    let timer: ReturnType<typeof setTimeout> | undefined
    const soon = () => {
      clearTimeout(timer)
      timer = setTimeout(() => void load(), 300)
    }
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, soon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, soon)
      .subscribe()
    return () => {
      clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [load])

  return { day, data, loading: data === null, refreshing: refreshing && data !== null, loadedAt, refresh: load }
}
