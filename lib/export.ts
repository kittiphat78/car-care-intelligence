import { Record } from '@/types'

export function exportToCSV(records: Record[], fileName: string) {
  // 1. กำหนดหัวตาราง (Headers)
  const headers = [
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
    // ถ้าในข้อมูลมีคอมม่า ให้ใส่ฟันหนูครอบไว้ Excel จะได้ไม่ตัดคอลัมน์ผิด
    return `"${stringValue.replace(/"/g, '""')}"`; 
  };

  // 2. แปลงข้อมูลแต่ละแถว
  const rows = records.map(r => {
    const date = new Date(r.created_at).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    
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
    ].map(formatCell); // จัดการทุก Cell ให้ปลอดภัย
  })

  // 3. คำนวณยอดรวมบรรทัดสุดท้าย (ใส่ช่องว่างให้ตรงคอลัมน์)
  const totalPrice = records.reduce((sum, r) => sum + r.price, 0)
  const summaryRow = [
    formatCell(''),
    formatCell(''),
    formatCell(''),
    formatCell(''),
    formatCell(''),
    formatCell(''),
    formatCell('ยอดรวมทั้งสิ้น:'),
    formatCell(totalPrice)
  ]

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
  URL.revokeObjectURL(url) // คืนค่า Memory
}