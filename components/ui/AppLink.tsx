'use client'

import { forwardRef, type ComponentProps, type FocusEvent, type PointerEvent, type TouchEvent } from 'react'
// eslint-disable-next-line no-restricted-imports -- the one place next/link is wrapped
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { warmPageData } from '@/lib/prefetch-data'

// A link to a page of the app. Unlike next/link it does not prefetch when it comes into
// view: every prefetch is a server render that checks the session with Supabase twice,
// and Next.js sends a new round for every link on screen each time the URL changes, so
// typing in the customer search sent dozens (release-2.2.1.md). It prefetches on intent
// instead: a finger down, the pointer over it or keyboard focus, a moment before the
// click. Pages visited in the last 5 minutes open from the browser's copy anyway
// (staleTimes in next.config.ts). The page's data starts loading at the same moment
// (lib/prefetch-data.ts, speed work 3c), so it is ready or on its way when the page opens.

type Props = Omit<ComponentProps<typeof Link>, 'prefetch'>

export const AppLink = forwardRef<HTMLAnchorElement, Props>(function AppLink({ href, onPointerEnter, onPointerDown, onTouchStart, onFocus, ...rest }, ref) {
  const router = useRouter()
  const warm = () => {
    if (typeof href !== 'string') return
    router.prefetch(href)
    warmPageData(href)
  }
  return (
    <Link
      ref={ref}
      href={href}
      prefetch={false}
      onPointerEnter={(e: PointerEvent<HTMLAnchorElement>) => {
        if (e.pointerType === 'mouse') warm()
        onPointerEnter?.(e)
      }}
      onPointerDown={(e: PointerEvent<HTMLAnchorElement>) => {
        // A pen, which sends no touch events (a second warm-up joins the first)
        if (e.pointerType !== 'touch') warm()
        onPointerDown?.(e)
      }}
      onTouchStart={(e: TouchEvent<HTMLAnchorElement>) => {
        warm()
        onTouchStart?.(e)
      }}
      onFocus={(e: FocusEvent<HTMLAnchorElement>) => {
        warm()
        onFocus?.(e)
      }}
      {...rest}
    />
  )
})
