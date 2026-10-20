import type { KeyboardEvent } from 'react'

/**
 * Enter in a field moves to the next field instead of saving (interaction-specifications
 * §2: "Enter ในช่องสุดท้ายไม่ submit อัตโนมัติ"). Without this the browser presses the
 * form's first submit button and saves by accident (on /add that is "บันทึกแล้วทำต่อ").
 * Use as the form's onKeyDown.
 */
export function enterMovesToNextField(e: KeyboardEvent<HTMLFormElement>) {
  const field = e.target as HTMLElement
  if (e.key !== 'Enter' || !(field instanceof HTMLInputElement) || e.nativeEvent.isComposing) return
  e.preventDefault()
  const focusable = [...e.currentTarget.querySelectorAll<HTMLElement>('input, button, select, textarea, [tabindex="0"]')].filter(
    (el) => !el.hasAttribute('disabled') && el.tabIndex >= 0 && !el.closest('[hidden], [aria-hidden="true"]'),
  )
  focusable[focusable.indexOf(field) + 1]?.focus()
}
