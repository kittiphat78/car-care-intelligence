'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { formatBangkok } from '@/lib/time/bangkok'
import { toUserMessage } from '@/lib/errors'
import { reportAppError } from '@/lib/observability'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonClassName } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { SkeletonCard, SkeletonGroup, SkeletonText } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog'
import { EmptyState, ErrorState } from '@/components/patterns/EmptyState'
import { useOnline } from '@/components/patterns/StatusBar'
import { deleteCustomer } from '../api'
import { useCustomerDirectory, useUrlDialog } from '../hooks'
import { dropCustomer, setOpenedFromList, wasOpenedFromList } from '../memory'
import { formatPhone, primaryPhone, sortedPhones, sortedVehicles, vehicleDetails } from '../logic'
import type { Customer } from '../types'
import { CallActions } from './CallButton'
import { CustomerHistoryCard } from './CustomerHistoryCard'
import { CustomerFormDialog } from './CustomerFormDialog'

// docs/features/customer-directory.md §6.3 — /customers/<id>?edit=customer:<id>
// The id is a uuid, so no name or phone number appears in the URL or in server logs.

const stamp = (at: string) => formatBangkok(at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })

export function CustomerDetailScreen({ id }: { id: string }) {
  const router = useRouter()
  const { result, customers, fresh, reload } = useCustomerDirectory()
  const edit = useUrlDialog('edit')
  // Read once: whether "‹ ลูกค้า" can simply go back to the list with its search
  const [fromList] = useState(wasOpenedFromList)
  useEffect(() => () => setOpenedFromList(false), [])

  const customer = customers?.find((c) => c.id === id) ?? null
  const editKey = `customer:${id}`

  function backToList() {
    if (fromList) router.back()
    else router.replace('/customers')
  }

  const backLink = (
    <Link
      href="/customers"
      onClick={(e) => {
        if (!fromList) return
        e.preventDefault()
        router.back()
      }}
      className="focus-ring inline-flex min-h-11 items-center gap-1 justify-self-start rounded-md pr-2 text-body font-medium text-link"
    >
      <Icon name="chevron-left" />
      ลูกค้า
    </Link>
  )

  let body: ReactNode
  if (result === null || (!customer && !fresh)) {
    body = (
      <SkeletonGroup label="กำลังโหลดข้อมูลลูกค้า…" className="grid grid-cols-1 gap-4">
        <SkeletonText className="h-8 w-56" />
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-32" />
      </SkeletonGroup>
    )
  } else if (!result.ok) {
    body = (
      <Card>
        <ErrorState title="โหลดข้อมูลลูกค้าไม่สำเร็จ" message={toUserMessage(result.error)} onRetry={() => void reload()} />
      </Card>
    )
  } else if (!customer) {
    body = (
      <Card>
        <EmptyState
          icon="users"
          title="ไม่พบลูกค้านี้"
          action={
            <Link href="/customers" className={buttonClassName({ variant: 'secondary' })}>
              กลับรายชื่อลูกค้า
            </Link>
          }
        >
          อาจถูกลบไปแล้ว
        </EmptyState>
      </Card>
    )
  } else {
    body = <CustomerDetails customer={customer} onEdit={() => edit.open(editKey)} onDeleted={backToList} />
  }

  return (
    <div className="grid grid-cols-1 gap-4 pt-4 pb-4">
      {backLink}
      {body}
      <CustomerFormDialog
        open={edit.value === editKey && !!customer}
        customer={customer}
        customers={customers ?? []}
        userId={null}
        onClose={edit.close}
        onReload={() => void reload()}
        onSaved={() => {
          edit.close()
          void reload()
        }}
      />
    </div>
  )
}

function CustomerDetails({ customer, onEdit, onDeleted }: { customer: Customer; onEdit: () => void; onDeleted: () => void }) {
  const toast = useToast()
  const online = useOnline()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const phones = sortedPhones(customer)
  const vehicles = sortedVehicles(customer)
  const mainId = primaryPhone(customer)?.id

  async function remove() {
    setDeleting(true)
    const result = await deleteCustomer(customer.id)
    if (result.ok || result.error.code === 'NOT_FOUND') {
      dropCustomer(customer.id)
      setConfirmDelete(false)
      if (result.ok) toast.success(`ลบ ${customer.name} แล้ว`)
      else toast.info('ลูกค้านี้ถูกลบไปแล้ว')
      onDeleted()
      return
    }
    setDeleting(false)
    setConfirmDelete(false)
    reportAppError(result.error)
    toast.error(`ลบไม่สำเร็จ ${toUserMessage(result.error)}`)
  }

  const counts = [phones.length ? `เบอร์ ${phones.length} เบอร์` : null, vehicles.length ? `รถ ${vehicles.length} คัน` : null].filter(Boolean).join(' · ')

  return (
    <>
      <h1 className="text-title break-words text-text">{customer.name}</h1>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* Contact and cars on the left, history on the right (wide screens) */}
        <div className="grid grid-cols-1 gap-4">
          <Card as="section" aria-labelledby="customer-phones" className="grid grid-cols-1 gap-3">
            <h2 id="customer-phones" className="text-subheading text-text">
              เบอร์โทร
            </h2>
            {phones.length === 0 ? (
              <p className="text-body text-text-tertiary">ยังไม่มีเบอร์</p>
            ) : (
              <ul className="-mx-1 grid grid-cols-1 divide-y divide-border">
                {phones.map((p) => (
                  <li key={p.id} className="grid grid-cols-1 gap-2 px-1 py-3 first:pt-0 last:pb-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-body-lg font-semibold text-text tabular-nums select-all">{formatPhone(p.number)}</span>
                      {p.label && <span className="text-body text-text-secondary">{p.label}</span>}
                      {p.id === mainId && phones.length > 1 && <Badge tone="info">เบอร์หลัก</Badge>}
                    </p>
                    <CallActions number={p.number} who={customer.name} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card as="section" aria-labelledby="customer-vehicles" className="grid grid-cols-1 gap-3">
            <h2 id="customer-vehicles" className="text-subheading text-text">
              รถ
            </h2>
            {vehicles.length === 0 ? (
              <p className="text-body text-text-tertiary">ยังไม่มีรถ</p>
            ) : (
              <ul className="-mx-1 grid grid-cols-1 divide-y divide-border">
                {vehicles.map((v) => (
                  <li key={v.id} className="grid grid-cols-1 gap-0.5 px-1 py-3 first:pt-0 last:pb-0">
                    <span className="flex items-center gap-2 text-body-lg font-semibold text-text">
                      <Icon name="car" className="text-text-tertiary" />
                      {v.plate}
                    </span>
                    {vehicleDetails(v) && <span className="text-body text-text-secondary">{vehicleDetails(v)}</span>}
                    {v.note && <span className="text-caption text-text-tertiary">{v.note}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {customer.note && (
            <Card as="section" aria-labelledby="customer-note" className="grid grid-cols-1 gap-1">
              <h2 id="customer-note" className="text-subheading text-text">
                หมายเหตุ
              </h2>
              <p className="text-body break-words whitespace-pre-line text-text">{customer.note}</p>
            </Card>
          )}
        </div>
        <CustomerHistoryCard customerId={customer.id} refreshKey={customer.updated_at ?? ''} />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md bg-surface-2 px-3 py-2 text-caption">
        <dt className="text-text-tertiary">เพิ่มโดย</dt>
        <dd className="min-w-0 break-all text-text-secondary">
          {customer.created_by_email || '—'} · {stamp(customer.created_at)}
        </dd>
        {customer.updated_at && (
          <>
            <dt className="text-text-tertiary">แก้ไขล่าสุด</dt>
            <dd className="min-w-0 break-all text-text-secondary">
              {customer.updated_by_email || '—'} · {stamp(customer.updated_at)}
            </dd>
          </>
        )}
      </dl>

      {/* Delete sits apart from the main action (design §6.3) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button leadingIcon="pencil" onClick={onEdit}>
          แก้ไข
        </Button>
        <Button variant="danger-ghost" leadingIcon="trash" disabled={!online} onClick={() => setConfirmDelete(true)}>
          ลบลูกค้า
        </Button>
      </div>
      {!online && <p className="text-caption text-text-tertiary">แก้ไขและลบต้องเชื่อมต่ออินเทอร์เน็ต</p>}

      <ConfirmDialog
        open={confirmDelete}
        title={`ลบ ${customer.name}?`}
        confirmLabel="ลบลูกค้า"
        confirmVariant="danger"
        isLoading={deleting}
        loadingText="กำลังลบ…"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
      >
        {counts && <p>{counts} จะถูกลบด้วย</p>}
        <p>ประวัติการล้างรถไม่ถูกลบ</p>
      </ConfirmDialog>
    </>
  )
}
