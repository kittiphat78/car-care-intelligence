import type { Record as AppRecord, Expense } from '@/types'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

// 🛡️ Type Guard
const isExpenseRecord = (item: AppRecord | Expense): item is Expense => {
  return 'amount' in item
}

export async function exportToExcel(data: AppRecord[] | Expense[], fileName: string): Promise<boolean> {
  if (!data || data.length === 0) return false

  const isExpenseMode = isExpenseRecord(data[0])
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Data')

  // ✅ 1. กำหนดโครงสร้างคอลัมน์
  if (isExpenseMode) {
    worksheet.columns = [
      { header: 'วันที่-เวลา', key: 'date', width: 22 },
      { header: 'รายการจ่าย', key: 'title', width: 35 },
      { header: 'จำนวนเงิน (บาท)', key: 'amount', width: 20 },
      { header: 'หมายเหตุ', key: 'note', width: 30 }
    ]
  } else {
    worksheet.columns = [
      { header: 'ลำดับคิว', key: 'seq', width: 12 },
      { header: 'วันที่-เวลา', key: 'date', width: 22 },
      { header: 'ประเภทงาน', key: 'type', width: 15 },
      { header: 'ป้ายทะเบียน', key: 'plate', width: 18 },
      { header: 'ยี่ห้อรถ', key: 'brand', width: 15 },
      { header: 'ประเภทรถ', key: 'carType', width: 15 },
      { header: 'ชื่อลูกค้า', key: 'customer', width: 25 },
      { header: 'สถานะ', key: 'status', width: 15 },
      { header: 'หมายเหตุ', key: 'note', width: 25 },
      { header: 'ราคา (บาท)', key: 'price', width: 20 }
    ]
  }

  // ✅ 2. จัดรูปแบบ Header Row
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: isExpenseMode ? 'FFD9534F' : 'FF4A90E2' } // แดงสำหรับรายจ่าย, ฟ้าสำหรับรายรับ
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 25

  // ✅ 3. เตรียมข้อมูลและคำนวณยอดรวม
  const formatDate = (iso: string) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  let totalAmount = 0
  const monthlyTotals: globalThis.Record<string, number> = {}

  data.forEach((item, index) => {
    const dateStr = formatDate(item.created_at)
    const d = new Date(item.created_at)
    const monthKey = d.toLocaleString('th-TH', { month: 'long', year: 'numeric' })
    let rowValues: any = {}

    if (isExpenseRecord(item)) {
      totalAmount += item.amount || 0
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + (item.amount || 0)
      rowValues = {
        date: dateStr,
        title: item.title || '-',
        amount: item.amount || 0,
        note: item.note || '-'
      }
    } else {
      totalAmount += item.price || 0
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + (item.price || 0)
      const services = item.services || []
      rowValues = {
        seq: item.seq_number || '-',
        date: dateStr,
        type: item.type === 'wash' ? 'ล้างรถ' : 'ขัดสี',
        plate: item.plate || '-',
        brand: services[1] || '-',
        carType: services[0] || '-',
        customer: item.customer_name || '-',
        status: item.payment_status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ',
        note: services[2] || '-',
        price: item.price || 0
      }
    }

    const row = worksheet.addRow(rowValues)
    row.alignment = { vertical: 'middle' }

    // Banded rows: สีพื้นหลังสลับ
    if (index % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } }
    }

    // จัดรูปแบบคอลัมน์จำนวนเงิน (ชิดขวา, มีคอมม่า)
    const amtCell = isExpenseMode ? row.getCell('amount') : row.getCell('price')
    amtCell.numFmt = '#,##0.00'
    amtCell.alignment = { horizontal: 'right' }
    
    // สถานะจัดกึ่งกลาง
    if (!isExpenseMode) {
      row.getCell('status').alignment = { horizontal: 'center' }
      row.getCell('type').alignment = { horizontal: 'center' }
      row.getCell('seq').alignment = { horizontal: 'center' }
    }
  })

  // ✅ 4. ตีเส้นตารางให้ทุกเซลล์ที่มีข้อมูล
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
      }
    })
  })

  // ✅ 5. แถวสรุปยอดรวม (Grand Total)
  worksheet.addRow([]) // เว้นบรรทัด
  const summaryRow = worksheet.addRow(
    isExpenseMode 
      ? { title: 'ยอดรวมทั้งสิ้น:', amount: totalAmount }
      : { note: 'ยอดรวมทั้งสิ้น:', price: totalAmount }
  )
  
  summaryRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
  summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } }
  summaryRow.height = 25
  summaryRow.alignment = { vertical: 'middle' }
  
  const totalCell = isExpenseMode ? summaryRow.getCell('amount') : summaryRow.getCell('price')
  totalCell.numFmt = '#,##0.00'
  totalCell.alignment = { horizontal: 'right' }

  // ✅ 6. ตารางสรุปยอดรายเดือน (Monthly Summary)
  const monthKeys = Object.keys(monthlyTotals)
  if (monthKeys.length > 1) {
    worksheet.addRow([])
    worksheet.addRow([])
    
    const mSumHeader = worksheet.addRow(['สรุปยอดรายเดือน', 'ยอดรวม (บาท)'])
    mSumHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    mSumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5CB85C' } } // สีเขียว
    mSumHeader.alignment = { horizontal: 'center' }

    // Merge เซลล์หัวตารางสรุปถ้าคอลัมน์น้อย
    monthKeys.forEach((month) => {
      const row = worksheet.addRow([month, monthlyTotals[month]])
      row.getCell(2).numFmt = '#,##0.00'
      row.getCell(2).alignment = { horizontal: 'right' }
      
      // ใส่เส้นขอบ
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
        }
      })
    })
  }

  // ✅ 7. สร้างและดาวน์โหลดไฟล์
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `${fileName}.xlsx`)

  return true
}