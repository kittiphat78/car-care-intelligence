'use client'

import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { cn } from '@/lib/cn'
import { IconButton } from './Button'

// component-specifications.md §1.8 · interaction-specifications.md §3
// Built on the native <dialog> (ADR-14): showModal() makes the rest of the page inert,
// which traps focus and hides it from assistive tech without a library.

export type DialogVariant = 'sheet' | 'modal' | 'alert'

export interface DialogProps {
  open: boolean
  /** Called for Esc, the close button and (except alert) a tap outside */
  onClose: () => void
  title: ReactNode
  children: ReactNode
  /** Buttons pinned to the bottom of the dialog */
  footer?: ReactNode
  /**
   * sheet: bottom sheet on phones, centred from 600px (default)
   * modal: centred on every size
   * alert: centred, 400px, role="alertdialog", no tap-outside close (confirmations)
   */
  variant?: DialogVariant
  /** md = 480px, lg = 560px (edit record) */
  size?: 'md' | 'lg'
  /** Element focused when the dialog opens, e.g. the safe "ยกเลิก" button */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** Accessible name of the close button */
  closeLabel?: string
  /** Short text read with the title (alert dialogs) */
  description?: ReactNode
  className?: string
}

const PANEL: Record<DialogVariant, string> = {
  sheet:
    'inset-x-0 bottom-0 max-h-[90dvh] rounded-t-xl animate-sheet-in md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-h-[85dvh] md:rounded-xl md:animate-dialog-in',
  modal:
    'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[85dvh] w-[calc(100%-2rem)] rounded-xl animate-dialog-in',
  alert:
    'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[85dvh] w-[calc(100%-2rem)] max-w-100 rounded-xl animate-dialog-in',
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  variant = 'sheet',
  size = 'md',
  initialFocusRef,
  closeLabel = 'ปิด',
  description,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      returnFocusTo.current = document.activeElement as HTMLElement | null
      dialog.showModal()
      initialFocusRef?.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, initialFocusRef])

  // Give focus back to whatever opened the dialog, also when it unmounts while open
  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
    return () => {
      if (dialog.open) dialog.close()
      returnFocusTo.current?.focus?.()
      returnFocusTo.current = null
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      role={variant === 'alert' ? 'alertdialog' : undefined}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Esc: let the parent decide (it owns `open`), instead of the browser closing it
      onCancel={(e) => {
        e.preventDefault()
        onCloseRef.current()
      }}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden bg-transparent p-0 text-text backdrop:bg-transparent"
    >
      {open && (
        <>
          <div
            aria-hidden="true"
            data-testid="dialog-overlay"
            className="absolute inset-0 bg-overlay animate-fade-in"
            onClick={variant === 'alert' ? undefined : () => onCloseRef.current()}
          />
          <div
            className={cn(
              'absolute flex flex-col bg-surface shadow-elevation-3',
              variant !== 'alert' && (size === 'md' ? 'md:w-120' : 'md:w-140'),
              variant === 'modal' && (size === 'md' ? 'max-w-120' : 'max-w-140'),
              'motion-reduce:animate-fade-in',
              PANEL[variant],
              className,
            )}
          >
            {variant === 'sheet' && (
              <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong md:hidden" />
            )}
            <header className="flex shrink-0 items-start gap-2 px-5 pt-4 pb-2">
              <h2 id={titleId} className="min-w-0 flex-1 pt-2 text-heading text-text">
                {title}
              </h2>
              {variant !== 'alert' && <IconButton icon="x" aria-label={closeLabel} onClick={() => onCloseRef.current()} className="-mr-2" />}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
              {description && (
                <p id={descriptionId} className="mb-3 text-body text-text-secondary">
                  {description}
                </p>
              )}
              {children}
            </div>
            {footer && (
              <footer className="flex shrink-0 gap-3 border-t border-border px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] *:flex-1">
                {footer}
              </footer>
            )}
          </div>
        </>
      )}
    </dialog>
  )
}
