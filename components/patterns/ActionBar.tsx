import type { ReactNode } from 'react'

// component-specifications.md §2.4 — save buttons pinned above the bottom nav on phones,
// a normal row at the end of the form on wide screens. `data-action-bar` lifts toasts
// above it (globals.css). On a short screen (phone on its side, large text) the bottom nav
// steps aside (globals.css), so the bar sits at the bottom edge and is one slim row: less
// padding, 48px buttons, and the safe area kept clear (Phase A H3).

export function ActionBar({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div
      data-action-bar
      className="sticky bottom-(--size-nav-bottom) z-10 -mx-(--page-gutter) mt-2 border-t glass-float px-(--page-gutter) pt-3 pb-3 shadow-elevation-2 short:pt-2 short:pb-[max(0.5rem,env(safe-area-inset-bottom))] short:[&_button]:min-h-12 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:shadow-none lg:[-webkit-backdrop-filter:none] lg:[backdrop-filter:none]"
    >
      {note && <div className="mb-2">{note}</div>}
      {/* Secondary sizes to its label (never wraps), primary takes the rest. On a screen
          too narrow for both (320px, WCAG 1.4.10) the primary moves to its own full-width
          line instead of running off the edge (Step 09 A-02) */}
      <div className="flex flex-wrap gap-3 *:whitespace-nowrap *:last:grow">{children}</div>
    </div>
  )
}
