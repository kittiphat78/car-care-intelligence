import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/observability', () => ({ reportError: vi.fn() }))

import ErrorPage from '../error'
import NotFound from '../not-found'

describe('error and 404 pages (screen-specifications.md §7)', () => {
  it('says saved data is safe, shows the reference and can retry', () => {
    const reset = vi.fn()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorPage error={Object.assign(new Error('boom'), { digest: 'abc123' })} reset={reset} />)
    expect(screen.getByRole('heading', { level: 1, name: 'เกิดข้อผิดพลาด' })).toBeInTheDocument()
    expect(screen.getByText('ข้อมูลที่บันทึกไว้แล้วไม่ได้รับผลกระทบ')).toBeInTheDocument()
    expect(screen.getByText('รหัสอ้างอิง: abc123')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ลองอีกครั้ง' }))
    expect(reset).toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'กลับหน้าภาพรวม' })).toHaveAttribute('href', '/')
  })

  it('404 offers the way back', () => {
    render(<NotFound />)
    expect(screen.getByRole('heading', { level: 1, name: 'ไม่พบหน้านี้' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'กลับหน้าภาพรวม' })).toHaveAttribute('href', '/')
  })
})
