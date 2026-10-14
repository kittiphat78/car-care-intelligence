import { useState, useCallback, useEffect } from 'react'
import { Record as AppRecord, Expense } from '@/types'
import { TabType } from '@/components/history/constants'
import { loadYear } from '@/features/history/api'
import { deleteEntry, updateEntry } from '@/features/records/api'
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

  const handleSave = useCallback(async (updatedFields: Partial<AppRecord & Expense>, id: string, onCloseModal: () => void) => {
    setError('')
    const table = activeTab === 'income' ? 'records' : 'expenses'
    const updateData = activeTab === 'income'
      ? { type: updatedFields.type, plate: updatedFields.plate, price: updatedFields.price, services: updatedFields.services, customer_name: updatedFields.customer_name, payment_status: updatedFields.payment_status, created_at: updatedFields.created_at, updated_by_email: updatedFields.updated_by_email, updated_at: updatedFields.updated_at }
      : { title: updatedFields.title, amount: updatedFields.amount, note: updatedFields.note, created_at: updatedFields.created_at, updated_by_email: updatedFields.updated_by_email, updated_at: updatedFields.updated_at }

    const result = await updateEntry(table, id, updateData)

    if (!result.ok) {
      console.error('[History] Update Error:', result.error)
      reportAppError(result.error)
      setError('บันทึกข้อมูลไม่สำเร็จ: ' + toUserMessage(result.error))
    } else {
      onCloseModal(); fetchAllData()
    }
  }, [activeTab, fetchAllData])

  return { records, expenses, loading, error, setError, handleDelete, handleSave }
}
