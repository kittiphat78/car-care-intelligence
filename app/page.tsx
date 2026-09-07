'use client'

import { useState, useCallback } from 'react'
import { useWeather } from '@/hooks/useWeather'
import { useDashboard } from '@/hooks/useDashboard'

// Extracted Dashboard Components
import { LoadingSkeleton } from '@/components/dashboard/LoadingSkeleton'
import { Header } from '@/components/dashboard/Header'
import { WeatherWidget } from '@/components/dashboard/WeatherWidget'
import { UnpaidAlert } from '@/components/dashboard/UnpaidAlert'
import { NetProfitHero } from '@/components/dashboard/NetProfitHero'
import { StatsRow } from '@/components/dashboard/StatsRow'
import { ChartsSection } from '@/components/dashboard/ChartsSection'
import { CustomerBreakdownSection } from '@/components/dashboard/CustomerBreakdownSection'
import { RecordListSection } from '@/components/dashboard/RecordListSection'
import { UnpaidModal } from '@/components/dashboard/UnpaidModal'

export default function Dashboard() {
  const { data: weather, refetch: refreshWeather, isRefetching: isRefreshingWeather } = useWeather()
  const dash = useDashboard()
  const [isUnpaidModalOpen, setIsUnpaidModalOpen] = useState(false)

  const openUnpaid = useCallback(() => setIsUnpaidModalOpen(true), [])
  const closeUnpaid = useCallback(() => setIsUnpaidModalOpen(false), [])

  if (dash.loading) return <LoadingSkeleton />

  return (
    <div className="min-h-dvh px-4 pt-6 space-y-5">
      <Header userEmail={dash.userEmail} onLogout={dash.logout} />
      {weather && <WeatherWidget weather={weather} onRefresh={refreshWeather} isRefreshing={isRefreshingWeather} />}
      {dash.totalUnpaidAmount > 0 && <UnpaidAlert totalAmount={dash.totalUnpaidAmount} onClick={openUnpaid} />}
      <NetProfitHero stats={dash.stats} />
      <StatsRow stats={dash.stats} />
      <ChartsSection dash={dash} />
      <CustomerBreakdownSection data={dash.customerBreakdown} />
      <RecordListSection dash={dash} />

      {isUnpaidModalOpen && (
        <UnpaidModal
          unpaidData={dash.groupedUnpaid}
          totalAmount={dash.totalUnpaidAmount}
          onClose={closeUnpaid}
          onMarkPaid={dash.markAllAsPaidByCustomer}
        />
      )}
    </div>
  )
}