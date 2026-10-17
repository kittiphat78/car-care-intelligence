'use client'

import { useRef, type ReactNode } from 'react'
import { Button, type ButtonVariant } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'

// component-specifications.md §2.7 — alert dialog: question, what it affects, and two
// buttons. The safe choice is focused first (interaction-specifications.md §3.2).

export interface ConfirmDialogProps {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel: string
  confirmVariant?: ButtonVariant
  cancelLabel?: string
  /** Which button gets focus when the dialog opens */
  focus?: 'cancel' | 'confirm'
  isLoading?: boolean
  loadingText?: string
  onConfirm: () => void
  /** Cancel, Esc */
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  confirmVariant = 'primary',
  cancelLabel = 'ยกเลิก',
  focus = 'cancel',
  isLoading,
  loadingText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog
      open={open}
      onClose={isLoading ? () => {} : onCancel}
      variant="alert"
      title={title}
      initialFocusRef={focus === 'cancel' ? cancelRef : confirmRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button ref={confirmRef} variant={confirmVariant} onClick={onConfirm} isLoading={isLoading} loadingText={loadingText}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children && <div className="grid grid-cols-1 gap-2 text-body text-text-secondary">{children}</div>}
    </Dialog>
  )
}
