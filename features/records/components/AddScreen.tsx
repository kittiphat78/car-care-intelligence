'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Tabs, tabId, tabPanelId } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/patterns/PageHeader'
import { ExpenseEditor, IncomeEditor, type EditorProps } from './RecordEditor'

// screen-specifications.md §4 — /add?type=income|expense. The tab lives in the URL so a
// reload or the nav's back button keeps it; each tab keeps its own draft.

type Kind = 'income' | 'expense'

export function AddScreen({ userId, email }: EditorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const kind: Kind = searchParams.get('type') === 'expense' ? 'expense' : 'income'

  function switchTo(next: Kind) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', next)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="grid grid-cols-1 gap-4 pb-4">
      <PageHeader title="บันทึกรายการ" />
      <Tabs
        idBase="add"
        label="ประเภทรายการ"
        value={kind}
        onChange={switchTo}
        tabs={[
          { value: 'income', label: 'รายรับ' },
          { value: 'expense', label: 'รายจ่าย' },
        ]}
      />
      <section id={tabPanelId('add', kind)} role="tabpanel" aria-labelledby={tabId('add', kind)} className="pt-1">
        {kind === 'income' ? <IncomeEditor key="income" userId={userId} email={email} /> : <ExpenseEditor key="expense" userId={userId} email={email} />}
      </section>
    </div>
  )
}
