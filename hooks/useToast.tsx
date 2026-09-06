'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
  exiting?: boolean
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 250) // match toast-out animation duration
  }, [])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts(prev => [...prev.slice(-2), { id, message, type }]) // max 3 toasts
    setTimeout(() => removeToast(id), 3500)
  }, [removeToast])

  const value: ToastContextValue = {
    toast: addToast,
    success: useCallback((msg: string) => addToast(msg, 'success'), [addToast]),
    error: useCallback((msg: string) => addToast(msg, 'error'), [addToast]),
    info: useCallback((msg: string) => addToast(msg, 'info'), [addToast]),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast toast-${t.type} ${t.exiting ? 'toast-out' : 'toast-in'}`}
            onClick={() => removeToast(t.id)}
          >
            <span className="toast-icon text-lg leading-none" aria-hidden="true">
              {ICONS[t.type]}
            </span>
            <span className="flex-1 min-w-0">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
