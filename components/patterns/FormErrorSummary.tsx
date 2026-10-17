'use client'

import { useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'

// component-specifications.md §2.2 — top of the form after a failed save: how many fields
// need fixing, each a link to its field. Takes focus when it appears so screen readers
// read it and keyboard users start from it.

export interface FormErrorSummaryProps {
  /** field id → message, in the order the fields appear */
  errors: ReadonlyArray<{ id: string; label: string; message: string }>
  /** Changes on every failed save so focus moves again */
  attempt: number
}

export function FormErrorSummary({ errors, attempt }: FormErrorSummaryProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (errors.length) ref.current?.focus()
    // Focus only when a new attempt fails, not on every keystroke that fixes a field
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  if (!errors.length) return null

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="focus-ring rounded-md border border-danger bg-danger-subtle px-4 py-3 text-danger-text"
    >
      <p className="flex items-center gap-2 text-body font-semibold">
        <Icon name="alert" />
        กรุณาแก้ไข {errors.length} ช่อง
      </p>
      <ul className="mt-1 grid gap-1 pl-7">
        {errors.map((e) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              onClick={(ev) => {
                ev.preventDefault()
                document.getElementById(e.id)?.focus()
              }}
              className="focus-ring rounded-sm text-body text-text underline underline-offset-4"
            >
              {e.label}: {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
