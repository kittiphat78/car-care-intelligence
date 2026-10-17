'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ChoiceGroup } from '@/components/ui/ChoiceGroup'
import { SkeletonCard, SkeletonGroup } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/patterns/EmptyState'
import { useTheme } from '@/components/patterns/theme'
import { chartSummary, toChartData, type ChartMode, type DayTotal } from '../logic'
import { CardHeader, baht } from './cards'

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
        <SkeletonGroup>
          <SkeletonCard className="h-50" />
        </SkeletonGroup>
      ) : (
        <>
          <p className="mb-2 text-body text-text-secondary">
            {days} วันล่าสุด: รายรับ <span className="font-semibold text-income tabular-nums">{baht(sum.income)}</span>, รายจ่าย{' '}
            <span className="font-semibold text-expense tabular-nums">{baht(sum.expense)}</span>
          </p>
          <div aria-hidden="true" className="h-50 lg:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c['--color-border']} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: c['--color-text-tertiary'], fontSize: 14 }} interval={mode === 'week' ? 0 : 'preserveStartEnd'} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: c['--color-text-tertiary'], fontSize: 14 }} width={56} />
                <Tooltip
                  cursor={{ fill: c['--color-border'], opacity: 0.4 }}
                  contentStyle={{ background: c['--color-surface'], border: `1px solid ${c['--color-border']}`, borderRadius: 12, color: c['--color-text'] }}
                  formatter={(value, name) => [baht(Number(value)), name === 'income' ? 'รายรับ' : 'รายจ่าย']}
                />
                <Bar dataKey="income" fill={c['--color-income']} radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="expense" fill={c['--color-expense']} radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
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
