'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from './Icon'

// component-specifications.md §1.9 · interaction-specifications.md §3.1
// success/info: 5 s, paused while hovered or focused · error: stays until closed

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  /** One button, e.g. "ลองอีกครั้ง" */
  action?: ToastAction
}

interface ToastItem extends ToastOptions {
  id: number
  tone: ToastTone
  message: string
}

export interface ToastApi {
  show: (message: string, tone?: ToastTone, options?: ToastOptions) => number
  success: (message: string, options?: ToastOptions) => number
  error: (message: string, options?: ToastOptions) => number
  info: (message: string, options?: ToastOptions) => number
  dismiss: (id: number) => void
}

export const TOAST_DURATION_MS = 5000
const MAX_TOASTS = 3

const ICONS: Record<ToastTone, IconName> = { success: 'check-circle', error: 'alert', info: 'info' }

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((message: string, tone: ToastTone = 'info', options: ToastOptions = {}) => {
    const id = nextId.current++
    // Newest last, so it sits nearest the bottom edge; the oldest drops off past 3
    setToasts((list) => [...list, { id, tone, message, ...options }].slice(-MAX_TOASTS))
    return id
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      show,
      dismiss,
      success: (message, options) => show(message, 'success', options),
      error: (message, options) => show(message, 'error', options),
      info: (message, options) => show(message, 'info', options),
    }),
    [show, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <section
        aria-label="การแจ้งเตือน"
        className={cn(
          'pointer-events-none fixed inset-x-(--page-gutter) z-60 flex flex-col items-center gap-2',
          // Above the bottom nav / action bar on phones, bottom-right on wide screens
          'bottom-[calc(var(--toast-offset,var(--size-nav-bottom))+1rem)] lg:inset-x-auto lg:right-8 lg:bottom-8 lg:items-end',
        )}
      >
        {toasts.map((toast) => (
          <ToastView key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </section>
    </ToastContext.Provider>
  )
}

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false)
  const remaining = useRef(TOAST_DURATION_MS)
  const autoClose = toast.tone !== 'error'

  useEffect(() => {
    if (!autoClose || paused) return
    const startedAt = Date.now()
    const timer = setTimeout(onDismiss, remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current -= Date.now() - startedAt
    }
  }, [autoClose, paused, onDismiss])

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      data-tone={toast.tone}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false)
      }}
      className="pointer-events-auto flex w-full max-w-110 items-center gap-3 rounded-md bg-surface-inverse py-2 pr-2 pl-4 text-body text-text-inverse shadow-elevation-3 animate-toast-in motion-reduce:animate-fade-in"
    >
      <Icon name={ICONS[toast.tone]} />
      <p className="min-w-0 flex-1 py-1">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick()
            onDismiss()
          }}
          className="focus-ring min-h-11 shrink-0 rounded-md px-3 font-semibold underline underline-offset-4"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="ปิดการแจ้งเตือน"
        onClick={onDismiss}
        className="focus-ring grid size-11 shrink-0 place-items-center rounded-md"
      >
        <Icon name="x" />
      </button>
    </div>
  )
}
