import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { countVisitsByPlate } from '@/features/records/api'

export function useAuthUser() {
  const [user, setUser] = useState<{ id: string | null; email: string }>({ id: null, email: '' })
  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data, error }) => {
        if (error) console.error('[Auth] Error getting user:', error)
        setUser({ id: data.user?.id ?? null, email: data.user?.email ?? '' })
      })
      .catch(err => {
        console.error('[Auth] Unexpected error getting user:', err)
      })
  }, [])
  return user
}

export function useRecentCustomers() {
  const [savedCustomers, setSavedCustomers] = useState<string[]>([])
  useEffect(() => {
    const stored = localStorage.getItem('recentCustomers')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) { try { setSavedCustomers(JSON.parse(stored)) } catch { } }
  }, [])
  const addCustomer = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSavedCustomers(prev => {
      const updated = Array.from(new Set([trimmed, ...prev])).slice(0, 30)
      localStorage.setItem('recentCustomers', JSON.stringify(updated))
      return updated
    })
  }, [])
  return { savedCustomers, addCustomer }
}

export function useCustomerVisitCount(plate: string) {
  const [visitCount, setVisitCount] = useState(0)
  useEffect(() => {
    const checkPlate = plate.trim().toUpperCase()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (checkPlate.length < 3) { setVisitCount(0); return }
    const timer = setTimeout(async () => {
      // ล้มเหลวแบบเงียบ: แสดง 0 ครั้ง (FR-REC-06)
      const result = await countVisitsByPlate(checkPlate)
      if (!result.ok) console.error('[VisitCount] DB Error:', result.error)
      setVisitCount(result.ok ? result.data : 0)
    }, 600)
    return () => clearTimeout(timer)
  }, [plate])
  return visitCount
}
