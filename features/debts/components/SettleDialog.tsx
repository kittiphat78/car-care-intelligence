'use client'

import { useRef } from 'react'
import { reportAppError } from '@/lib/observability'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useToast, type ToastApi } from '@/components/ui/Toast'
import { sendChange } from '@/features/records/outbox'
import { settleRecords } from '../api'
import { platePreview, settleOutcome, type DebtGroup } from '../logic'

// screen-specifications.md §9 · user-flows UF-DEBT-02. Settles exactly the jobs on
// screen (M007): a job paid or changed elsewhere meanwhile is skipped, and the message
// says so instead of claiming everything was cleared. "เคลียร์ยอด" closes the dialog at
// once and goes on behind (ADR-30): the card leaves straight away and comes back if the
// database says no.

const baht = (n: number) => `฿${n.toLocaleString('en-US')}`

export function SettleDialog({
  group,
  onClose,
  onSettled,
}: {
  group: DebtGroup | null
  onClose: () => void
  /** Reload the list (and the nav badge) after anything was cleared */
  onSettled: () => void
}) {
  if (!group) return null
  return <SettleBody key={group.key} group={group} onClose={onClose} onSettled={onSettled} />
}

/** "เคลียร์ยอด" on its way; a failure brings the debt back and offers to try again */
export function sendSettle(group: DebtGroup, toast: ToastApi, onSettled: () => void): void {
  const count = group.items.length
  sendChange({ kind: 'settle', table: 'records', before: group.items }, () => settleRecords(group.items.map((r) => r.id)), {
    onSent: ({ updatedCount, total }) => {
      const outcome = settleOutcome(count, updatedCount)
      if (outcome === 'all') toast.success(`เคลียร์ยอด ${group.name} ${baht(total)} แล้ว`)
      else if (outcome === 'some')
        toast.info(`เคลียร์ยอดได้ ${updatedCount} จาก ${count} รายการ (${baht(total)}) รายการที่เหลือถูกเคลียร์หรือแก้ไขจากเครื่องอื่นแล้ว`)
      else toast.error('ไม่มีรายการที่เคลียร์ได้ รายการถูกเคลียร์หรือแก้ไขจากเครื่องอื่นแล้ว กรุณาตรวจรายการอีกครั้ง')
      onSettled()
    },
    onFailed: (error) => {
      reportAppError(error)
      toast.error(`เคลียร์ยอด ${group.name} ไม่สำเร็จ ยอดค้างกลับมาแล้ว`, { action: { label: 'ลองอีกครั้ง', onClick: () => sendSettle(group, toast, onSettled) } })
    },
  })
}

function SettleBody({ group, onClose, onSettled }: { group: DebtGroup; onClose: () => void; onSettled: () => void }) {
  const toast = useToast()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const { plates, more } = platePreview(group.items)
  const count = group.items.length

  function settle() {
    sendSettle(group, toast, onSettled)
    onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      variant="alert"
      title={`เคลียร์ยอด ${group.name}?`}
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button variant="success" onClick={settle}>
            เคลียร์ยอด
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 text-body">
        <dl className="grid grid-cols-2 gap-y-1">
          <dt className="text-text-secondary">จำนวน</dt>
          <dd className="text-right font-semibold text-text tabular-nums">{count} คัน</dd>
          <dt className="text-text-secondary">ยอดรวม</dt>
          <dd className="text-right text-heading text-unpaid tabular-nums">{baht(group.total)}</dd>
        </dl>
        <p className="text-caption text-text-secondary">
          {plates.join(', ')}
          {more > 0 && ` และอีก ${more} คัน`}
        </p>
        <p className="text-text-secondary">ทุกรายการจะเปลี่ยนเป็น “ชำระแล้ว”</p>
      </div>
    </Dialog>
  )
}
