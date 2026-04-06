import type { Record as AppRecord, Expense } from '@/types'

// 🛡️ Type Guard: เช็คประเภทข้อมูลแบบปลอดภัย ไม่ต้องใช้ "as" พร่ำเพรื่อ
const isExpenseRecord = (item: AppRecord | Expense): item is Expense => {
  return 'amount' in item
}

export function exportToCSV(data: AppRecord[] | Expense[], fileName: string): boolean {
  if (!data || data.length === 0) return false

  const isExpenseMode = isExpenseRecord(data[0])

  // ✅ เพิ่มคอลัมน์ "ชื่อลูกค้า" และ "สถานะการชำระ" ให้ครอบคลุมทุก Data
  const headers = isExpenseMode
    ? ['วันที่-เวลา', 'รายการจ่าย', 'จำนวนเงิน (บาท)', 'หมายเหตุ']
    : ['ลำดับคิว', 'วันที่-เวลา', 'ประเภทงาน', 'ป้ายทะเบียน', 'ยี่ห้อรถ', 'ประเภทรถ', 'ชื่อลูกค้า', 'สถานะ', 'หมายเหตุ', 'ราคา (บาท)']

  const formatCell = (cell: unknown): string => {
    // ดักจับ null, undefined และลบช่องว่างส่วนเกิน
    const val = String(cell ?? '').trim()
    // ครอบด้วย Quote และ Escape double quote (") ป้องกันไฟล์ CSV เพี้ยน
    return `"${val.replace(/"/g, '""')}"`
  }

  // ✅ คืนค่าวันที่เป็นแบบเดิม (เดือนเต็ม) 
  const formatDate = (iso: string) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleString('th-TH', {
      year: 'numeric', 
      month: 'long',   // <-- กลับมาใช้เดือนเต็ม เช่น "เมษายน"
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
    })
  }

  let totalAmount = 0 // ✅ คำนวณยอดรวมไปพร้อมกับตอนลูปเลย เพื่อ Performance

  const rows = data.map(item => {
    const date = formatDate(item.created_at)

    if (isExpenseRecord(item)) {
      totalAmount += item.amount || 0
      return [
        date, 
        item.title || '-', 
        item.amount || 0, 
        item.note || '-'
      ].map(formatCell)
    } else {
      totalAmount += item.price || 0
      // 🛡️ Safe Access: ป้องกันกรณีที่ไม่มี services array
      const services = item.services || []
      const carType  = services[0] || '-'
      const carBrand = services[1] || '-'
      const note     = services[2] || '-'
      
      return [
        item.seq_number || '-',
        date,
        item.type === 'wash' ? 'ล้างรถ' : 'ขัดสี',
        item.plate || '-',
        carBrand,
        carType,
        item.customer_name || '-', 
        item.payment_status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ', 
        note,
        item.price || 0,
      ].map(formatCell)
    }
  })

  // ✅ จัด Summary Row ให้จำนวนคอลัมน์ตรงกับ Headers พอดีเป๊ะ
  const summaryRow = isExpenseMode
    ? [formatCell(''), formatCell('ยอดรวมรายจ่ายทั้งสิ้น:'), formatCell(totalAmount), formatCell('')]
    : [
        formatCell(''), formatCell(''), formatCell(''), formatCell(''), 
        formatCell(''), formatCell(''), formatCell(''), formatCell(''), 
        formatCell('ยอดรวมรายรับทั้งสิ้น:'), formatCell(totalAmount)
      ]

  // \uFEFF = Byte Order Mark ให้ Excel อ่านภาษาไทย
  // \r\n = มาตรฐานการขึ้นบรรทัดใหม่ของไฟล์ CSV
  const csvContent = '\uFEFF' + [
    headers.map(formatCell).join(','),
    ...rows.map(r => r.join(',')),
    summaryRow.join(',')
  ].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  link.href = url
  link.download = `${fileName}.csv`
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  return true
}