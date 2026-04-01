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

  // 2. แปลงข้อมูลแต่ละแถว
  const rows = records.map(r => {
    const date = new Date(r.created_at).toLocaleString('th-TH')
    const type = r.type === 'wash' ? 'ล้างรถ' : 'ขัดสี'
    
    // แยกข้อมูลจากอาเรย์ services [ประเภทรถ, ยี่ห้อรถ, หมายเหตุ]
    const carType = r.services[0] || '-'
    const brand = r.services[1] || '-'
    const note = r.services[2] || '-'

    return [
      r.seq_number,
      `"${date}"`, // ใส่ฟันหนูครอบเพื่อป้องกัน CSV ตัดวันที่ผิด
      type,
      r.plate,
      carType,
      brand,
      note,
      r.price
    ]
  })

  // 3. คำนวณยอดรวมบรรทัดสุดท้าย
  const totalPrice = records.reduce((sum, r) => sum + r.price, 0)
  const summaryRow = ['', '', '', '', '', '', 'ยอดรวมทั้งสิ้น:', totalPrice]

  // 4. รวมข้อมูลทั้งหมดและใส่ BOM (\uFEFF) เพื่อให้ Excel อ่านภาษาไทยออก (ไม่เป็นต่างด้าว)
  const csvContent = "\uFEFF" + [
    headers.join(','),
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
}