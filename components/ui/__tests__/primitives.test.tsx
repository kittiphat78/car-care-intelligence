import { act, fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { Badge, Banner, Button, ChoiceGroup, Dialog, Icon, IconButton, SkeletonGroup, SkeletonRow, ToastProvider, useToast, TOAST_DURATION_MS } from '@/components/ui'

// jsdom has no showModal(); this stand-in keeps the parts the component relies on
beforeAll(() => {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & { showModal?: () => void }
  if (!proto.showModal) {
    proto.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    proto.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
  }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Button', () => {
  it('is type="button" by default so it never submits a form by accident', () => {
    render(<Button>บันทึก</Button>)
    expect(screen.getByRole('button', { name: 'บันทึก' })).toHaveAttribute('type', 'button')
  })

  it('shows the loading text, is busy and ignores presses while loading', () => {
    const onClick = vi.fn()
    render(
      <Button isLoading loadingText="กำลังบันทึก…" onClick={onClick}>
        บันทึก
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'กำลังบันทึก…' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('IconButton takes its name from aria-label and hides the icon', () => {
    const { container } = render(<IconButton icon="x" aria-label="ปิด" />)
    expect(screen.getByRole('button', { name: 'ปิด' })).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('Icon', () => {
  it('is decorative', () => {
    const { container } = render(<Icon name="wash" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('ChoiceGroup', () => {
  const options = [
    { value: 'wash', label: 'ล้างรถ', icon: 'wash' as const, tone: 'wash' as const },
    { value: 'polish', label: 'ขัดสี', icon: 'polish' as const, tone: 'polish' as const },
    { value: 'other', label: 'อื่น ๆ', disabled: true },
  ]

  function Harness({ clearable = false, initial = null }: { clearable?: boolean; initial?: string | null }) {
    const [value, setValue] = useState<string | null>(initial)
    return <ChoiceGroup label="ประเภทงาน" options={options} value={value} onChange={setValue} clearable={clearable} />
  }

  it('is a radiogroup with one tab stop on the selected option', () => {
    render(<Harness initial="polish" />)
    expect(screen.getByRole('radiogroup', { name: 'ประเภทงาน' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'ขัดสี' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'ขัดสี' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('radio', { name: 'ล้างรถ' })).toHaveAttribute('tabindex', '-1')
  })

  it('marks the selected option with a ✓ icon, not colour alone', () => {
    render(<Harness initial="wash" />)
    expect(screen.getByRole('radio', { name: 'ล้างรถ' }).querySelector('[data-testid="choice-check"]')).not.toBeNull()
    expect(screen.getByRole('radio', { name: 'ขัดสี' }).querySelector('[data-testid="choice-check"]')).toBeNull()
  })

  it('arrow keys move and select, skipping disabled options and wrapping', () => {
    render(<Harness initial="wash" />)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'ล้างรถ' }), { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: 'ขัดสี' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'ขัดสี' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('radio', { name: 'ขัดสี' }), { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: 'ล้างรถ' })).toHaveAttribute('aria-checked', 'true')
  })

  it('pressing the selected option again clears it only when clearable', () => {
    const { unmount } = render(<Harness initial="wash" />)
    fireEvent.click(screen.getByRole('radio', { name: 'ล้างรถ' }))
    expect(screen.getByRole('radio', { name: 'ล้างรถ' })).toHaveAttribute('aria-checked', 'true')
    unmount()

    render(<Harness initial="wash" clearable />)
    fireEvent.click(screen.getByRole('radio', { name: 'ล้างรถ' }))
    expect(screen.getByRole('radio', { name: 'ล้างรถ' })).toHaveAttribute('aria-checked', 'false')
  })
})

describe('Dialog', () => {
  function Harness({ variant }: { variant?: 'sheet' | 'modal' | 'alert' }) {
    const [open, setOpen] = useState(false)
    const cancelRef = useRef<HTMLButtonElement>(null)
    return (
      <>
        <button onClick={() => setOpen(true)}>เปิด</button>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          title="เคลียร์ยอด?"
          variant={variant}
          initialFocusRef={cancelRef}
          footer={
            <>
              <Button ref={cancelRef} variant="secondary" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <Button variant="success">เคลียร์ยอด</Button>
            </>
          }
        >
          <p>3 คัน รวม ฿450</p>
        </Dialog>
      </>
    )
  }

  it('opens with a labelled dialog and focuses the requested element', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'เปิด' }))
    const dialog = screen.getByRole('dialog', { name: 'เคลียร์ยอด?' })
    expect(dialog).toHaveAttribute('open')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toHaveFocus()
  })

  it('Esc closes it and focus returns to the opener', () => {
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'เปิด' })
    opener.focus()
    fireEvent.click(opener)
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(screen.queryByText('3 คัน รวม ฿450')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('a tap outside closes a sheet but not an alert', () => {
    const { unmount } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'เปิด' }))
    fireEvent.click(screen.getByTestId('dialog-overlay'))
    expect(screen.queryByText('3 คัน รวม ฿450')).not.toBeInTheDocument()
    unmount()

    render(<Harness variant="alert" />)
    fireEvent.click(screen.getByRole('button', { name: 'เปิด' }))
    expect(screen.getByRole('alertdialog', { name: 'เคลียร์ยอด?' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ปิด' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('dialog-overlay'))
    expect(screen.getByText('3 คัน รวม ฿450')).toBeInTheDocument()
  })
})

describe('Toast', () => {
  function Trigger() {
    const toast = useToast()
    return (
      <>
        <button onClick={() => toast.success('บันทึกแล้ว')}>ok</button>
        <button onClick={() => toast.error('บันทึกไม่สำเร็จ', { action: { label: 'ลองอีกครั้ง', onClick: () => {} } })}>err</button>
      </>
    )
  }

  it('success is a status that closes itself after 5 s, paused while hovered', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByText('ok'))
    const toast = screen.getByRole('status')
    expect(toast).toHaveTextContent('บันทึกแล้ว')

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1000))
    fireEvent.mouseEnter(toast)
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByText('บันทึกแล้ว')).toBeInTheDocument()

    fireEvent.mouseLeave(toast)
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.queryByText('บันทึกแล้ว')).not.toBeInTheDocument()
  })

  it('error is an alert that stays until closed and carries one action', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByText('err'))
    act(() => vi.advanceTimersByTime(60_000))
    expect(screen.getByRole('alert')).toHaveTextContent('บันทึกไม่สำเร็จ')
    expect(screen.getByRole('button', { name: 'ลองอีกครั้ง' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ปิดการแจ้งเตือน' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps at most 3 toasts, dropping the oldest', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText('err'))
    expect(screen.getAllByRole('alert')).toHaveLength(3)
  })
})

describe('Banner, Badge, Skeleton', () => {
  it('danger banners are alerts; other tones are status', () => {
    const { rerender } = render(<Banner tone="danger" title="บันทึกไม่สำเร็จ" errorRef="E-7F3K" />)
    expect(screen.getByRole('alert')).toHaveTextContent('รหัสอ้างอิง E-7F3K')
    rerender(<Banner tone="warning" title="ยังไม่ได้ใส่ชื่อลูกค้า" />)
    expect(screen.getByRole('status')).toHaveTextContent('ยังไม่ได้ใส่ชื่อลูกค้า')
  })

  it('badges always show their text', () => {
    render(<Badge tone="warning" icon="clock">ค้างชำระ</Badge>)
    expect(screen.getByText('ค้างชำระ')).toBeInTheDocument()
  })

  it('a skeleton group is busy and says it is loading once', () => {
    const { container } = render(
      <SkeletonGroup>
        <SkeletonRow />
        <SkeletonRow />
      </SkeletonGroup>,
    )
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true')
    expect(screen.getAllByText('กำลังโหลด…')).toHaveLength(1)
  })
})
