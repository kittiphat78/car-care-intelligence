'use client'

import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'

// component-specifications.md §1.5 — switches between panels of content (tablist).
// The consumer renders the panel with id={tabPanelId(idBase, value)} and
// aria-labelledby={tabId(idBase, value)}.

export const tabId = (idBase: string, value: string) => `${idBase}-tab-${value}`
export const tabPanelId = (idBase: string, value: string) => `${idBase}-panel-${value}`

export interface TabsProps<V extends string> {
  idBase: string
  label: string
  tabs: ReadonlyArray<{ value: V; label: string }>
  value: V
  onChange: (value: V) => void
  className?: string
}

export function Tabs<V extends string>({ idBase, label, tabs, value, onChange, className }: TabsProps<V>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  function onKeyDown(e: KeyboardEvent, index: number) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    let next: number | undefined
    if (step !== undefined) next = (index + step + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    if (next === undefined) return
    e.preventDefault()
    refs.current[next]?.focus()
    onChange(tabs[next].value)
  }

  return (
    <div role="tablist" aria-label={label} className={cn('grid auto-cols-fr grid-flow-col gap-1 rounded-md bg-surface-2 p-1', className)}>
      {tabs.map((tab, index) => {
        const selected = tab.value === value
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            id={tabId(idBase, tab.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={tabPanelId(idBase, tab.value)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'focus-ring min-h-11 rounded-[9px] px-3.5 text-body font-semibold transition-colors duration-150',
              selected ? 'bg-surface text-text shadow-elevation-1 outline-1 outline-border' : 'text-text-secondary hover:text-text',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
