'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import type { Expense, Record as AppRecord } from '@/types'
import { getEntry } from './api'
import type { EditTarget } from './components/EditRecordDialog'

// The edit dialog lives in the URL (?edit=income:<id> / ?edit=expense:<id>), so the
// back button closes it and a link can open it (design-to-code-map.md §4). Used by
// the dashboard, the debts page and history.

type Kind = EditTarget['kind']

export function useEditParam({ income = [], expenses = [], ready = true }: { income?: readonly AppRecord[]; expenses?: readonly Expense[]; ready?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [fetched, setFetched] = useState<EditTarget | null>(null)
  const openedHere = useRef(false)

  const param = searchParams.get('edit') ?? ''
  const [kind, id] = param.split(':') as [Kind | '', string | undefined]
  const valid = (kind === 'income' || kind === 'expense') && !!id

  const fromList: EditTarget | null = !valid
    ? null
    : kind === 'income'
      ? ((r) => (r ? { kind: 'income' as const, row: r } : null))(income.find((r) => r.id === id))
      : ((e) => (e ? { kind: 'expense' as const, row: e } : null))(expenses.find((e) => e.id === id))
  const target = fromList ?? (valid && fetched?.kind === kind && fetched.row.id === id ? fetched : null)

  const withoutEdit = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('edit')
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }, [searchParams, pathname])

  const close = useCallback(() => {
    if (openedHere.current) {
      openedHere.current = false
      router.back()
    } else {
      router.replace(withoutEdit(), { scroll: false })
    }
  }, [router, withoutEdit])

  const open = useCallback(
    (k: Kind, rowId: string) => {
      openedHere.current = true
      const params = new URLSearchParams(searchParams.toString())
      params.set('edit', `${k}:${rowId}`)
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  // A link to a row that is not on screen: look it up once
  useEffect(() => {
    if (!valid || fromList || !ready || (fetched?.kind === kind && fetched.row.id === id)) return
    let cancelled = false
    const table = kind === 'income' ? 'records' : 'expenses'
    void getEntry<AppRecord | Expense>(table, id!).then((result) => {
      if (cancelled) return
      if (result.ok && result.data) setFetched({ kind, row: result.data } as EditTarget)
      else {
        toast.info('ไม่พบรายการนี้ อาจถูกลบไปแล้ว')
        router.replace(withoutEdit(), { scroll: false })
      }
    })
    return () => {
      cancelled = true
    }
  }, [valid, fromList, ready, fetched, kind, id, toast, router, withoutEdit])

  return { target, open, close }
}
