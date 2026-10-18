'use client'

import Link from 'next/link'
import { useEffect, useId, useMemo, useState } from 'react'
import { bangkokParts, formatBangkok, startOfBangkokDay } from '@/lib/time/bangkok'
import { toUserMessage } from '@/lib/errors'
import { buttonClassName, Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { SkeletonGroup, SkeletonRow } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/patterns/EmptyState'
import { IncomeRow } from '@/features/records/components/RecordRow'
import { EditRecordDialog } from '@/features/records/components/EditRecordDialog'
import { useEditParam } from '@/features/records/useEditParam'
import { takeLastSaved } from '@/features/records/hooks'
import { useDashboardData } from '../hooks'
import { greeting, newestFirst, toCustomerBreakdown, toDebtSummary, toStats } from '../logic'
import { ChartCard } from './ChartCard'
import { CardHeader, CustomerBreakdownCard, DebtSummaryCard, MoneyHero } from './cards'
import { RainAlert, WeatherDetail, WeatherStrip, useDashboardWeather, useWeatherDetail } from './Weather'

// screen-specifications.md §2 — "/" ภาพรวมวันนี้

const FIRST_ROWS = 10
const HIGHLIGHT_MS = 2000

const messageOf = <T,>(r: { ok: true; data: T } | { ok: false; error: Parameters<typeof toUserMessage>[0] } | undefined) =>
  r && !r.ok ? toUserMessage(r.error) : undefined

export function DashboardScreen({ email }: { email: string }) {
  const { day, data, loading, refreshing, loadedAt, refresh } = useDashboardData()
  const { weather, refetch: refetchWeather, isRefetching: weatherRefreshing } = useDashboardWeather()
  const weatherDetail = useWeatherDetail()
  const [showAll, setShowAll] = useState(false)
  const [highlight, setHighlight] = useState<string | null>(null)
  const listId = useId()

  // ── Derived ──
  const stats = data?.today.ok ? toStats(data.today.data) : null
  const records = useMemo(() => (data?.todayRecords.ok ? newestFirst(data.todayRecords.data) : []), [data])
  const debt = data?.unpaidRecords.ok ? toDebtSummary(data.unpaidRecords.data) : null
  const customers = data?.customers.ok ? toCustomerBreakdown(data.customers.data) : null
  const series = data?.series.ok ? data.series.data : null
  const visible = showAll ? records : records.slice(0, FIRST_ROWS)

  // ── Highlight the record just saved on /add, once ──
  useEffect(() => {
    if (!data?.todayRecords.ok) return
    const id = takeLastSaved()
    if (!id) return
    // Set from a value outside React (sessionStorage) when the list first arrives
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlight(id)
    const timer = setTimeout(() => setHighlight(null), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [data])

  // ── Edit dialog in the URL (?edit=income:<id>) so the back button closes it ──
  const edit = useEditParam({ income: records, ready: !loading })

  const dateLine = formatBangkok(startOfBangkokDay(day), { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
  const updatedAt = loadedAt ? formatBangkok(loadedAt, { hour: '2-digit', minute: '2-digit', hour12: false }) : null

  return (
    <div className="grid grid-cols-1 gap-4 pb-4">
      <header className="flex flex-wrap items-end justify-between gap-3 pt-6">
        <div className="min-w-0">
          <p className="text-caption text-text-secondary">{dateLine}</p>
          <h1 className="text-title text-text">ภาพรวมวันนี้</h1>
          {email && (
            <p className="hidden text-caption text-text-tertiary lg:block">
              {greeting(bangkokParts(new Date()).hour)}, {email.split('@')[0]}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <WeatherStrip weather={weather} onOpen={weatherDetail.show} />
          <Button
            variant="secondary"
            onClick={() => {
              refresh()
              refetchWeather()
            }}
            aria-label={refreshing ? 'กำลังอัปเดต' : `อัปเดตข้อมูล${updatedAt ? ` (ล่าสุด ${updatedAt} น.)` : ''}`}
            leadingIcon="refresh"
            isLoading={refreshing}
            loadingText="กำลังอัปเดต…"
            size="sm"
          >
            {updatedAt ? `อัปเดต ${updatedAt}` : 'อัปเดต'}
          </Button>
        </div>
      </header>

      <RainAlert weather={weather} />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 lg:row-start-1">
          <MoneyHero stats={stats} error={messageOf(data?.today)} onRetry={refresh} />
        </div>

        <div className="empty:hidden lg:col-span-5 lg:col-start-8 lg:row-start-1">
          {debt && <DebtSummaryCard debt={debt} />}
          {data && !data.unpaidRecords.ok && (
            <Card tone="warning">
              <ErrorState title="โหลดยอดค้างชำระไม่สำเร็จ" message={messageOf(data.unpaidRecords)} onRetry={refresh} />
            </Card>
          )}
        </div>

        <Card as="section" aria-labelledby={listId} className="lg:col-span-7 lg:row-span-2 lg:row-start-2">
          <CardHeader id={listId} title={`รายการวันนี้${records.length ? ` (${records.length})` : ''}`}>
            <Link href="/add" className={buttonClassName({ variant: 'ghost' })}>
              <Icon name="plus" />
              บันทึก
            </Link>
          </CardHeader>
          {loading ? (
            <SkeletonGroup>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </SkeletonGroup>
          ) : !data!.todayRecords.ok ? (
            <ErrorState message={messageOf(data!.todayRecords)} onRetry={refresh} />
          ) : records.length === 0 ? (
            <EmptyState
              icon="car"
              title="ยังไม่มีงานวันนี้"
              action={
                <Link href="/add" className={buttonClassName({})}>
                  <Icon name="plus" />
                  บันทึกรายการแรก
                </Link>
              }
            />
          ) : (
            <>
              <ul className="-mx-2 grid grid-cols-1 divide-y divide-border">
                {visible.map((r) => (
                  <li key={r.id}>
                    <IncomeRow record={r} highlight={!!highlight && r.client_request_id === highlight} onOpen={(row) => edit.open('income', row.id)} />
                  </li>
                ))}
              </ul>
              {records.length > FIRST_ROWS && (
                <Button variant="ghost" fullWidth onClick={() => setShowAll((v) => !v)} aria-expanded={showAll} className="mt-2">
                  {showAll ? 'แสดงน้อยลง' : `ดูทั้งหมด (${records.length})`}
                </Button>
              )}
            </>
          )}
        </Card>

        <div className="lg:col-span-5 lg:col-start-8 lg:row-start-2">
          <ChartCard series={series} today={day} error={messageOf(data?.series)} onRetry={refresh} />
        </div>

        <div className="lg:col-span-5 lg:col-start-8 lg:row-start-3">
          <CustomerBreakdownCard items={customers} error={messageOf(data?.customers)} onRetry={refresh} />
        </div>
      </div>

      <EditRecordDialog target={edit.target} onClose={edit.close} onChanged={refresh} />
      <WeatherDetail
        open={weatherDetail.open}
        onClose={weatherDetail.hide}
        weather={weather}
        onRefresh={refetchWeather}
        refreshing={weatherRefreshing}
      />
    </div>
  )
}
