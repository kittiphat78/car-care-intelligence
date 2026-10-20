'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { formatBangkok } from '@/lib/time/bangkok'
import { toUserMessage } from '@/lib/errors'
import { reportAppError } from '@/lib/observability'
import type { Result } from '@/lib/result'
import { Card } from '@/components/ui/Card'
import { SkeletonGroup, SkeletonRow, SkeletonText } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/patterns/EmptyState'
import { EditRecordDialog } from '@/features/records/components/EditRecordDialog'
import { IncomeRow } from '@/features/records/components/RecordRow'
import { useEditParam } from '@/features/records/useEditParam'
import { getCustomerHistory } from '../api'
import type { CustomerHistory } from '../types'

// docs/features/customer-directory.md §6.3 (US-12) — how often the customer came, totals,
// and the latest records, matched by plate and name (customer_history, M014). A row opens
// the usual edit dialog (?edit=income:<id>).

export const HISTORY_ROWS = 10

const baht = (n: number) => `฿${n.toLocaleString('en-US')}`
const day = (at: string) => formatBangkok(at, { day: 'numeric', month: 'short', year: 'numeric' })

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-border-strong px-3 py-2">
      <dt className="text-caption text-text-secondary">{label}</dt>
      <dd className={cn('text-body font-bold tabular-nums', tone ?? 'text-text')}>{value}</dd>
    </div>
  )
}

export function CustomerHistoryCard({ customerId, refreshKey }: { customerId: string; refreshKey: string }) {
  const [history, setHistory] = useState<Result<CustomerHistory> | null>(null)

  const load = useCallback(async () => {
    const result = await getCustomerHistory(customerId, HISTORY_ROWS)
    if (!result.ok) reportAppError(result.error)
    setHistory(result)
  }, [customerId])

  useEffect(() => {
    // Again after the customer changed (plates or name decide what matches)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load, refreshKey])

  const data = history?.ok ? history.data : null
  const edit = useEditParam({ income: data?.recent.map((r) => r.record) ?? [], ready: history !== null })

  return (
    <Card as="section" aria-labelledby="customer-history" className="grid grid-cols-1 gap-3">
      <h2 id="customer-history" className="text-subheading text-text">
        ประวัติการมาใช้บริการ
      </h2>
      {history === null ? (
        <SkeletonGroup label="กำลังโหลดประวัติ…">
          <SkeletonText className="w-48" />
          {Array.from({ length: 3 }, (_, i) => (
            <SkeletonRow key={i} />
          ))}
        </SkeletonGroup>
      ) : !history.ok ? (
        <ErrorState title="โหลดประวัติไม่สำเร็จ" message={toUserMessage(history.error)} onRetry={() => void load()} />
      ) : data!.visits === 0 ? (
        <p className="text-body text-text-tertiary">ยังไม่มีรายการที่ตรงกับทะเบียนหรือชื่อของลูกค้านี้</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <Stat label="มาใช้บริการ" value={`${data!.visits.toLocaleString('en-US')} ครั้ง`} />
            <Stat label="ล่าสุด" value={data!.lastVisit ? day(data!.lastVisit) : '—'} />
            <Stat label="ยอดรวม" value={baht(data!.total)} />
            <Stat
              label="ค้างชำระ"
              value={data!.unpaidCount ? `${baht(data!.unpaidTotal)} (${data!.unpaidCount} รายการ)` : 'ไม่มี'}
              tone={data!.unpaidCount ? 'text-unpaid' : undefined}
            />
          </dl>
          {data!.digitsOnly > 0 && (
            <p className="text-caption text-text-secondary">
              รวม {data!.digitsOnly} รายการที่ทะเบียนตรงแค่ตัวเลข อาจเป็นรถคันอื่น (ดูที่แถวที่มีหมายเหตุ)
            </p>
          )}
          <h3 className="text-label text-text">
            รายการล่าสุด{data!.visits > data!.recent.length ? ` (${data!.recent.length} จาก ${data!.visits.toLocaleString('en-US')})` : ''}
          </h3>
          <ul className="-mx-2 grid grid-cols-1 divide-y divide-border">
            {data!.recent.map(({ record, sure }) => (
              <li key={record.id}>
                <IncomeRow record={record} showDate below={sure ? undefined : 'ทะเบียนตรงแค่ตัวเลข'} onOpen={(r) => edit.open('income', r.id)} />
              </li>
            ))}
          </ul>
        </>
      )}
      <EditRecordDialog target={edit.target} onClose={edit.close} onChanged={() => void load()} />
    </Card>
  )
}
