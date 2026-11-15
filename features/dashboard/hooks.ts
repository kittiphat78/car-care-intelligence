'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { reportAppError } from '@/lib/observability'
import { DASHBOARD_KEY, load as loadShared, peek } from '@/lib/data-store'
import { bangkokToday } from '@/lib/time/bangkok'
import { loadUnpaidShared } from '@/features/debts/shared'
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
  /** When the figures on screen were asked for (performance.now()), for rows still on their way (ADR-30) */
  startedAt: number
  refresh: () => void
}

interface KeptDashboard {
  day: string
  data: DashboardData
  loadedAt: Date
  startedAt: number
}

/** What the dashboard showed last in this tab, if it is still for today */
function keptForToday(): KeptDashboard | null {
  const kept = peek<KeptDashboard>(DASHBOARD_KEY)
  return kept && kept.day === bangkokToday() ? kept : null
}

/**
 * Today's dashboard through the shared store: joins a load already running (one started
 * right after a save, on the way here) unless `fresh`. The unpaid list is kept on its own
 * key, so /debts shows it at once.
 */
export function loadTodayDashboard({ fresh = false } = {}): Promise<KeptDashboard> {
  return loadShared(
    DASHBOARD_KEY,
    async () => {
      const day = bangkokToday()
      const startedAt = performance.now()
      const data = await loadDashboard(day, () => loadUnpaidShared({ fresh }))
      return { day, data, loadedAt: new Date(), startedAt }
    },
    { fresh },
  )
}

export function useDashboardData(): DashboardState {
  // Back on the dashboard: the last figures at once, a fresh copy right after (the ⟳ spins)
  const [kept] = useState(keptForToday)
  const [day, setDay] = useState(() => kept?.day ?? bangkokToday())
  const [data, setData] = useState<DashboardData | null>(kept?.data ?? null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(kept?.loadedAt ?? null)
  const [startedAt, setStartedAt] = useState(kept?.startedAt ?? 0)
  const latest = useRef(0)

  const load = useCallback(async (fresh: boolean) => {
    const call = ++latest.current
    setRefreshing(true)
    const result = await loadTodayDashboard({ fresh })
    // An older, slower reload must not overwrite a newer one
    if (call !== latest.current) return
    for (const part of Object.values(result.data)) if (!part.ok) reportAppError(part.error)
    setDay(result.day)
    setData(result.data)
    setLoadedAt(result.loadedAt)
    setStartedAt(result.startedAt)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    // Initial load: data arrives asynchronously, outside this effect's render
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(false)
    let timer: ReturnType<typeof setTimeout> | undefined
    const soon = () => {
      clearTimeout(timer)
      timer = setTimeout(() => void load(true), 300)
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

  const refresh = useCallback(() => void load(true), [load])
  return { day, data, loading: data === null, refreshing: refreshing && data !== null, loadedAt, startedAt, refresh }
}
