'use client'

import { AppLink } from '@/components/ui/AppLink'
import { memo, useDeferredValue, useEffect, useId, useMemo, useState } from 'react'
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
import { customersThisMonth, greeting, newestFirst, periodTotals, toCustomerBreakdown, toDebtSummary, toStats } from '../logic'
import { ChartCard } from './ChartCard'
import { CardHeader, CustomerBreakdownCard, DebtSummaryCard, DebtSummarySkeleton, MoneyHero } from './cards'
import { PeriodCards, QuickLinks, StatusPills, TodaySplit } from './highlights'

// The parts below today's figures and list follow at low priority (useDeferredValue in the
// screen). memo() lets them skip the urgent render, so the list paints first: after saving a
// car, the new row is what people look for (saving took +66 ms on a slow phone otherwise, G-04)
const LateStatusPills = memo(StatusPills)
const LatePeriodCards = memo(PeriodCards)
const LateQuickLinks = memo(QuickLinks)
const LateTodaySplit = memo(TodaySplit)
const LateChartCard = memo(ChartCard)
const LateCustomerBreakdownCard = memo(CustomerBreakdownCard)
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
  const visible = showAll ? records : records.slice(0, FIRST_ROWS)

  // ── Derived, low priority: everything below today's figures and list ──
  // Glass home (ADR-28): figures from the same data, nothing extra is loaded.
  // null = still loading · undefined = that part failed (shown as —)
  const late = useDeferredValue(data)
  const lateParts = useMemo(() => {
    const lateStats = late?.today.ok ? toStats(late.today.data) : null
    const lateDebt = late?.unpaidRecords.ok ? toDebtSummary(late.unpaidRecords.data) : null
    const customerRows = late ? (late.customers.ok ? late.customers.data : undefined) : null
    const periods = customerRows ? periodTotals(customerRows) : customerRows
    return {
      stats: lateStats,
      customers: late?.customers.ok ? toCustomerBreakdown(late.customers.data) : null,
      series: late?.series.ok ? late.series.data : null,
      customersMonth: customerRows ? customersThisMonth(customerRows) : customerRows,
      debt: late ? (lateDebt ?? undefined) : null,
      today: lateStats ? { total: lateStats.todayTotalIncome, washCount: lateStats.washCount, polishCount: lateStats.polishCount } : late && !late.today.ok ? undefined : null,
      week: periods === undefined ? undefined : (periods?.week ?? null),
      month: periods === undefined ? undefined : (periods?.month ?? null),
      seriesError: messageOf(late?.series),
      customersError: messageOf(late?.customers),
    }
  }, [late])

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
          <h1 className="text-title text-text">
            ภาพรวม<span className="text-gradient">วันนี้</span>
          </h1>
          {email && (
            <p className="hidden text-caption text-text-tertiary lg:block">
              {greeting(bangkokParts(new Date()).hour)}, {email.split('@')[0]}
            </p>
          )}
        </div>
        {/* On phones the buttons always have their own line, kept to the right. Before,
            they shared the title's line until the weather and the update time arrived,
            then wrapped and pushed every card down (CLS 0.5, Step 09 O-08). They may wrap
            under each other only when they cannot fit (large text): before, the page grew
            sideways and the update button went off screen */}
        <div className="flex flex-wrap items-center gap-2 max-md:basis-full max-md:justify-end">
          <WeatherStrip weather={weather} onOpen={weatherDetail.show} />
          <Button
            variant="secondary"
            onClick={() => {
              refresh()
              refetchWeather()
            }}
            leadingIcon="refresh"
            isLoading={refreshing}
            loadingText="กำลังอัปเดต…"
            size="sm"
          >
            {updatedAt ? `อัปเดต ${updatedAt}` : 'อัปเดต'}
            <span className="sr-only">{updatedAt ? ' น. (โหลดข้อมูลใหม่)' : ' (โหลดข้อมูลใหม่)'}</span>
          </Button>
        </div>
      </header>

      <RainAlert weather={weather} />

      <LateStatusPills customersMonth={lateParts.customersMonth} debt={lateParts.debt} />

      {/* Phones read it top to bottom in this order; on PC the cells are placed in two columns */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 lg:row-start-2">
          <MoneyHero stats={stats} error={messageOf(data?.today)} onRetry={refresh} />
        </div>

        <div className="lg:col-span-12 lg:row-start-1">
          <LatePeriodCards today={lateParts.today} week={lateParts.week} month={lateParts.month} />
        </div>

        <div className="empty:hidden lg:col-span-5 lg:col-start-8 lg:row-start-2">
          {loading && <DebtSummarySkeleton />}
          {debt && <DebtSummaryCard debt={debt} />}
          {data && !data.unpaidRecords.ok && (
            <Card tone="warning">
              <ErrorState title="โหลดยอดค้างชำระไม่สำเร็จ" message={messageOf(data.unpaidRecords)} onRetry={refresh} />
            </Card>
          )}
        </div>

        <LateQuickLinks debt={lateParts.debt ?? null} className="lg:col-span-5 lg:col-start-8 lg:row-start-3" />

        <Card as="section" aria-labelledby={listId} className="lg:col-span-7 lg:row-span-4 lg:row-start-3">
          <CardHeader id={listId} title={`รายการวันนี้${records.length ? ` (${records.length})` : ''}`}>
            <AppLink href="/add" className={buttonClassName({ variant: 'ghost' })}>
              <Icon name="plus" />
              บันทึก
            </AppLink>
          </CardHeader>
          {loading ? (
            <SkeletonGroup className="grid grid-cols-1 divide-y divide-border">
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
                <AppLink href="/add" className={buttonClassName({})}>
                  <Icon name="plus" />
                  บันทึกรายการแรก
                </AppLink>
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

        <div className="lg:col-span-5 lg:col-start-8 lg:row-start-4">
          <LateChartCard series={lateParts.series} today={day} error={lateParts.seriesError} onRetry={refresh} />
        </div>

        <div className="lg:col-span-5 lg:col-start-8 lg:row-start-5">
          <LateTodaySplit stats={lateParts.stats} />
        </div>

        <div className="lg:col-span-5 lg:col-start-8 lg:row-start-6">
          <LateCustomerBreakdownCard items={lateParts.customers} error={lateParts.customersError} onRetry={refresh} />
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
