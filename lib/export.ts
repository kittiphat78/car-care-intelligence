import { Record, Expense } from '@/types'

export function exportToCSV(data: any[], fileName: string) {
  if (!data || data.length === 0) {
    alert('❌ ไม่มีข้อมูลให้ดาวน์โหลด')
    return
  }

  // เช็คว่าเป็นข้อมูลประเภทไหน (ดูว่ามีฟิลด์ amount หรือไม่)
  const isExpense = 'amount' in data[0]

  // 1. กำหนดหัวตาราง (Headers) แยกตามประเภท
  const headers = isExpense 
    ? ['วันที่-เวลา', 'รายการจ่าย', 'จำนวนเงิน (บาท)', 'หมายเหตุ']
    : [
        'ลำดับคิว',
        'วันที่-เวลา',
        'ประเภทงาน',
        'ป้ายทะเบียน',
        'ประเภทรถ',
        'ยี่ห้อรถ',
        'หมายเหตุ/บริการ',
        'ราคา (บาท)'
      ]

  // ฟังก์ชันช่วยจัดการข้อมูลที่มีเครื่องหมาย , หรือเว้นวรรค เพื่อไม่ให้ CSV พัง
  const formatCell = (cell: any) => {
    const stringValue = String(cell ?? '-');
    return `"${stringValue.replace(/"/g, '""')}"`; 
  };

  // 2. แปลงข้อมูลแต่ละแถว
  const rows = data.map(item => {
    const date = new Date(item.created_at).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    if (isExpense) {
      // สำหรับรายจ่าย (Expenses)
      const e = item as Expense
      return [
        date,
        e.title,
        e.amount,
        e.note || '-'
      ].map(formatCell)
    } else {
      // สำหรับรายรับ (Records)
      const r = item as Record
      const type = r.type === 'wash' ? 'ล้างรถ' : 'ขัดสี'
      
      // ดึงข้อมูลจากอาเรย์ services [ประเภทรถ, ยี่ห้อรถ, หมายเหตุ]
      const carType = r.services[0] || '-'
      const brand = r.services[1] || '-'
      const note = r.services[2] || '-'

      return [
        r.seq_number,
        date,
        type,
        r.plate,
        carType,
        brand,
        note,
        r.price
      ].map(formatCell)
    }
  })

  // 3. คำนวณยอดรวมบรรทัดสุดท้าย
  const totalValue = data.reduce((sum, item) => sum + (isExpense ? item.amount : item.price), 0)
  
  let summaryRow: string[] = []
  if (isExpense) {
    summaryRow = [
      formatCell(''),
      formatCell('ยอดรวมรายจ่ายทั้งสิ้น:'),
      formatCell(totalValue),
      formatCell('')
    ]
  } else {
    summaryRow = [
      formatCell(''),
      formatCell(''),
      formatCell(''),
      formatCell(''),
      formatCell(''),
      formatCell(''),
      formatCell('ยอดรวมรายรับทั้งสิ้น:'),
      formatCell(totalValue)
    ]
  }

  // 4. รวมข้อมูลทั้งหมดและใส่ BOM (\uFEFF) เพื่อให้ Excel อ่านภาษาไทยออก 100%
  const csvContent = "\uFEFF" + [
    headers.map(formatCell).join(','),
    ...rows.map(row => row.join(',')),
    summaryRow.join(',')
  ].join('\n')

  // 5. สร้างไฟล์และดาวน์โหลด
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${fileName}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url) 
}