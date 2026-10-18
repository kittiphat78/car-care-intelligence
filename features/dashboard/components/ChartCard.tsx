'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ChoiceGroup } from '@/components/ui/ChoiceGroup'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/patterns/EmptyState'
import { useTheme } from '@/components/patterns/theme'
import { chartSummary, toChartData, type ChartMode, type DayTotal } from '../logic'
import { CardHeader, baht } from './cards'

// The bars come from recharts (about 110 KB gzip). Loaded after the rest of the page so
// today's numbers are not waiting for it; the box keeps its height meanwhile, so nothing
// moves when the bars appear (optimization-log O-07)
const ChartBars = dynamic(() => import('./ChartBars'), {
  ssr: false,
  loading: () => <div className="size-full rounded-md bg-surface-2" />,
})

// component-specifications.md §2.11 — bars plus a sentence and a table, so the numbers
// never depend on reading colours. Colours come from the tokens of the current theme.

const TOKENS = ['--color-income', '--color-expense', '--color-border', '--color-text-tertiary', '--color-surface', '--color-text'] as const

function useTokenColours(theme: string) {
  const [colours, setColours] = useState<Record<string, string>>({})
  useEffect(() => {
    const style = getComputedStyle(document.documentElement)
    // Read once per theme; recharts needs plain colour values
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColours(Object.fromEntries(TOKENS.map((t) => [t, style.getPropertyValue(t).trim()])))
  }, [theme])
  return colours
}

export function ChartCard({ series, today, error, onRetry }: { series: DayTotal[] | null; today: string; error?: string; onRetry: () => void }) {
  const id = useId()
  const [mode, setMode] = useState<ChartMode>('week')
  const [showTable, setShowTable] = useState(false)
  const { theme } = useTheme()
  const c = useTokenColours(theme)
  const data = useMemo(() => (series ? toChartData(series, mode, today) : []), [series, mode, today])
  const sum = chartSummary(data)
  const days = mode === 'week' ? 7 : 30

  return (
    <Card as="section" aria-labelledby={id}>
      <CardHeader id={id} title="รายรับ-รายจ่าย">
        <ChoiceGroup
          label="ช่วงเวลาของกราฟ"
          value={mode}
          onChange={(v) => v && setMode(v)}
          options={[
            { value: 'week', label: '7 วัน' },
            { value: 'month', label: '30 วัน' },
          ]}
        />
      </CardHeader>
      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : !series ? (
        // Same lines as below (sentence, chart box, table button) so nothing moves (O-10)
        <SkeletonGroup>
          <div className="mb-2 text-body">
            <Skeleton className="h-[1lh] w-3/4" />
          </div>
          <Skeleton className="h-50 lg:h-60" />
          <Skeleton className="mt-2 h-12 w-32" />
        </SkeletonGroup>
      ) : (
        <>
          <p className="mb-2 text-body text-text-secondary">
            {days} วันล่าสุด: รายรับ <span className="font-semibold text-income tabular-nums">{baht(sum.income)}</span>, รายจ่าย{' '}
            <span className="font-semibold text-expense tabular-nums">{baht(sum.expense)}</span>
          </p>
          <div aria-hidden="true" className="h-50 lg:h-60">
            <ChartBars data={data} mode={mode} colours={c} />
          </div>
          <Button variant="ghost" size="md" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable} className="mt-2">
            {showTable ? 'ซ่อนตาราง' : 'ดูเป็นตาราง'}
          </Button>
          {showTable && (
            <div className="mt-2 max-h-72 overflow-auto rounded-md border border-border">
              <table className="w-full text-caption">
                <caption className="sr-only">รายรับและรายจ่าย {days} วันล่าสุด</caption>
                <thead className="sticky top-0 bg-surface-2 text-text-secondary">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-medium">วัน</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">รายรับ</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">รายจ่าย</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d, i) => (
                    <tr key={i} className="border-t border-border">
                      <th scope="row" className="px-3 py-1.5 text-left font-normal text-text">{d.label}</th>
                      <td className="px-3 py-1.5 text-right text-income tabular-nums">{baht(d.income)}</td>
                      <td className="px-3 py-1.5 text-right text-expense tabular-nums">{baht(d.expense)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
