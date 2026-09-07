import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

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
      try {
        const { count, error } = await supabase
          .from('records').select('*', { count: 'exact', head: true }).eq('plate', checkPlate)
        if (error) {
          console.error('[VisitCount] DB Error:', error)
        }
        setVisitCount(count ?? 0)
      } catch (err) {
        console.error('[VisitCount] Unexpected Error:', err)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [plate])
  return visitCount
}
