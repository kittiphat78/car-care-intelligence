'use client'

import { useLayoutEffect, type RefObject } from 'react'

/**
 * Keeps text typed into a server-rendered form before React took over (D-08). Since the
 * pages arrive with their data (ADR-31) a search box looks ready sooner, so screens with
 * one use it too: `formRef` is any element around the fields.
 *
 * React leaves that text on screen while it hydrates, but the form's state still holds
 * what the server sent, so the next render put that back and the text vanished. Right
 * after hydration this passes each typed value to `onTyped[field id]`, so state matches
 * the screen before anything else renders.
 *
 * A field's value differs from its `defaultValue` (the server's value) only at that
 * moment: React sets both on every later render, so this never fires after that.
 */
export function useKeepEarlyTyping(
  formRef: RefObject<HTMLElement | null>,
  onTyped: Readonly<Record<string, (value: string) => void>>,
): void {
  useLayoutEffect(() => {
    formRef.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[id], textarea[id]').forEach((field) => {
      if (field.value !== field.defaultValue) onTyped[field.id]?.(field.value)
    })
    // Once: only the render that takes over the server's HTML can find typed text
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
