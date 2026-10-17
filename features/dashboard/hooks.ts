'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { reportAppError } from '@/lib/observability'
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

export function useDashboardData(): DashboardState {
  const [day, setDay] = useState(bangkokToday)
  const [data, setData] = useState<DashboardData | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const latest = useRef(0)

  const load = useCallback(async () => {
    const call = ++latest.current
    setRefreshing(true)
    const today = bangkokToday()
    const result = await loadDashboard(today)
    // An older, slower reload must not overwrite a newer one
    if (call !== latest.current) return
    for (const part of Object.values(result)) if (!part.ok) reportAppError(part.error)
    setDay(today)
    setData(result)
    setLoadedAt(new Date())
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
