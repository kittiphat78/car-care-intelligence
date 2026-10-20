'use client'

import { memo, useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { keepScreen, keptScreen } from '@/lib/screen-memory'
import { pushUrl, replaceUrl } from '@/lib/url-state'
import { cn } from '@/lib/cn'
import { bangkokParts, formatBangkok } from '@/lib/time/bangkok'
import { toUserMessage } from '@/lib/errors'
import { reportAppError } from '@/lib/observability'
import type { Result } from '@/lib/result'
import { Badge } from '@/components/ui/Badge'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ChoiceGroup } from '@/components/ui/ChoiceGroup'
import { SkeletonGroup, SkeletonRow, SkeletonText } from '@/components/ui/Skeleton'
import { Tabs, tabId, tabPanelId } from '@/components/ui/Tabs'
import { TextInput } from '@/components/ui/TextInput'
import { EmptyState } from '@/components/patterns/EmptyState'
import { FormField } from '@/components/patterns/FormField'
import { MonthYearPicker, SearchField } from '@/components/patterns/fields'
import { EditRecordDialog } from '@/features/records/components/EditRecordDialog'
import { ExpenseRow, IncomeRow } from '@/features/records/components/RecordRow'
import { useEditParam } from '@/features/records/useEditParam'
import type { Expense, Record as AppRecord } from '@/types'
import { useMediaQuery, WIDE_SCREEN } from '@/lib/use-media-query'
import { loadYear } from '../api'
import {
  activeFilterCount,
  expenseSummary,
  filterExpenses,
  filterIncome,
  filtersQuery,
  groupByDay,
  incomeSummary,
  parseFilters,
  periodLabel,
  type DayGroup,
  type HistoryFilters,
} from '../logic'
import { ExportDialog } from './ExportDialog'

// screen-specifications.md §5 — /history. Everything that changes the view is in the URL,
// changed in the browser only (lib/url-state.ts) so a filter or tab shows at once.

const baht = (n: number) => `฿${n.toLocaleString('en-US')}`
const SEARCH_DELAY_MS = 250
const EARLIEST_YEAR = 2023

interface YearData {
  year: number
  records: Result<AppRecord[]>
  expenses: Result<Expense[]>
}

export function HistoryScreen() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams])
  const thisYear = bangkokParts().year
  const years = useMemo(() => Array.from({ length: thisYear - EARLIEST_YEAR + 1 }, (_, i) => thisYear - i), [thisYear])

  // ── URL ──
  const setFilters = useCallback(
    (patch: Partial<HistoryFilters>) => {
      const next = { ...filters, ...patch }
      const params = new URLSearchParams(filtersQuery(next))
      // Keep dialogs that are open (edit/export)
      for (const key of ['edit', 'export']) if (searchParams.has(key)) params.set(key, searchParams.get(key)!)
      const query = params.toString()
      replaceUrl(query ? `${pathname}?${query}` : pathname)
    },
    [filters, searchParams, pathname],
  )

  // Search: type freely, update the URL after a short pause (UF-HIST-01)
  const [query, setQuery] = useState(filters.q)
  const lastPushed = useRef(filters.q)
  useEffect(() => {
    if (query === lastPushed.current) return
    const timer = setTimeout(() => {
      lastPushed.current = query
      setFilters({ q: query })
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [query, setFilters])

  // ── Data: one Bangkok year at a time ──
  // Back on this tab: the last year shown at once, a fresh copy right after (lib/screen-memory.ts)
  const [data, setData] = useState<YearData | null>(() => keptScreen<YearData>('history') ?? null)
  const load = useCallback(async (year: number) => {
    const result = await loadYear(year)
    for (const part of [result.records, result.expenses]) if (!part.ok) reportAppError(part.error)
    if (result.records.ok && result.expenses.ok) keepScreen<YearData>('history', { year, ...result })
    setData({ year, ...result })
  }, [])
  useEffect(() => {
    // Loads when the year changes; the result arrives after this effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(filters.year)
  }, [filters.year, load])
  const reload = useCallback(() => void load(filters.year), [load, filters.year])

  const current = data?.year === filters.year ? data : null
  const records = useMemo(() => (current?.records.ok ? current.records.data : []), [current])
  const expenses = useMemo(() => (current?.expenses.ok ? current.expenses.data : []), [current])
  const side = filters.tab === 'income' ? current?.records : current?.expenses
  const loading = !current
  const failed = side && !side.ok ? side : null

  const edit = useEditParam({ income: records, expenses, ready: !loading })
  const exportOpen = searchParams.get('export') === '1'
  const exportOpenedHere = useRef(false)

  function toggleExport(open: boolean) {
    const params = new URLSearchParams(searchParams.toString())
    if (open) {
      exportOpenedHere.current = true
      params.set('export', '1')
      pushUrl(`${pathname}?${params.toString()}`)
    } else if (exportOpenedHere.current) {
      exportOpenedHere.current = false
      window.history.back()
    } else {
      params.delete('export')
      const q = params.toString()
      replaceUrl(q ? `${pathname}?${q}` : pathname)
    }
  }

  const filterCount = activeFilterCount(filters)
  const clearFilters = () => {
    setQuery('')
    lastPushed.current = ''
    setFilters({ q: '', from: '', to: '', job: 'all' })
  }

  // ── The list ──
  // A month of rows (a year with "ทั้งปี") is the slow part of a tap: the tab, the filters
  // and the summary change first and the rows follow (useDeferredValue), dimmed until
  // they do. The first render shows the skeleton, so a year kept from the last visit does
  // not hold up the page.
  const listFilters = useDeferredValue(filters)
  const listData = useDeferredValue(current, null)
  const listStale = !loading && (listFilters !== filters || listData !== current)
  const listRecords = useMemo(() => (listData?.records.ok ? listData.records.data : []), [listData])
  const incomeGroups = useMemo(() => groupByDay(filterIncome(listRecords, listFilters)), [listRecords, listFilters])
  const expenseGroups = useMemo(
    () => groupByDay(filterExpenses(listData?.expenses.ok ? listData.expenses.data : [], listFilters)),
    [listData, listFilters],
  )
  const listFiltered = activeFilterCount(listFilters) > 0
  // Handlers that keep their identity, so the memoised list skips the urgent render
  const latest = useRef({ clear: clearFilters, open: edit.open })
  useEffect(() => {
    latest.current = { clear: clearFilters, open: edit.open }
  })
  const clearFromList = useCallback(() => latest.current.clear(), [])
  const openIncome = useCallback((id: string) => latest.current.open('income', id), [])
  const openExpense = useCallback((id: string) => latest.current.open('expense', id), [])
  const now = bangkokParts()
  const exportDefault = { year: filters.year, month: filters.month === 0 ? (filters.year === now.year ? now.month : 12) : filters.month }

  // grid-cols-1 = minmax(0, 1fr): nothing inside (e.g. an Android <select>, which is as
  // wide as its longest option) can make the column wider than the screen
  return (
    <div className="grid grid-cols-1 gap-4 pb-4">
      <header className="flex flex-wrap items-end justify-between gap-3 pt-6">
        <h1 className="text-title text-text">ประวัติ</h1>
        <div className="w-full sm:w-auto sm:min-w-72">
          <MonthYearPicker
            id="history-period"
            label="ช่วงเวลา"
            month={filters.month}
            year={filters.year}
            years={years}
            allowWholeYear
            onChange={({ month, year }) => setFilters({ month, year })}
          />
        </div>
      </header>

      <Tabs
        idBase="history"
        label="ประเภทรายการ"
        value={filters.tab}
        onChange={(tab) => setFilters({ tab, job: 'all' })}
        tabs={[
          { value: 'income', label: 'รายรับ' },
          { value: 'expense', label: 'รายจ่าย' },
        ]}
      />

      <section id={tabPanelId('history', filters.tab)} role="tabpanel" aria-labelledby={tabId('history', filters.tab)} className="grid grid-cols-1 gap-4">
        <PeriodSummary filters={filters} records={current?.records} expenses={current?.expenses} onExport={() => toggleExport(true)} />

        <FilterPanel filters={filters} query={query} onQuery={setQuery} onChange={setFilters} count={filterCount} onClear={clearFilters} />

        {failed && (
          <Banner tone="danger" title="โหลดประวัติไม่สำเร็จ" action={<Button variant="ghost" onClick={reload}>ลองอีกครั้ง</Button>}>
            {toUserMessage(failed.error)}
          </Banner>
        )}

        {loading || listData === null ? (
          <Card>
            <SkeletonGroup>
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonRow key={i} />
              ))}
            </SkeletonGroup>
          </Card>
        ) : failed ? null : (
          <div aria-busy={listStale || undefined} className={cn('transition-opacity duration-150', listStale && 'opacity-60')}>
            {listFilters.tab === 'income' ? (
              <RecordList
                groups={incomeGroups}
                kind="income"
                empty={listRecords.length === 0 || incomeGroups.length === 0}
                filtered={listFiltered}
                filters={listFilters}
                onClear={clearFromList}
                onOpen={openIncome}
              />
            ) : (
              <RecordList
                groups={expenseGroups}
                kind="expense"
                empty={expenseGroups.length === 0}
                filtered={listFiltered}
                filters={listFilters}
                onClear={clearFromList}
                onOpen={openExpense}
              />
            )}
          </div>
        )}
      </section>

      <EditRecordDialog target={edit.target} onClose={edit.close} onChanged={reload} />
      <ExportDialog
        open={exportOpen}
        onClose={() => toggleExport(false)}
        defaultMonth={exportDefault}
        years={years}
        loaded={current?.records.ok && current.expenses.ok ? { year: current.year, records, expenses } : null}
      />
    </div>
  )
}

// ── PeriodSummary (component-specifications.md §3.6) ────────────────────────

function PeriodSummary({
  filters,
  records,
  expenses,
  onExport,
}: {
  filters: HistoryFilters
  records?: Result<AppRecord[]>
  expenses?: Result<Expense[]>
  onExport: () => void
}) {
  const id = useId()
  const side = filters.tab === 'income' ? records : expenses
  return (
    <Card as="section" aria-labelledby={id} className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="grid grid-cols-1 gap-3">
        <h2 id={id} className="text-label text-text-secondary">
          {filters.tab === 'income' ? 'รายรับรวม' : 'รายจ่ายรวม'} {periodLabel(filters)}
        </h2>
        {!side ? (
          <SkeletonGroup>
            <SkeletonText className="w-48" />
          </SkeletonGroup>
        ) : !side.ok ? (
          <p className="text-body text-text-secondary">—</p>
        ) : filters.tab === 'income' && records?.ok ? (
          (() => {
            const s = incomeSummary(records.data, filters.month)
            return (
              <>
                <p className="text-title-lg text-income tabular-nums">{baht(s.total)}</p>
                <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <Stat label="ล้างรถ" value={`${s.washCount} คัน`} sub={baht(s.washTotal)} tone="text-wash" />
                  <Stat label="ขัดสี" value={`${s.polishCount} คัน`} sub={baht(s.polishTotal)} tone="text-polish" />
                  {s.unpaidTotal > 0 && <Stat label="ยังค้างชำระ" value={baht(s.unpaidTotal)} tone="text-unpaid" />}
                </dl>
              </>
            )
          })()
        ) : expenses?.ok ? (
          (() => {
            const s = expenseSummary(expenses.data, filters.month)
            return (
              <>
                <p className="text-title-lg text-expense tabular-nums">{baht(s.total)}</p>
                <p className="text-caption text-text-secondary">{s.count} รายการ</p>
              </>
            )
          })()
        ) : null}
      </div>
      <Button variant="secondary" leadingIcon="download" onClick={onExport} className="justify-self-start">
        ส่งออก Excel
      </Button>
    </Card>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className="rounded-md border border-border-strong px-3 py-2">
      <dt className="text-caption text-text-secondary">{label}</dt>
      <dd className={cn('text-body font-bold tabular-nums', tone)}>{value}</dd>
      {sub && <dd className="text-caption text-text-secondary tabular-nums">{sub}</dd>}
    </div>
  )
}

// ── FilterPanel (§3.7) ───────────────────────────────────────────────────────

function FilterPanel({
  filters,
  query,
  onQuery,
  onChange,
  count,
  onClear,
}: {
  filters: HistoryFilters
  query: string
  onQuery: (q: string) => void
  onChange: (patch: Partial<HistoryFilters>) => void
  count: number
  onClear: () => void
}) {
  const [open, setOpen] = useState(!!(filters.from || filters.to || (filters.job !== 'all' && filters.tab === 'income')))
  const panelId = useId()
  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <SearchField
            id="history-search"
            label={filters.tab === 'income' ? 'ค้นหาทะเบียน ลูกค้า หรือหมายเหตุ' : 'ค้นหารายการจ่าย'}
            placeholder={filters.tab === 'income' ? 'ทะเบียน / ลูกค้า' : 'ค้นหารายการ'}
            value={query}
            onChange={onQuery}
          />
        </div>
        <Button variant="secondary" leadingIcon="calendar" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)} className="lg:hidden">
          ตัวกรอง{count > 0 ? ` (${count})` : ''}
        </Button>
      </div>
      <div id={panelId} className={cn('grid-cols-1 gap-3 lg:grid lg:grid-cols-[1fr_1fr_auto] lg:items-end', open ? 'grid' : 'hidden')}>
        <div className="grid grid-cols-2 gap-2 lg:col-span-2">
          <FormField id="history-from" label="ตั้งแต่วันที่">
            <TextInput id="history-from" type="date" value={filters.from} onChange={(e) => onChange({ from: e.target.value })} />
          </FormField>
          <FormField id="history-to" label="ถึงวันที่">
            <TextInput id="history-to" type="date" value={filters.to} onChange={(e) => onChange({ to: e.target.value })} />
          </FormField>
        </div>
        {filters.tab === 'income' && (
          <ChoiceGroup
            label="ประเภทงาน"
            value={filters.job}
            onChange={(v) => onChange({ job: v ?? 'all' })}
            options={[
              { value: 'all', label: 'ทั้งหมด' },
              { value: 'wash', label: 'ล้างรถ', tone: 'wash' },
              { value: 'polish', label: 'ขัดสี', tone: 'polish' },
            ]}
          />
        )}
        {count > 0 && (
          <Button variant="ghost" leadingIcon="x" onClick={onClear} className="justify-self-start">
            ล้างตัวกรอง
          </Button>
        )}
      </div>
    </div>
  )
}

// ── List: day groups (phones/tablets) or a table (wide screens) ─────────────

const RecordList = memo(function RecordList({
  groups,
  kind,
  empty,
  filtered,
  filters,
  onClear,
  onOpen,
}: {
  groups: DayGroup<AppRecord>[] | DayGroup<Expense>[]
  kind: 'income' | 'expense'
  empty: boolean
  filtered: boolean
  filters: HistoryFilters
  onClear: () => void
  onOpen: (id: string) => void
}) {
  const wide = useMediaQuery(WIDE_SCREEN)
  if (empty || groups.length === 0) {
    return (
      <Card>
        {filtered ? (
          <EmptyState
            icon="search"
            title={filters.q ? `ไม่พบรายการที่ตรงกับ “${filters.q}”` : 'ไม่พบรายการที่ตรงกับตัวกรอง'}
            action={
              <Button variant="secondary" onClick={onClear}>
                ล้างตัวกรอง
              </Button>
            }
          />
        ) : (
          <EmptyState icon="history" title={`ไม่มี${kind === 'income' ? 'รายรับ' : 'รายจ่าย'}ใน${periodLabel(filters).startsWith('ปี') ? '' : 'เดือน '}${periodLabel(filters)}`} />
        )}
      </Card>
    )
  }

  // One layout only: rendering both and hiding one doubled the work of every row
  // (optimization-log O-04)
  if (wide) return <DataTable groups={groups} kind={kind} onOpen={onOpen} />

  return (
    <div className="grid grid-cols-1 gap-4">
      {groups.map((g) => (
        <section key={g.day} aria-label={g.label}>
          <DayGroupHeader group={g} kind={kind} />
          <Card className="p-2!">
            <ul className="grid grid-cols-1 divide-y divide-border">
              {(g.items as Array<AppRecord | Expense>).map((row) => (
                <li key={row.id}>
                  {kind === 'income' ? (
                    <IncomeRow record={row as AppRecord} showAudit onOpen={(r) => onOpen(r.id)} />
                  ) : (
                    <ExpenseRow expense={row as Expense} showAudit onOpen={(e) => onOpen(e.id)} />
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  )
})

function DayGroupHeader({ group, kind }: { group: DayGroup<AppRecord> | DayGroup<Expense>; kind: 'income' | 'expense' }) {
  return (
    <h2 className="sticky top-0 z-10 -mx-1 mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 bg-bg px-1 py-2">
      <span className="text-body font-semibold text-text">{group.label}</span>
      <span className="flex items-baseline gap-2">
        {kind === 'income' && (
          <span className="text-caption text-text-secondary">
            ล้างรถ {group.washCount} · ขัดสี {group.polishCount}
          </span>
        )}
        <span className={cn('text-body font-bold tabular-nums', kind === 'income' ? 'text-income' : 'text-expense')}>{baht(group.total)}</span>
      </span>
    </h2>
  )
}

const time = (at: string) => formatBangkok(at, { hour: '2-digit', minute: '2-digit', hour12: false })
const by = (email?: string) => email?.split('@')[0] ?? '—'

/** component-specifications.md §2.12 — wide screens only */
function DataTable({ groups, kind, onOpen }: { groups: DayGroup<AppRecord>[] | DayGroup<Expense>[]; kind: 'income' | 'expense'; onOpen: (id: string) => void }) {
  const th = 'sticky top-0 bg-surface-2 px-3 py-2 text-left text-caption font-medium text-text-secondary'
  const td = 'px-3 py-3 align-middle'
  return (
    <Card className="overflow-hidden p-0!">
      <table className="w-full text-body">
        <caption className="sr-only">{kind === 'income' ? 'รายการรายรับ' : 'รายการรายจ่าย'}</caption>
        <thead>
          {kind === 'income' ? (
            <tr>
              <th scope="col" className={th}>วันที่</th>
              <th scope="col" className={th}>เวลา</th>
              <th scope="col" className={th}>ทะเบียน</th>
              <th scope="col" className={th}>ประเภท</th>
              <th scope="col" className={th}>ลูกค้า</th>
              <th scope="col" className={th}>สถานะ</th>
              <th scope="col" className={cn(th, 'text-right')}>ราคา</th>
              <th scope="col" className={th}>ผู้บันทึก</th>
              <th scope="col" className={th}><span className="sr-only">แก้ไข</span></th>
            </tr>
          ) : (
            <tr>
              <th scope="col" className={th}>วันที่</th>
              <th scope="col" className={th}>เวลา</th>
              <th scope="col" className={th}>รายการ</th>
              <th scope="col" className={th}>หมายเหตุ</th>
              <th scope="col" className={cn(th, 'text-right')}>จำนวน</th>
              <th scope="col" className={th}>ผู้บันทึก</th>
              <th scope="col" className={th}><span className="sr-only">แก้ไข</span></th>
            </tr>
          )}
        </thead>
        <tbody>
          {groups.map((g) =>
            (g.items as Array<AppRecord | Expense>).map((row, i) => {
              const date = i === 0 ? g.label.split(' · ')[0] : ''
              if (kind === 'income') {
                const r = row as AppRecord
                return (
                  <tr key={r.id} className="h-13 border-t border-border hover:bg-surface-2">
                    <td className={cn(td, 'whitespace-nowrap text-text-secondary')}>{date}</td>
                    <td className={cn(td, 'text-text-secondary tabular-nums')}>{time(r.created_at)}</td>
                    <td className={cn(td, 'font-semibold text-text')}>{r.plate}</td>
                    <td className={td}>
                      <Badge tone={r.type === 'polish' ? 'polish' : 'wash'}>{r.type === 'polish' ? 'ขัดสี' : 'ล้างรถ'}</Badge>
                    </td>
                    <td className={cn(td, 'text-text-secondary')}>{r.customer_name || '—'}</td>
                    <td className={td}>
                      {r.payment_status === 'unpaid' ? (
                        <Badge tone="warning" icon="clock">ค้างชำระ</Badge>
                      ) : (
                        <Badge tone="success">ชำระแล้ว</Badge>
                      )}
                    </td>
                    <td className={cn(td, 'text-right font-bold tabular-nums', r.payment_status === 'unpaid' ? 'text-unpaid' : 'text-text')}>{baht(r.price)}</td>
                    <td className={cn(td, 'text-caption text-text-tertiary')}>{by(r.created_by_email)}</td>
                    <td className={cn(td, 'text-right')}>
                      <Button variant="ghost" size="sm" leadingIcon="pencil" onClick={() => onOpen(r.id)} aria-label={`แก้ไข ${r.plate} ${baht(r.price)}`}>
                        แก้ไข
                      </Button>
                    </td>
                  </tr>
                )
              }
              const e = row as Expense
              return (
                <tr key={e.id} className="h-13 border-t border-border hover:bg-surface-2">
                  <td className={cn(td, 'whitespace-nowrap text-text-secondary')}>{date}</td>
                  <td className={cn(td, 'text-text-secondary tabular-nums')}>{time(e.created_at)}</td>
                  <td className={cn(td, 'font-semibold text-text')}>{e.title}</td>
                  <td className={cn(td, 'text-text-secondary')}>{e.note || '—'}</td>
                  <td className={cn(td, 'text-right font-bold text-expense tabular-nums')}>−{baht(e.amount)}</td>
                  <td className={cn(td, 'text-caption text-text-tertiary')}>{by(e.created_by_email)}</td>
                  <td className={cn(td, 'text-right')}>
                    <Button variant="ghost" size="sm" leadingIcon="pencil" onClick={() => onOpen(e.id)} aria-label={`แก้ไข ${e.title} ${baht(e.amount)}`}>
                      แก้ไข
                    </Button>
                  </td>
                </tr>
              )
            }),
          )}
        </tbody>
      </table>
    </Card>
  )
}
