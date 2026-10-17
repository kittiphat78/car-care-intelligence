'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { bangkokToday } from '@/lib/time/bangkok'
import { toUserMessage } from '@/lib/errors'
import { reportAppError } from '@/lib/observability'
import type { Result } from '@/lib/result'
import { buttonClassName } from '@/components/ui/Button'
import { ChoiceGroup } from '@/components/ui/ChoiceGroup'
import { SkeletonCard, SkeletonGroup } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { EmptyState, ErrorState } from '@/components/patterns/EmptyState'
import { useOnline } from '@/components/patterns/StatusBar'
import { EditRecordDialog } from '@/features/records/components/EditRecordDialog'
import { useEditParam } from '@/features/records/useEditParam'
import type { Record as AppRecord } from '@/types'
import { listUnpaid } from '../api'
import { debtTotals, groupDebts, sortDebts, type DebtGroup, type DebtSort } from '../logic'
import { DebtCustomerCard } from './DebtCustomerCard'
import { SettleDialog } from './SettleDialog'

// screen-specifications.md §3 — /debts?sort=amount|age&settle=<customer>

const baht = (n: number) => `฿${n.toLocaleString('en-US')}`

export function DebtsScreen() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const toast = useToast()
  const online = useOnline()
  const [unpaid, setUnpaid] = useState<Result<AppRecord[]> | null>(null)
  const [billing, setBilling] = useState<string | null>(null)
  const settleOpenedHere = useRef(false)
  const today = bangkokToday()

  const load = useCallback(async () => {
    const result = await listUnpaid()
    if (!result.ok) reportAppError(result.error)
    setUnpaid(result)
  }, [])

  useEffect(() => {
    // Initial load; the result arrives after this effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  /** Reload this page and the nav badge (rendered by the server layout) */
  const reload = useCallback(() => {
    void load()
    router.refresh()
  }, [load, router])

  const sort: DebtSort = searchParams.get('sort') === 'age' ? 'age' : 'amount'
  const groups = useMemo(() => (unpaid?.ok ? sortDebts(groupDebts(unpaid.data, today), sort) : []), [unpaid, sort, today])
  const totals = debtTotals(groups)
  const records = unpaid?.ok ? unpaid.data : []
  const edit = useEditParam({ income: records, ready: unpaid !== null })

  // ── URL helpers ──
  const withParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null) params.delete(key)
    else params.set(key, value)
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  const settleKey = searchParams.get('settle')
  const settling = settleKey ? (groups.find((g) => g.key === settleKey) ?? null) : null

  function openSettle(g: DebtGroup) {
    settleOpenedHere.current = true
    router.push(withParam('settle', g.key), { scroll: false })
  }

  function closeSettle() {
    if (settleOpenedHere.current) {
      settleOpenedHere.current = false
      router.back()
    } else {
      router.replace(withParam('settle', null), { scroll: false })
    }
  }

  async function bill(g: DebtGroup) {
    setBilling(g.key)
    try {
      const { generateCashBill } = await import('@/lib/generateBill')
      await generateCashBill(g.items, g.name)
      toast.success(`สร้างบิล ${g.name} แล้ว`)
    } catch (e) {
      console.error('[Debts] Bill error:', e)
      toast.error('สร้างบิลไม่สำเร็จ ลองอีกครั้ง', { action: { label: 'ลองอีกครั้ง', onClick: () => void bill(g) } })
    } finally {
      setBilling(null)
    }
  }

  return (
    <div className="grid gap-4 pb-4">
      <header className="flex flex-wrap items-end justify-between gap-3 pt-6">
        <div className="min-w-0">
          <h1 className="text-title text-text">ค้างชำระ</h1>
          {unpaid?.ok && totals.total > 0 && (
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="text-title-lg text-unpaid tabular-nums">{baht(totals.total)}</span>
              <span className="text-body text-text-secondary">
                {totals.customers} ราย · {totals.cars} คัน
              </span>
            </p>
          )}
        </div>
        {unpaid?.ok && groups.length > 1 && (
          <ChoiceGroup
            label="เรียงตาม"
            value={sort}
            onChange={(v) => v && router.replace(withParam('sort', v === 'amount' ? null : v), { scroll: false })}
            options={[
              { value: 'amount', label: 'ยอดมากสุด' },
              { value: 'age', label: 'ค้างนานสุด' },
            ]}
          />
        )}
      </header>

      {unpaid === null ? (
        <SkeletonGroup className="grid gap-4 md:grid-cols-2">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-64" />
        </SkeletonGroup>
      ) : !unpaid.ok ? (
        <ErrorState title="โหลดรายการค้างชำระไม่สำเร็จ" message={toUserMessage(unpaid.error)} onRetry={reload} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon="check-circle"
          title="ไม่มีรายการค้างชำระ"
          action={
            <Link href="/" className={buttonClassName({ variant: 'secondary' })}>
              กลับภาพรวม
            </Link>
          }
        >
          ทุกรายการได้รับชำระแล้ว
        </EmptyState>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {groups.map((g) => (
            <DebtCustomerCard
              key={g.key}
              group={g}
              today={today}
              online={online}
              billing={billing === g.key}
              onBill={(group) => void bill(group)}
              onSettle={openSettle}
              onOpenRow={(r) => edit.open('income', r.id)}
            />
          ))}
        </div>
      )}

      <SettleDialog group={settling} onClose={closeSettle} onSettled={reload} />
      <EditRecordDialog target={edit.target} onClose={edit.close} onChanged={reload} />
    </div>
  )
}
