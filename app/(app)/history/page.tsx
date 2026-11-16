import type { Metadata } from 'next'
import { Suspense } from 'react'
import { fromServer } from '@/lib/server-data'
import { loadPeriod } from '@/features/history/api'
import { parseFilters } from '@/features/history/logic'
import { HistoryScreen } from '@/features/history/components/HistoryScreen'

export const metadata: Metadata = { title: 'ประวัติ · คาร์แคร์' }

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // The month the page opens on comes with it (3e, ADR-31); the rest of the year, and a
  // whole year (?m=0), still load in the browser. The screen loads it itself if this fails.
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) if (typeof value === 'string') params.set(key, value)
  const { year, month } = parseFilters(params)
  const initial = month === 0 ? null : await fromServer(async (client) => ({ year, month, ...(await loadPeriod(year, month, client)) }))
  return (
    <Suspense fallback={null}>
      <HistoryScreen initial={initial} />
    </Suspense>
  )
}
