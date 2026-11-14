'use client'

import { useLinkStatus } from 'next/link'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from '@/components/ui/Icon'

// Feedback on the tap itself, before the page answers: the tapped tab lights up and
// pulses while Next.js loads it (useLinkStatus; must sit inside the <Link>). A tab
// opened in the last 5 minutes opens from the browser's copy, so it never pends.

/** Icon of a bottom-bar tab */
export function TabIcon({ icon, active, primary = false }: { icon: IconName; active: boolean; primary?: boolean }) {
  const { pending } = useLinkStatus()
  if (primary) {
    // Inside the bar, not raised above it: a raised button covered the save buttons on
    // /add and the content while scrolling
    return (
      <span className={cn('grid size-10 place-items-center rounded-full bg-primary text-on-primary', pending && 'motion-safe:animate-pulse')}>
        <Icon name={icon} size="lg" />
      </span>
    )
  }
  return (
    <span
      className={cn(
        'grid h-7 w-13 max-w-full place-items-center rounded-full transition-colors duration-150',
        (active || pending) && 'bg-primary-subtle',
        pending && 'motion-safe:animate-pulse',
      )}
    >
      <Icon name={icon} size="lg" />
    </span>
  )
}

/** A dot after the label of a side-menu item, shown while its page loads (fixed size: nothing moves) */
export function PendingDot() {
  const { pending } = useLinkStatus()
  return <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full bg-link transition-opacity duration-150', pending ? 'opacity-100 motion-safe:animate-pulse' : 'opacity-0')} />
}
