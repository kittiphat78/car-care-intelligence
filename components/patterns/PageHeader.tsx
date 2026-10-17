import type { ReactNode } from 'react'

// component-specifications.md §2.9 — one h1 per page
export function PageHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex items-start gap-3 pt-6 pb-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-title text-text">{title}</h1>
        {description && <p className="mt-1 text-body text-text-secondary">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
