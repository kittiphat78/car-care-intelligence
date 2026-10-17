'use client'

import { useRef, useState } from 'react'
import { toAppError, toUserMessage } from '@/lib/errors'
import { reportAppError } from '@/lib/observability'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { ChoiceGroup } from '@/components/ui/ChoiceGroup'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { MonthYearPicker } from '@/components/patterns/fields'
import { useOnline } from '@/components/patterns/StatusBar'
import type { Expense, Record as AppRecord } from '@/types'
import { loadExportRange } from '../api'
import { countInRange, exportFileName, exportRangeError, type ExportMode, type MonthRef } from '../logic'

// screen-specifications.md §10 · user-flows UF-EXP-01. The file is built only from
// complete data: if either side fails to load, no file is made (ER-07).

const MODES: ReadonlyArray<{ value: ExportMode; label: string; hint: string }> = [
  { value: 'bank', label: 'ฉบับธนาคาร', hint: 'สรุปรายรับและรายจ่ายสำหรับยื่นธนาคาร' },
  { value: 'internal', label: 'ฉบับภายใน', hint: 'รายงานสรุปภาพรวมพร้อมข้อมูลดิบ สำหรับใช้ในร้าน' },
]

export interface ExportDialogProps {
  open: boolean
  onClose: () => void
  defaultMonth: MonthRef
  years: readonly number[]
  /** The year already on screen, used to count rows without another download */
  loaded: { year: number; records: readonly AppRecord[]; expenses: readonly Expense[] } | null
}

export function ExportDialog(props: ExportDialogProps) {
  if (!props.open) return null
  return <ExportBody {...props} />
}

function ExportBody({ onClose, defaultMonth, years, loaded }: ExportDialogProps) {
  const toast = useToast()
  const online = useOnline()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [mode, setMode] = useState<ExportMode>('bank')
  const [from, setFrom] = useState<MonthRef>(defaultMonth)
  const [to, setTo] = useState<MonthRef>(defaultMonth)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<{ tone: 'info' | 'danger'; title: string; text?: string } | null>(null)

  const rangeError = exportRangeError(from, to)
  const count = loaded ? countInRange(loaded.records, loaded.expenses, loaded.year, from, to) : null

  async function download() {
    setBusy(true)
    setProblem(null)
    const result = await loadExportRange(from.year, from.month, to.year, to.month)
    if (!result.ok) {
      reportAppError(result.error)
      setBusy(false)
      setProblem({ tone: 'danger', title: 'ส่งออกไม่สำเร็จ ลองอีกครั้ง', text: toUserMessage(result.error) })
      return
    }
    const { records, expenses } = result.data
    const total = records.length + expenses.length
    if (total === 0) {
      setBusy(false)
      setProblem({ tone: 'info', title: 'ไม่มีข้อมูลในช่วงที่เลือก' })
      return
    }
    try {
      const { exportToExcel } = await import('@/lib/export')
      await exportToExcel({ records, expenses }, exportFileName(mode, from, to), mode)
      toast.success(`ส่งออก ${total.toLocaleString('en-US')} รายการแล้ว`)
      onClose()
    } catch (e) {
      const error = toAppError(e)
      reportAppError(error)
      setProblem({ tone: 'danger', title: 'สร้างไฟล์ไม่สำเร็จ ลองอีกครั้ง', text: toUserMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onClose={busy ? () => {} : onClose}
      title="ส่งออก Excel"
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={busy}>
            ยกเลิก
          </Button>
          <Button leadingIcon="download" onClick={download} disabled={!!rangeError || !online} isLoading={busy} loadingText="กำลังเตรียมไฟล์…">
            {online ? 'ดาวน์โหลด Excel' : 'รอเชื่อมต่อ'}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 pb-2">
        <div className="grid gap-2">
          <ChoiceGroup label="แบบไฟล์" columns={2} value={mode} onChange={(v) => v && setMode(v)} options={MODES} />
          <p className="text-caption text-text-secondary">{MODES.find((m) => m.value === mode)!.hint}</p>
        </div>
        <MonthYearPicker id="export-from" label="ตั้งแต่" month={from.month} year={from.year} years={years} onChange={setFrom} />
        <MonthYearPicker id="export-to" label="ถึง" month={to.month} year={to.year} years={years} onChange={setTo} error={rangeError} />
        {count !== null && <p className="text-body text-text-secondary">พบ {count.toLocaleString('en-US')} รายการ</p>}
        {problem && (
          <Banner tone={problem.tone} title={problem.title}>
            {problem.text}
          </Banner>
        )}
      </div>
    </Dialog>
  )
}
