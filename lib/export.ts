import type { Record, Expense } from '@/types'

export function exportToCSV(data: Record[] | Expense[], fileName: string): boolean {
  if (!data || data.length === 0) return false

  const isExpense = 'amount' in data[0]

  const headers = isExpense
    ? ['วันที่-เวลา', 'รายการจ่าย', 'จำนวนเงิน (บาท)', 'หมายเหตุ']
    : ['ลำดับคิว', 'วันที่-เวลา', 'ประเภทงาน', 'ป้ายทะเบียน', 'ประเภทรถ', 'หมายเหตุ', 'ราคา (บาท)']

  const formatCell = (cell: unknown): string => {
    const val = String(cell ?? '-')
    return `"${val.replace(/"/g, '""')}"`
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const rows = data.map(item => {
    const date = formatDate(item.created_at)

    if (isExpense) {
      const e = item as Expense
      return [date, e.title, e.amount, e.note ?? '-'].map(formatCell)
    } else {
      const r = item as Record
      // services = [typeName, note]
      const carType = r.services[0] ?? '-'
      const note    = r.services[1] ?? '-'
      return [
        r.seq_number,
        date,
        r.type === 'wash' ? 'ล้างรถ' : 'ขัดสี',
        r.plate,
        carType,
        note,
        r.price,
      ].map(formatCell)
    }
  })

  const total = data.reduce((s, item) =>
    s + ('amount' in item ? item.amount : item.price), 0
  )

  const summaryRow = isExpense
    ? [formatCell(''), formatCell('ยอดรวมรายจ่ายทั้งสิ้น:'), formatCell(total), formatCell('')]
    : [formatCell(''), formatCell(''), formatCell(''), formatCell(''), formatCell(''), formatCell('ยอดรวมรายรับทั้งสิ้น:'), formatCell(total)]

  const csvContent = '\uFEFF' + [
    headers.map(formatCell).join(','),
    ...rows.map(r => r.join(',')),
    summaryRow.join(','),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `${fileName}.csv`
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return true
}