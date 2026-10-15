import { useState, useCallback, useEffect } from 'react'
import { Record as AppRecord, Expense } from '@/types'
import { TabType } from '@/components/history/constants'
import { loadYear } from '@/features/history/api'
import { deleteEntry, updateEntry, type EntryPatch } from '@/features/records/api'
import { toUserMessage } from '@/lib/errors'
import { reportAppError } from '@/lib/observability'

export function useHistoryData(selectedYear: number, activeTab: TabType) {
  const [records, setRecords] = useState<AppRecord[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true); setError('')
      const result = await loadYear(selectedYear)

      const failure = [result.records, result.expenses].find(r => !r.ok)
      if (failure && !failure.ok) {
        console.error('[History] Fetch Error:', failure.error)
        reportAppError(failure.error)
        setError(`ไม่สามารถโหลดข้อมูลประวัติได้บางส่วน: ${toUserMessage(failure.error)}`)
      }

      setRecords(result.records.ok ? result.records.data : [])
      setExpenses(result.expenses.ok ? result.expenses.data : [])
    } finally {
      setLoading(false)
    }
  }, [selectedYear])

  useEffect(() => { fetchAllData() }, [fetchAllData])

  const handleDelete = useCallback(async (id: string, onCloseModal: () => void) => {
    setError('')
    const table = activeTab === 'income' ? 'records' : 'expenses'
    const result = await deleteEntry(table, id)

    if (!result.ok) {
      console.error('[History] Delete Error:', result.error)
      reportAppError(result.error)
      setError('ลบข้อมูลไม่สำเร็จ: ' + toUserMessage(result.error))
    } else {
      onCloseModal(); fetchAllData()
    }
  }, [activeTab, fetchAllData])

  /**
   * Save only the changed fields of `item`, and only if nobody edited it meanwhile.
   * Returns null on success (dialog closes) or a message for the dialog to show.
   */
  const handleSave = useCallback(async (patch: EntryPatch, item: AppRecord | Expense, onCloseModal: () => void): Promise<string | null> => {
    setError('')
    if (Object.keys(patch).length === 0) { onCloseModal(); return null }

    const table = activeTab === 'income' ? 'records' : 'expenses'
    const result = await updateEntry(table, item.id, patch, item.updated_at)

    if (!result.ok) {
      console.error('[History] Update Error:', result.error)
      reportAppError(result.error)
      // แก้ชนกับเครื่องอื่นหรือรายการถูกลบ: โหลดรายการใหม่ให้เห็นข้อมูลล่าสุด
      if (result.error.code === 'CONFLICT' || result.error.code === 'NOT_FOUND') fetchAllData()
      return 'บันทึกไม่สำเร็จ: ' + toUserMessage(result.error)
    }
    onCloseModal(); fetchAllData()
    return null
  }, [activeTab, fetchAllData])

  return { records, expenses, loading, error, setError, handleDelete, handleSave }
}
