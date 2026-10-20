'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
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
import { CustomerFormDialog } from '@/features/customers/components/CustomerFormDialog'
import { DebtContact } from '@/features/customers/components/DebtContact'
import { useCustomerDirectory } from '@/features/customers/hooks'
import { keepScreen, keptScreen } from '@/lib/screen-memory'
import { pushUrl, replaceUrl, useUrlDialog } from '@/lib/url-state'
import { EditRecordDialog } from '@/features/records/components/EditRecordDialog'
import { useEditParam } from '@/features/records/useEditParam'
import type { Record as AppRecord } from '@/types'
import { listUnpaid } from '../api'
import { UNNAMED_KEY, debtTotals, groupDebts, sortDebts, type DebtGroup, type DebtSort } from '../logic'
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
  // Back on this tab: the last list at once, a fresh copy right after (lib/screen-memory.ts)
  const [unpaid, setUnpaid] = useState<Result<AppRecord[]> | null>(() => keptScreen<Result<AppRecord[]>>('debts') ?? null)
  const [billing, setBilling] = useState<string | null>(null)
  const settleOpenedHere = useRef(false)
  const today = bangkokToday()

  const load = useCallback(async () => {
    const result = await listUnpaid()
    if (result.ok) keepScreen('debts', result)
    else reportAppError(result.error)
    setUnpaid(result)
  }, [])

  useEffect(() => {
    // Initial load; the result arrives after this effect
    void load()
  }, [load])

  // The nav badge comes from the server layout, so it needs router.refresh(). Not while
  // the settle dialog is closing: a refresh sent then is for the old /debts?settle= URL,
  // and when Safari (WebKit) cancels it because the page is left, Next.js replays it as a
  // full page load of that URL, taking the user back to /debts?settle= (D-12). So the
  // refresh waits until ?settle= has left the URL. aria-busy says the page is updating.
  const [refreshing, startRefresh] = useTransition()
  const [refreshAfterClose, setRefreshAfterClose] = useState(false)
  const settleOpen = useRef(false)

  /** Reload this page and the nav badge */
  const reload = useCallback(() => {
    void load()
    if (settleOpen.current) setRefreshAfterClose(true)
    else startRefresh(() => router.refresh())
  }, [load, router])

  const sort: DebtSort = searchParams.get('sort') === 'age' ? 'age' : 'amount'
  const groups = useMemo(() => (unpaid?.ok ? sortDebts(groupDebts(unpaid.data, today), sort) : []), [unpaid, sort, today])
  const totals = debtTotals(groups)
  const records = unpaid?.ok ? unpaid.data : []
  const edit = useEditParam({ income: records, ready: unpaid !== null })

  // Customer directory: a call button on each card (US-10), "เพิ่มเบอร์" when not in it yet
  const directory = useCustomerDirectory()
  const addCustomer = useUrlDialog('customer')
  const [addFor, setAddFor] = useState<DebtGroup | null>(null)

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

  useEffect(() => {
    settleOpen.current = settleKey !== null
    if (settleKey !== null || !refreshAfterClose) return
    // The dialog has closed: now refresh for /debts
    setRefreshAfterClose(false)
    startRefresh(() => router.refresh())
  }, [settleKey, refreshAfterClose, router])

  function openSettle(g: DebtGroup) {
    settleOpenedHere.current = true
    pushUrl(withParam('settle', g.key))
  }

  function closeSettle() {
    if (settleOpenedHere.current) {
      settleOpenedHere.current = false
      router.back()
    } else {
      replaceUrl(withParam('settle', null))
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
    <div aria-busy={refreshing || refreshAfterClose || undefined} className="grid grid-cols-1 gap-4 pb-4">
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
            onChange={(v) => v && replaceUrl(withParam('sort', v === 'amount' ? null : v))}
            options={[
              { value: 'amount', label: 'ยอดมากสุด' },
              { value: 'age', label: 'ค้างนานสุด' },
            ]}
          />
        )}
      </header>

      {unpaid === null ? (
        <SkeletonGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
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
              contact={
                <DebtContact
                  name={g.key === UNNAMED_KEY ? null : g.name}
                  plates={g.plates}
                  customers={directory.customers}
                  onAdd={() => {
                    setAddFor(g)
                    addCustomer.open('new')
                  }}
                />
              }
            />
          ))}
        </div>
      )}

      <SettleDialog group={settling} onClose={closeSettle} onSettled={reload} />
      <EditRecordDialog target={edit.target} onClose={edit.close} onChanged={reload} />
      <CustomerFormDialog
        open={addCustomer.value === 'new' && directory.customers !== null}
        customer={null}
        start={addFor ? { name: addFor.name, plates: addFor.plates } : undefined}
        customers={directory.customers ?? []}
        userId={null}
        onClose={addCustomer.close}
        onReload={() => void directory.reload()}
        onSaved={() => {
          addCustomer.close()
          void directory.reload()
        }}
      />
    </div>
  )
}
