'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartMode, toChartData } from '../logic'
import { baht } from './cards'

export interface ChartAreaProps {
  data: ReturnType<typeof toChartData>
  mode: ChartMode
  colours: Record<string, string>
}

// Short axis numbers (4k, 12.5k) so they fit the axis instead of being cut ("0000", Phase A M1)
const shortBaht = (v: number) => (v >= 1000 ? `${Number((v / 1000).toFixed(1))}k` : String(v))

// The lines of ChartCard, in their own file so recharts loads separately (O-07).
// Income: a solid line over a gradient fill; expenses: a dashed line, so the two differ by
// more than colour (ADR-28)
export default function ChartArea({ data, mode, colours }: ChartAreaProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        // The lines are decoration for sighted users (hidden from screen readers);
        // the sentence above and the table carry the numbers, so no keyboard stops
        // inside a hidden chart (axe: aria-hidden-focus)
        accessibilityLayer={false}
      >
        <defs>
          <linearGradient id="chart-income-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={colours['--color-gradient-from']} stopOpacity={0.35} />
            <stop offset="1" stopColor={colours['--color-gradient-to']} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 4" vertical={false} stroke={colours['--color-border']} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: colours['--color-text-tertiary'], fontSize: 14 }} interval={mode === 'week' ? 0 : 'preserveStartEnd'} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: colours['--color-text-tertiary'], fontSize: 14 }} width={44} tickFormatter={shortBaht} />
        <Tooltip
          cursor={{ stroke: colours['--color-border'] }}
          contentStyle={{ background: colours['--color-surface'], border: `1px solid ${colours['--color-border']}`, borderRadius: 14, color: colours['--color-text'] }}
          formatter={(value, name) => [baht(Number(value)), name === 'income' ? 'รายรับ' : 'รายจ่าย']}
        />
        <Area type="monotone" dataKey="income" stroke={colours['--color-gradient-from']} strokeWidth={3} fill="url(#chart-income-fill)" isAnimationActive={false} />
        <Area type="monotone" dataKey="expense" stroke={colours['--color-expense']} strokeWidth={2.5} strokeDasharray="7 5" fill="none" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
