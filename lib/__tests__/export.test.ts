import { describe, it, expect, vi } from 'vitest'
import ExcelJS from 'exceljs'
import type { Expense, Record as AppRecord } from '@/types'

const saved = vi.hoisted(() => ({ blob: null as Blob | null, name: '' }))
vi.mock('file-saver', () => ({ saveAs: (blob: Blob, name: string) => { saved.blob = blob; saved.name = name } }))

import { exportToExcel } from '@/lib/export'

const record = (over: Partial<AppRecord>): AppRecord => ({
  id: 'r1', created_at: '2026-10-14T03:00:00+00:00', type: 'wash', plate: 'กข 1234', services: ['รถเก๋ง', 'HONDA', ''],
  price: 250, seq_number: 1, payment_status: 'paid', job_status: 'done', customer_name: '', ...over,
})

async function cells(sheetName: string) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await saved.blob!.arrayBuffer())
  const values: unknown[] = []
  wb.getWorksheet(sheetName)!.eachRow(row => row.eachCell(c => values.push(c.value)))
  return values
}

describe('exportToExcel', () => {
  it('writes typed text as text, never as a formula, in both raw sheets', async () => {
    const expense: Expense = { id: 'e1', created_at: '2026-10-14T05:00:00+00:00', title: '=1+1', amount: 100, note: '@x' }
    await exportToExcel(
      { records: [record({ plate: '=HYPERLINK("http://x")', customer_name: '+cmd', services: ['รถเก๋ง', '', '-2+3'] })], expenses: [expense] },
      'test', 'bank',
    )
    expect(saved.name).toBe('test.xlsx')

    const income = await cells('ข้อมูลรายรับ')
    expect(income).toContain(`'=HYPERLINK("http://x")`)
    expect(income).toContain(`'+cmd`)
    expect(income).toContain(`'-2+3`)
    expect(income.some(v => typeof v === 'object' && v !== null && 'formula' in v)).toBe(false)

    const spent = await cells('ข้อมูลรายจ่าย')
    expect(spent).toContain(`'=1+1`)
    expect(spent).toContain(`'@x`)
  })
})
