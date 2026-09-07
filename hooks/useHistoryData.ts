import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Record as AppRecord, Expense } from '@/types'
import { TabType } from '@/components/history/constants'

export function useHistoryData(selectedYear: number, activeTab: TabType) {
  const [records, setRecords] = useState<AppRecord[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true); setError('')
      const startOfYear = new Date(selectedYear, 0, 1).toISOString()
      const endOfYear = new Date(selectedYear + 1, 0, 1).toISOString()

      const [recordsRes, expensesRes] = await Promise.all([
        supabase.from('records').select('*').gte('created_at', startOfYear).lt('created_at', endOfYear).order('created_at', { ascending: false }),
        supabase.from('expenses').select('*').gte('created_at', startOfYear).lt('created_at', endOfYear).order('created_at', { ascending: false }),
      ])
      
      const dbErrors = [recordsRes.error, expensesRes.error].filter(Boolean)
      if (dbErrors.length > 0) {
        console.error('[History] Fetch Error:', dbErrors)
        setError('ไม่สามารถโหลดข้อมูลประวัติได้บางส่วน')
      }
      
      setRecords(recordsRes.data ?? [])
      setExpenses(expensesRes.data ?? [])
    } catch (err) {
      console.error('[History] Unexpected Fetch Error:', err)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
      setRecords([]); setExpenses([])
    } finally {
      setLoading(false)
    }
  }, [selectedYear])

  useEffect(() => { fetchAllData() }, [fetchAllData])

  const handleDelete = useCallback(async (id: string, onCloseModal: () => void) => {
    try {
      setError('')
      const table = activeTab === 'income' ? 'records' : 'expenses'
      const { error } = await supabase.from(table).delete().eq('id', id)
      
      if (error) {
        console.error('[History] Delete Error:', error)
        setError('ลบข้อมูลไม่สำเร็จ: ' + error.message)
      } else { 
        onCloseModal(); fetchAllData() 
      }
    } catch (err) {
      console.error('[History] Unexpected Delete Error:', err)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    }
  }, [activeTab, fetchAllData])

  const handleSave = useCallback(async (updatedFields: Partial<AppRecord & Expense>, id: string, onCloseModal: () => void) => {
    try {
      setError('')
      const table = activeTab === 'income' ? 'records' : 'expenses'
      const updateData = activeTab === 'income'
        ? { type: updatedFields.type, plate: updatedFields.plate, price: updatedFields.price, services: updatedFields.services, customer_name: updatedFields.customer_name, payment_status: updatedFields.payment_status, created_at: updatedFields.created_at, updated_by_email: updatedFields.updated_by_email, updated_at: updatedFields.updated_at }
        : { title: updatedFields.title, amount: updatedFields.amount, note: updatedFields.note, created_at: updatedFields.created_at, updated_by_email: updatedFields.updated_by_email, updated_at: updatedFields.updated_at }
      
      const { error } = await supabase.from(table).update(updateData).eq('id', id)
      
      if (error) {
        console.error('[History] Update Error:', error)
        setError('บันทึกข้อมูลไม่สำเร็จ: ' + error.message)
      } else { 
        onCloseModal(); fetchAllData() 
      }
    } catch (err) {
      console.error('[History] Unexpected Update Error:', err)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    }
  }, [activeTab, fetchAllData])

  return { records, expenses, loading, error, setError, handleDelete, handleSave }
}
