import { Suspense, type ReactNode } from 'react'
import { StatusBar } from '@/components/patterns/StatusBar'
import { BottomNav } from './BottomNav'
import { SideNav } from './SideNav'

// screen-specifications.md §0 — frame of every signed-in page: skip link, status bar,
// BottomNav (< 1024px) or SideNav (≥ 1024px), and <main id="main">.

export interface AppShellProps {
  children: ReactNode
  email: string
  /** Dialogs opened by URL (?logout=1 …); passed in because they belong to features */
  dialogs?: ReactNode
  badges?: Partial<Record<string, number>>
}

export function AppShell({ children, email, dialogs, badges }: AppShellProps) {
  return (
    <>
      <a
        href="#main"
        className="focus-ring sr-only z-60 rounded-md bg-surface px-4 py-3 text-body font-semibold text-link focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        ข้ามไปเนื้อหา
      </a>
      <div className="min-h-dvh bg-bg text-text lg:pl-(--size-sidebar)">
        <StatusBar />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-(--size-content-max) px-(--page-gutter) pb-[calc(var(--size-nav-bottom)+1rem)] outline-none lg:pb-8"
        >
          {children}
        </main>
      </div>
      <Suspense fallback={null}>
        <SideNav email={email} badges={badges} />
      </Suspense>
      <BottomNav badges={badges} />
      {dialogs}
    </>
  )
}
