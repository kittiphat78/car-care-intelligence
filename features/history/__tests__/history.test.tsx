import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appError } from '@/lib/errors'
import { ToastProvider } from '@/components/ui/Toast'
import type { Expense, Record as AppRecord } from '@/types'

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), search: '' }))
vi.mock('next/navigation', () => ({
  useRouter: () => nav,
  usePathname: () => '/history',
  useSearchParams: () => new URLSearchParams(nav.search),
}))
const api = vi.hoisted(() => ({ loadYear: vi.fn(), loadExportRange: vi.fn() }))
vi.mock('../api', () => api)
vi.mock('@/features/records/api', () => ({ getEntry: vi.fn(), updateEntry: vi.fn(), deleteEntry: vi.fn(), countVisitsByPlate: vi.fn() }))
vi.mock('@/lib/observability', () => ({ reportAppError: vi.fn() }))
const xlsx = vi.hoisted(() => ({ exportToExcel: vi.fn() }))
vi.mock('@/lib/export', () => xlsx)

import { HistoryScreen } from '../components/HistoryScreen'
import {
  activeFilterCount,
  countInRange,
  exportFileName,
  exportRangeError,
  filterIncome,
  filtersQuery,
  groupByDay,
  incomeSummary,
  parseFilters,
} from '../logic'

const NOW = new Date('2026-10-15T05:00:00Z')
const rec = (id: string, at: string, over: Partial<AppRecord> = {}): AppRecord =>
  ({ id, created_at: at, type: 'wash', plate: `กข ${id}`, services: ['', '', ''], price: 100, seq_number: 1, payment_status: 'paid', job_status: 'done', customer_name: '', ...over }) as AppRecord
const exp = (id: string, at: string, over: Partial<Expense> = {}): Expense => ({ id, created_at: at, title: 'ค่าน้ำยา', amount: 50, note: null, ...over })

const records = [
  rec('1', '2026-10-14T23:30:00Z', { type: 'polish', price: 1500 }), // 15 Oct 06:30 Bangkok
  rec('2', '2026-10-14T03:00:00Z', { customer_name: 'เต็นท์ A', payment_status: 'unpaid' }),
  rec('3', '2026-09-30T03:00:00Z'),
]
const expenses = [exp('e1', '2026-10-10T03:00:00Z')]

describe('history rules', () => {
  it('reads filters from the URL and writes back only what differs from the defaults', () => {
    const f = parseFilters(new URLSearchParams('m=9&tab=expense&q=x&from=2026-09-01&job=wash'), NOW)
    expect(f).toEqual({ year: 2026, month: 9, tab: 'expense', q: 'x', from: '2026-09-01', to: '', job: 'wash' })
    // the job filter only applies to income, so it is not written for the expense tab
    expect(filtersQuery(f, NOW)).toBe('m=9&tab=expense&q=x&from=2026-09-01')
    expect(filtersQuery({ ...f, tab: 'income', job: 'polish' }, NOW)).toBe('m=9&q=x&from=2026-09-01&job=polish')
    expect(parseFilters(new URLSearchParams('y=1999&m=13'), NOW)).toMatchObject({ year: 2026, month: 10 })
  })

  it('treats a date range as whole Bangkok days, including 00:00–06:59 (ER-10)', () => {
    const f = { ...parseFilters(new URLSearchParams(), NOW), from: '2026-10-15', to: '2026-10-15' }
    expect(filterIncome(records, f).map((r) => r.id)).toEqual(['1'])
  })

  it('finds by plate, customer or note, and by job type', () => {
    const base = parseFilters(new URLSearchParams(), NOW)
    expect(filterIncome(records, { ...base, q: 'เต็นท์' }).map((r) => r.id)).toEqual(['2'])
    expect(filterIncome(records, { ...base, job: 'polish' }).map((r) => r.id)).toEqual(['1'])
    expect(activeFilterCount({ ...base, q: 'x', job: 'wash' })).toBe(2)
  })

  it('sums the month and groups by day, newest first', () => {
    expect(incomeSummary(records, 10)).toMatchObject({ total: 1600, washCount: 1, polishCount: 1, unpaidTotal: 100 })
    const groups = groupByDay(records.slice(0, 2))
    expect(groups.map((g) => [g.day, g.total])).toEqual([
      ['2026-10-15', 1500],
      ['2026-10-14', 100],
    ])
    expect(groups[0].label).toBe('15 ต.ค. 2569 · วันพฤหัสบดี')
  })

  it('checks the export range and names the file', () => {
    expect(exportRangeError({ year: 2026, month: 10 }, { year: 2026, month: 9 })).toBe('เดือนสิ้นสุดต้องไม่ก่อนเดือนเริ่มต้น')
    expect(exportFileName('bank', { year: 2026, month: 10 }, { year: 2026, month: 10 })).toBe('สรุปรายรับและรายจ่าย_ตุลาคม2569')
    expect(exportFileName('internal', { year: 2026, month: 9 }, { year: 2026, month: 10 })).toBe('รายงานภายใน_ตั้งแต่กันยายน2569_ถึงตุลาคม2569')
    expect(countInRange(records, expenses, 2026, { year: 2026, month: 10 }, { year: 2026, month: 10 })).toBe(3)
    expect(countInRange(records, expenses, 2026, { year: 2025, month: 10 }, { year: 2026, month: 10 })).toBeNull()
  })
})

async function renderScreen() {
  await act(async () => {
    render(
      <ToastProvider>
        <HistoryScreen />
      </ToastProvider>,
    )
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW })
  nav.push.mockReset()
  nav.replace.mockReset()
  nav.search = ''
  api.loadYear.mockReset().mockResolvedValue({ records: { ok: true, data: records }, expenses: { ok: true, data: expenses } })
  api.loadExportRange.mockReset()
  xlsx.exportToExcel.mockReset().mockResolvedValue(undefined)
  return () => vi.useRealTimers()
})

describe('HistoryScreen', () => {
  it('shows the month total and the jobs grouped by day', async () => {
    await renderScreen()
    expect(screen.getByRole('heading', { level: 1, name: 'ประวัติ' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /รายรับรวม ตุลาคม 2569/ })).toHaveTextContent('฿1,600')
    expect(screen.getByRole('region', { name: '15 ต.ค. 2569 · วันพฤหัสบดี' })).toHaveTextContent('กข 1')
    expect(screen.queryByText('กข 3')).toBeNull()
  })

  it('keeps the tab in the URL', async () => {
    await renderScreen()
    fireEvent.click(screen.getByRole('tab', { name: 'รายจ่าย' }))
    expect(nav.replace).toHaveBeenCalledWith('/history?tab=expense', { scroll: false })
  })

  it('updates the search in the URL after typing stops', async () => {
    vi.useRealTimers()
    vi.useFakeTimers({ now: NOW })
    await renderScreen()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'กข 2' } })
    expect(nav.replace).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(300)
    })
    expect(nav.replace).toHaveBeenCalledWith('/history?q=%E0%B8%81%E0%B8%82+2', { scroll: false })
  })

  it('says nothing matched and offers to clear the filters', async () => {
    nav.search = 'q=zzz'
    await renderScreen()
    expect(screen.getByText('ไม่พบรายการที่ตรงกับ “zzz”')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'ล้างตัวกรอง' })[0])
    expect(nav.replace).toHaveBeenCalledWith('/history', { scroll: false })
  })

  it('shows a load error above the list, not ฿0', async () => {
    api.loadYear.mockResolvedValue({ records: { ok: false, error: appError('NETWORK') }, expenses: { ok: true, data: [] } })
    await renderScreen()
    expect(screen.getByRole('alert')).toHaveTextContent('โหลดประวัติไม่สำเร็จ')
    expect(screen.queryByText('฿0')).toBeNull()
  })

  it('exports the chosen months and builds no file from partial data (ER-07)', async () => {
    nav.search = 'export=1'
    api.loadExportRange.mockResolvedValueOnce({ ok: false, error: appError('ROW_LIMIT') })
    await renderScreen()
    const dialog = screen.getByRole('dialog', { name: 'ส่งออก Excel' })
    expect(dialog).toHaveTextContent('พบ 3 รายการ')
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'ดาวน์โหลด Excel' }))
    })
    expect(within(dialog).getByRole('alert')).toHaveTextContent('ส่งออกไม่สำเร็จ')
    expect(xlsx.exportToExcel).not.toHaveBeenCalled()

    api.loadExportRange.mockResolvedValueOnce({ ok: true, data: { records, expenses } })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'ดาวน์โหลด Excel' }))
    })
    expect(xlsx.exportToExcel).toHaveBeenCalledWith({ records, expenses }, 'สรุปรายรับและรายจ่าย_ตุลาคม2569', 'bank')
    expect(screen.getByRole('status')).toHaveTextContent('ส่งออก 4 รายการแล้ว')
  })

  it('refuses an end month before the start month', async () => {
    nav.search = 'export=1'
    await renderScreen()
    fireEvent.change(screen.getByLabelText('ถึง: เดือน'), { target: { value: '9' } })
    expect(screen.getByText('เดือนสิ้นสุดต้องไม่ก่อนเดือนเริ่มต้น')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ดาวน์โหลด Excel' })).toBeDisabled()
  })
})
