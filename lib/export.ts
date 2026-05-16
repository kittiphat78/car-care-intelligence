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

  // ✅ 1. กำหนดโครงสร้างคอลัมน์ (ใส่ width ชั่วคราวไปก่อน เดี๋ยวคำนวณใหม่ทีหลัง)
  if (isExpenseMode) {
    worksheet.columns = [
      { header: 'ลำดับ', key: 'no' },
      { header: 'วันที่', key: 'date' },
      { header: 'รายการจ่าย', key: 'title' },
      { header: 'หมายเหตุ', key: 'note' },
      { header: 'จำนวนเงิน (บาท)', key: 'amount' }
    ]
  } else {
    worksheet.columns = [
      { header: 'ลำดับ', key: 'no' },
      { header: 'วันที่', key: 'date' },
      { header: 'ป้ายทะเบียน', key: 'plate' },
      { header: 'ชื่อลูกค้า', key: 'customer' },
      { header: 'ประเภทงาน', key: 'type' },
      { header: 'ยี่ห้อรถ', key: 'brand' },
      { header: 'ประเภทรถ', key: 'carType' },
      { header: 'สถานะ', key: 'status' },
      { header: 'หมายเหตุ', key: 'note' },
      { header: 'ราคา (บาท)', key: 'price' }
    ]
  }

  // ✅ 2. จัดรูปแบบ Header Row
  const headerRow = worksheet.getRow(1)
  headerRow.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    // ใช้สีพรีเมียมเข้มๆ แดงก่ำสำหรับรายจ่าย, น้ำเงินอมเขียว(Teal) สำหรับรายรับ
    fgColor: { argb: isExpenseMode ? 'FF991B1B' : 'FF0F766E' }
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 30

  // ✅ 3. เตรียมข้อมูลและคำนวณยอดรวม
  const formatDate = (iso: string) => {
    if (!iso) return '-'
    // เอาเวลาออก เหลือแค่วัน เดือน ปี
    return new Date(iso).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  let totalAmount = 0
  let totalWashCount = 0
  let totalPolishCount = 0
  const monthlyTotals: globalThis.Record<string, number> = {}

  data.forEach((item, index) => {
    const dateStr = formatDate(item.created_at)
    const d = new Date(item.created_at)
    const monthKey = d.toLocaleString('th-TH', { month: 'long', year: 'numeric' })
    let rowValues: globalThis.Record<string, string | number> = {}

    if (isExpenseRecord(item)) {
      totalAmount += item.amount || 0
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + (item.amount || 0)
      rowValues = {
        no: index + 1,
        date: dateStr,
        title: item.title || '-',
        note: item.note || '-',
        amount: item.amount || 0
      }
    } else {
      totalAmount += item.price || 0
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + (item.price || 0)
      if (item.type === 'wash') totalWashCount++
      if (item.type === 'polish') totalPolishCount++
      const services = item.services || []
      rowValues = {
        no: index + 1,
        date: dateStr,
        plate: item.plate || '-',
        customer: item.customer_name || '-',
        type: item.type === 'wash' ? 'ล้างรถ' : 'ขัดสี',
        brand: services[1] || '-',
        carType: services[0] || '-',
        status: item.payment_status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ',
        note: services[2] || '-',
        price: item.price || 0
      }
    }

    const row = worksheet.addRow(rowValues)
    row.font = { name: 'Arial', size: 11 }
    row.alignment = { vertical: 'middle' }

    // Banded rows: สีพื้นหลังสลับ อ่อนๆ ให้ดูหรูหรา
    if (index % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
    } else {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
    }

    // จัดรูปแบบคอลัมน์จำนวนเงิน (ชิดขวา, มีคอมม่า)
    const amtCell = isExpenseMode ? row.getCell('amount') : row.getCell('price')
    amtCell.numFmt = '#,##0.00'
    amtCell.alignment = { horizontal: 'right', vertical: 'middle' }

    // สถานะจัดกึ่งกลาง
    if (!isExpenseMode) {
      row.getCell('status').alignment = { horizontal: 'center', vertical: 'middle' }
      row.getCell('type').alignment = { horizontal: 'center', vertical: 'middle' }
      row.getCell('no').alignment = { horizontal: 'center', vertical: 'middle' }
    }
  })

  // ✅ 4. ตีเส้นตารางให้ทุกเซลล์ที่มีข้อมูล ด้วยสีเทาอ่อนสะอาดตา
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      }
    })
  })

  // ✅ 4.5 จัดความกว้างคอลัมน์อัตโนมัติ (Auto-fit)
  worksheet.columns.forEach((column) => {
    let maxLength = 0
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const val = cell.value ? cell.value.toString() : ''
      // ตัวอักษรไทยใช้พื้นที่น้อยกว่าตัวอังกฤษนิดหน่อย แต่เผื่อไว้ก่อน
      let length = val.length
      if (typeof cell.value === 'number') {
        length = 12 // เผื่อสำหรับตัวเลขที่มี comma
      }
      if (length > maxLength) maxLength = length
    })
    // เพิ่ม Padding ให้ดูไม่อึดอัด
    column.width = maxLength < 10 ? 12 : maxLength + 6
  })

  // ✅ 5. แถวสรุปยอดรวม (Grand Total)
  worksheet.addRow([]) // เว้นบรรทัด

  if (!isExpenseMode) {
    const countRow = worksheet.addRow({ note: `ล้างรถ: ${totalWashCount} คัน | ขัดสี: ${totalPolishCount} คัน`, price: '' })
    countRow.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF374151' } }
    countRow.alignment = { vertical: 'middle', horizontal: 'right' }
    countRow.getCell('price').value = '' // Clear price cell if any
    worksheet.mergeCells(`A${countRow.number}:H${countRow.number}`)
  }

  const summaryRow = worksheet.addRow(
    isExpenseMode
      ? { title: 'ยอดรวมทั้งสิ้น:', amount: totalAmount }
      : { note: 'ยอดรวมทั้งสิ้น:', price: totalAmount }
  )

  summaryRow.font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF1F2937' } }
  summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } } // สีเทาสว่าง
  summaryRow.height = 30
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
    mSumHeader.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } }
    mSumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } } // สีเขียวหรู (Emerald)
    mSumHeader.alignment = { horizontal: 'center', vertical: 'middle' }
    mSumHeader.height = 25

    // Merge เซลล์หัวตารางสรุปถ้าคอลัมน์น้อย
    monthKeys.forEach((month) => {
      const row = worksheet.addRow([month, monthlyTotals[month]])
      row.font = { name: 'Arial' }
      row.getCell(2).numFmt = '#,##0.00'
      row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' }
      row.getCell(1).alignment = { vertical: 'middle' }

      // ใส่เส้นขอบ
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
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