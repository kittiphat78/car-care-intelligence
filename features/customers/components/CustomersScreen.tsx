'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/cn'
import { toUserMessage } from '@/lib/errors'
import { useMediaQuery, WIDE_SCREEN } from '@/lib/use-media-query'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { SkeletonGroup, SkeletonRow } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/patterns/EmptyState'
import { PageHeader } from '@/components/patterns/PageHeader'
import { SearchField } from '@/components/patterns/fields'
import { useCustomerDirectory } from '../hooks'
import { useUrlDialog, useUrlWith } from '@/lib/url-state'
import { setOpenedFromList } from '../memory'
import { classifyQuery, normalizePhone, primaryPhone, searchCustomers, vehicleSummary, type SearchMatch, type SearchResult } from '../logic'
import { CallActions } from './CallButton'
import { CustomerFormDialog } from './CustomerFormDialog'

// docs/features/customer-directory.md §6.1–6.2 — /customers?q=<search>&new=1|search
// One search box for name, phone and plate. The search runs in the browser and the text
// is written to the URL without a server request (ADR-23).

const SEARCH_URL_DELAY_MS = 300

/** "ตรงกับ: เบอร์ 080-000-0001" (AC-02-1..3) */
export function matchText(match: SearchMatch): string {
  if (match.field === 'name') return 'ตรงกับ: ชื่อ'
  return `ตรงกับ: ${match.field === 'phone' ? 'เบอร์' : 'ทะเบียน'} ${match.value}`
}

/** Label of the "add" button when nothing matched: the search text goes into the matching field (AC-02-5) */
function addFromSearchLabel(query: string): string {
  const q = query.trim()
  const kind = classifyQuery(q)
  if (kind === 'phone') return `เพิ่มลูกค้าใหม่ด้วยเบอร์ ${normalizePhone(q)}`
  if (kind === 'plate') return `เพิ่มลูกค้าใหม่ด้วยทะเบียน ${q.toUpperCase()}`
  return `เพิ่มลูกค้าใหม่ชื่อ ${q}`
}

export function CustomersScreen({ userId }: { userId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlWith = useUrlWith()
  const { result, customers, reload } = useCustomerDirectory()
  const form = useUrlDialog('new')
  const wide = useMediaQuery(WIDE_SCREEN)

  // Type freely; the URL follows after a short pause (fewer history calls, Safari limits them)
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const urlQuery = searchParams.get('q') ?? ''
  const leaving = useRef(false)
  useEffect(() => {
    if (query === urlQuery) return
    const timer = setTimeout(() => {
      // A late URL change while a customer page is opening would cancel that navigation
      if (!leaving.current) window.history.replaceState(null, '', urlWith({ q: query }))
    }, SEARCH_URL_DELAY_MS)
    return () => clearTimeout(timer)
  }, [query, urlQuery, urlWith])

  /** A customer is opened: write the search now (it is there on the way back) and nothing after */
  function openCustomer(e: MouseEvent<HTMLAnchorElement>) {
    // Ctrl/⌘-click opens another tab and this page stays
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (query !== urlQuery) window.history.replaceState(null, '', urlWith({ q: query }))
    leaving.current = true
    setOpenedFromList(true)
  }

  // Back on the list: a customer page opened from now on knows where it came from
  useEffect(() => setOpenedFromList(false), [])

  const results = useMemo(() => (customers ? searchCustomers(customers, query) : []), [customers, query])
  const searching = query.trim() !== ''

  return (
    <div className="grid grid-cols-1 gap-4 pb-4">
      <PageHeader
        title="ลูกค้า"
        description={customers ? `ทั้งหมด ${customers.length} ราย` : undefined}
        action={
          <Button leadingIcon="plus" onClick={() => form.open('1', { q: query })}>
            เพิ่มลูกค้า
          </Button>
        }
      />

      <SearchField id="customers-search" label="ค้นหาชื่อ เบอร์ หรือทะเบียน" placeholder="ค้นชื่อ เบอร์ หรือทะเบียน" value={query} onChange={setQuery} />

      {result === null ? (
        <Card>
          <SkeletonGroup label="กำลังโหลดรายชื่อลูกค้า…">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonRow key={i} />
            ))}
          </SkeletonGroup>
        </Card>
      ) : !result.ok ? (
        <Card>
          <ErrorState title="โหลดรายชื่อลูกค้าไม่สำเร็จ" message={toUserMessage(result.error)} onRetry={() => void reload()} />
        </Card>
      ) : (
        <>
          <p aria-live="polite" className="text-caption text-text-secondary">
            {searching ? `พบ ${results.length} ราย` : ''}
          </p>
          {result.data.length === 0 && !searching ? (
            <Card>
              <EmptyState
                icon="users"
                title="ยังไม่มีลูกค้า"
                action={
                  <Button leadingIcon="plus" onClick={() => form.open('1', { q: query })}>
                    เพิ่มลูกค้า
                  </Button>
                }
              >
                เก็บชื่อ เบอร์โทร และทะเบียนรถ เพื่อค้นหาและโทรหาได้ทันที
              </EmptyState>
            </Card>
          ) : results.length === 0 ? (
            <Card>
              <EmptyState
                icon="search"
                title={`ไม่พบ “${query.trim()}”`}
                action={
                  <Button variant="secondary" leadingIcon="plus" onClick={() => form.open('search', { q: query })}>
                    {addFromSearchLabel(query)}
                  </Button>
                }
              >
                ลองพิมพ์บางส่วนของชื่อ เบอร์ หรือทะเบียน
              </EmptyState>
            </Card>
          ) : wide ? (
            <CustomerTable results={results} onOpen={openCustomer} />
          ) : (
            <ul className="grid grid-cols-1 gap-3" aria-label="รายชื่อลูกค้า">
              {results.map((r) => (
                <li key={r.customer.id}>
                  <CustomerCard result={r} onOpen={openCustomer} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <CustomerFormDialog
        open={form.value !== null && customers !== null}
        customer={null}
        // What is in the box, not the URL: the URL follows the typing a moment later
        start={form.value === 'search' ? { query } : undefined}
        customers={customers ?? []}
        userId={userId || null}
        onClose={form.close}
        onReload={() => void reload()}
        onSaved={(saved) => {
          // The new customer's page takes the place of the dialog's history entry, so
          // back returns to the list (when the dialog was opened here)
          setOpenedFromList(form.openedByUs())
          router.replace(`/customers/${saved.id}`)
        }}
      />
    </div>
  )
}

// ── Phones and tablets: one card per customer ───────────────────────────────

function CustomerCard({ result: { customer, match }, onOpen }: { result: SearchResult; onOpen: (e: MouseEvent<HTMLAnchorElement>) => void }) {
  const phone = primaryPhone(customer)
  const cars = vehicleSummary(customer)
  return (
    <Card className="grid grid-cols-1 gap-2 p-0!">
      <Link href={`/customers/${customer.id}`} onClick={onOpen} className="focus-ring grid grid-cols-1 gap-0.5 rounded-lg px-4 pt-3 pb-1 hover:bg-surface-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-heading text-text">{customer.name}</span>
          <Icon name="chevron-right" className="text-text-tertiary" />
        </span>
        {cars.first && (
          <span className="truncate text-body text-text-secondary">
            {cars.first}
            {cars.make && ` · ${cars.make}`}
            {cars.more > 0 && ` · +${cars.more} คัน`}
          </span>
        )}
        {!phone && <span className="text-body text-text-tertiary">ยังไม่มีเบอร์</span>}
        {match && <span className="truncate text-caption font-medium text-link">{matchText(match)}</span>}
      </Link>
      {phone ? <CallActions number={phone.number} who={customer.name} className="px-4 pb-3" /> : <span className="pb-2" />}
    </Card>
  )
}

// ── Wide screens: a table ────────────────────────────────────────────────────

function CustomerTable({ results, onOpen }: { results: readonly SearchResult[]; onOpen: (e: MouseEvent<HTMLAnchorElement>) => void }) {
  const th = 'sticky top-0 bg-surface-2 px-3 py-2 text-left text-caption font-medium text-text-secondary'
  const td = 'px-3 py-3 align-middle'
  return (
    <Card className="overflow-hidden p-0!">
      <table className="w-full text-body">
        <caption className="sr-only">รายชื่อลูกค้า</caption>
        <thead>
          <tr>
            <th scope="col" className={th}>
              ชื่อ
            </th>
            <th scope="col" className={th}>
              รถ
            </th>
            <th scope="col" className={th}>
              ยี่ห้อ / รุ่น
            </th>
            <th scope="col" className={th}>
              เบอร์หลัก
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map(({ customer, match }) => {
            const phone = primaryPhone(customer)
            const cars = vehicleSummary(customer)
            return (
              <tr key={customer.id} className="border-t border-border hover:bg-surface-2">
                <td className={cn(td, 'max-w-80')}>
                  <Link
                    href={`/customers/${customer.id}`}
                    onClick={onOpen}
                    className="focus-ring rounded-sm font-semibold text-link underline-offset-4 hover:underline"
                  >
                    {customer.name}
                  </Link>
                  {match && <p className="text-caption text-text-secondary">{matchText(match)}</p>}
                </td>
                <td className={cn(td, 'text-text-secondary')}>
                  {cars.first ?? '—'}
                  {cars.more > 0 && <span className="text-caption text-text-tertiary"> +{cars.more} คัน</span>}
                </td>
                <td className={cn(td, 'text-text-secondary')}>{cars.make || '—'}</td>
                <td className={td}>
                  {phone ? (
                    <>
                      <CallActions number={phone.number} who={customer.name} />
                      {phone.label && <p className="mt-1 text-caption text-text-tertiary">{phone.label}</p>}
                    </>
                  ) : (
                    <span className="text-text-tertiary">ยังไม่มีเบอร์</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}
