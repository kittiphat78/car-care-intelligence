'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartMode, toChartData } from '../logic'
import { baht } from './cards'

export interface ChartBarsProps {
  data: ReturnType<typeof toChartData>
  mode: ChartMode
  colours: Record<string, string>
}

// The bars of ChartCard, in their own file so recharts loads separately (O-07)
export default function ChartBars({ data, mode, colours }: ChartBarsProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
        barGap={2}
        // The bars are decoration for sighted users (hidden from screen readers);
        // the sentence above and the table carry the numbers, so no keyboard stops
        // inside a hidden chart (axe: aria-hidden-focus)
        accessibilityLayer={false}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colours['--color-border']} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: colours['--color-text-tertiary'], fontSize: 14 }} interval={mode === 'week' ? 0 : 'preserveStartEnd'} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: colours['--color-text-tertiary'], fontSize: 14 }} width={56} />
        <Tooltip
          cursor={{ fill: colours['--color-border'], opacity: 0.4 }}
          contentStyle={{ background: colours['--color-surface'], border: `1px solid ${colours['--color-border']}`, borderRadius: 12, color: colours['--color-text'] }}
          formatter={(value, name) => [baht(Number(value)), name === 'income' ? 'รายรับ' : 'รายจ่าย']}
        />
        <Bar dataKey="income" fill={colours['--color-income']} radius={[4, 4, 0, 0]} maxBarSize={18} />
        <Bar dataKey="expense" fill={colours['--color-expense']} radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}
