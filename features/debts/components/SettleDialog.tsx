'use client'

import { useRef, useState } from 'react'
import { toUserMessage } from '@/lib/errors'
import { reportAppError } from '@/lib/observability'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { settleRecords } from '../api'
import { platePreview, settleOutcome, type DebtGroup } from '../logic'

// screen-specifications.md §9 · user-flows UF-DEBT-02. Settles exactly the jobs on
// screen (M007): a job paid or changed elsewhere meanwhile is skipped, and the dialog
// says so instead of claiming everything was cleared.

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

function SettleBody({ group, onClose, onSettled }: { group: DebtGroup; onClose: () => void; onSettled: () => void }) {
  const toast = useToast()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<{ tone: 'warning' | 'danger'; title: string; text: string } | null>(null)
  const { plates, more } = platePreview(group.items)
  const count = group.items.length

  async function settle() {
    setBusy(true)
    setProblem(null)
    const result = await settleRecords(group.items.map((r) => r.id))
    setBusy(false)
    if (!result.ok) {
      reportAppError(result.error)
      setProblem({ tone: 'danger', title: 'เคลียร์ยอดไม่สำเร็จ ยอดยังไม่เปลี่ยน', text: toUserMessage(result.error) })
      return
    }
    const { updatedCount, total } = result.data
    const outcome = settleOutcome(count, updatedCount)
    if (outcome !== 'none') onSettled()
    if (outcome === 'all') {
      toast.success(`เคลียร์ยอด ${group.name} ${baht(total)} แล้ว`)
      onClose()
    } else {
      setProblem({
        tone: outcome === 'some' ? 'warning' : 'danger',
        title: outcome === 'some' ? `เคลียร์ยอดได้ ${updatedCount} จาก ${count} รายการ (${baht(total)})` : 'ไม่มีรายการที่เคลียร์ได้',
        text: 'รายการที่เหลือถูกเคลียร์หรือแก้ไขจากเครื่องอื่นแล้ว กรุณาตรวจรายการอีกครั้ง',
      })
    }
  }

  return (
    <Dialog
      open
      onClose={busy ? () => {} : onClose}
      variant="alert"
      title={`เคลียร์ยอด ${group.name}?`}
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={busy}>
            {problem ? 'ปิด' : 'ยกเลิก'}
          </Button>
          {!problem && (
            <Button variant="success" onClick={settle} isLoading={busy} loadingText="กำลังเคลียร์ยอด…">
              เคลียร์ยอด
            </Button>
          )}
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
        {problem && (
          <Banner tone={problem.tone} title={problem.title}>
            {problem.text}
          </Banner>
        )}
      </div>
    </Dialog>
  )
}
