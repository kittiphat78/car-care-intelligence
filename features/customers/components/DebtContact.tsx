'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Button, buttonClassName } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Icon } from '@/components/ui/Icon'
import { matchDebtGroup, primaryPhone } from '../logic'
import type { Customer } from '../types'
import { CallActions, CallLink } from './CallButton'

// docs/features/customer-directory.md §6.5 (US-10) — how to reach the customer of a debt
// card. Records have no customer id (ADR-21): the card is matched to the directory by
// its plates, then its name.

export interface DebtContactProps {
  /** The name on the card; null for "ลูกค้าทั่วไป" (matched by plates only) */
  name: string | null
  plates: readonly string[]
  /** The directory; null while it loads or when it failed (then nothing is shown) */
  customers: readonly Customer[] | null
  /** No customer found: add one from this card */
  onAdd: () => void
}

export function DebtContact({ name, plates, customers, onAdd }: DebtContactProps) {
  const [picking, setPicking] = useState(false)
  const matches = useMemo(() => (customers ? matchDebtGroup(customers, { name, plates }) : []), [customers, name, plates])
  if (!customers) return null

  // Not in the directory yet (AC-10-3); the unnamed group has nobody to add
  if (matches.length === 0) {
    return name ? (
      <Button variant="secondary" leadingIcon="plus" onClick={onAdd} aria-label={`เพิ่มเบอร์ ${name}`}>
        เพิ่มเบอร์
      </Button>
    ) : null
  }

  // One customer (AC-10-1)
  if (matches.length === 1) {
    const customer = matches[0]
    const phone = primaryPhone(customer)
    const other = customer.name !== name
    return (
      <div className="grid grid-cols-1 gap-1">
        {phone ? (
          <CallLink number={phone.number} who={customer.name} className="w-full" />
        ) : (
          <Link
            href={`/customers/${customer.id}?edit=customer:${customer.id}`}
            aria-label={`เพิ่มเบอร์ ${customer.name}`}
            className={buttonClassName({ variant: 'secondary', size: 'sm', fullWidth: true })}
          >
            <Icon name="plus" />
            เพิ่มเบอร์
          </Link>
        )}
        {/* Who is called, when the directory knows the car under another name */}
        {other && (
          <p className="text-caption text-text-secondary">
            ในสมุดลูกค้า: <Link href={`/customers/${customer.id}`} className="focus-ring rounded-sm text-link underline underline-offset-4">{customer.name}</Link>
          </p>
        )}
      </div>
    )
  }

  // Several (a plate typed as digits only, or the same car under two names): the user picks (AC-10-2)
  return (
    <>
      <Button variant="secondary" leadingIcon="phone" onClick={() => setPicking(true)} aria-label={`โทร… (${matches.length} ราย)${name ? ` ${name}` : ''}`}>
        โทร… ({matches.length} ราย)
      </Button>
      <Dialog open={picking} onClose={() => setPicking(false)} title={name ? `โทรหา ${name}` : 'โทรหาลูกค้า'} description="ทะเบียนหรือชื่อนี้ตรงกับลูกค้าหลายคนในสมุด เลือกคนที่ต้องการ">
        <ul className="grid grid-cols-1 divide-y divide-border">
          {matches.map((c) => {
            const phone = primaryPhone(c)
            return (
              <li key={c.id} className="grid grid-cols-1 gap-2 py-3">
                <Link href={`/customers/${c.id}`} className="focus-ring justify-self-start rounded-sm text-body font-semibold text-link underline-offset-4 hover:underline">
                  {c.name}
                </Link>
                {phone ? <CallActions number={phone.number} who={c.name} /> : <p className="text-body text-text-tertiary">ยังไม่มีเบอร์</p>}
              </li>
            )
          })}
        </ul>
      </Dialog>
    </>
  )
}
