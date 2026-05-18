import type { Record as AppRecord, Expense } from '@/types'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export type ExportMode = 'bank' | 'internal'

export interface ExportData {
  records: AppRecord[]
  expenses: Expense[]
}

// 🛡️ Type Guard
const isExpenseRecord = (item: AppRecord | Expense): item is Expense => {
  return 'amount' in item
}

export async function exportToExcel(
  data: AppRecord[] | Expense[] | ExportData,
  fileName: string,
  mode: ExportMode = 'bank'
): Promise<boolean> {
  if (!data) return false

  const workbook = new ExcelJS.Workbook()

  const formatDate = (iso: string) => {
    if (!iso) return '-'
    // เอาเวลาออก เหลือแค่วัน เดือน ปี
    return new Date(iso).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  // เราบังคับให้ mode ปัจจุบันส่งเป็น ExportData เสมอ (มีทั้ง records และ expenses)
  const { records = [], expenses = [] } = data as ExportData
  if (records.length === 0 && expenses.length === 0) return false

  /* ═══════════════════════════════════════════════════════════════════════════
     Helper Function: สำหรับสร้างหน้า Data Sheet (ใช้ร่วมกันทั้ง 2 Mode)
     ═══════════════════════════════════════════════════════════════════════════ */
  const createRawSheet = (sheetName: string, isExpense: boolean, items: any[]) => {
    if (items.length === 0) return
    const ws = workbook.addWorksheet(sheetName)
    
    if (isExpense) {
      ws.columns = [
        { header: 'ลำดับ', key: 'no' },
        { header: 'วันที่', key: 'date' },
        { header: 'รายการจ่าย', key: 'title' },
        { header: 'หมายเหตุ', key: 'note' },
        { header: 'จำนวนเงิน (บาท)', key: 'amount' }
      ]
    } else {
      ws.columns = [
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
    
    const hr = ws.getRow(1)
    hr.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
    hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isExpense ? 'FF991B1B' : 'FF0F766E' } }
    hr.alignment = { vertical: 'middle', horizontal: 'center' }
    hr.height = 30

    let totalAmount = 0
    let totalWashCount = 0
    let totalPolishCount = 0
    const monthlyTotals: globalThis.Record<string, number> = {}

    items.forEach((item, idx) => {
      let rowValues: globalThis.Record<string, any> = {}
      const dateStr = formatDate(item.created_at)
      const d = new Date(item.created_at)
      const monthKey = d.toLocaleString('th-TH', { month: 'long', year: 'numeric' })

      if (isExpense) {
        totalAmount += item.amount || 0
        monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + (item.amount || 0)
        rowValues = {
          no: idx + 1, date: dateStr, title: item.title || '-', note: item.note || '-', amount: item.amount || 0
        }
      } else {
        totalAmount += item.price || 0
        monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + (item.price || 0)
        if (item.type === 'wash') totalWashCount++
        if (item.type === 'polish') totalPolishCount++
        const services = item.services || []
        rowValues = {
          no: idx + 1, date: dateStr, plate: item.plate || '-', customer: item.customer_name || '-',
          type: item.type === 'wash' ? 'ล้างรถ' : 'ขัดสี', brand: services[1] || '-', carType: services[0] || '-',
          status: item.payment_status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ', note: services[2] || '-', price: item.price || 0
        }
      }

      const r = ws.addRow(rowValues)
      r.font = { name: 'Arial', size: 11 }
      r.height = 22
      r.alignment = { vertical: 'middle' }
      if (idx % 2 === 1) r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
      else r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
      
      const amtCell = isExpense ? r.getCell('amount') : r.getCell('price')
      amtCell.numFmt = '#,##0.00'
      amtCell.alignment = { horizontal: 'right', vertical: 'middle' }

      if (!isExpense) {
        r.getCell('status').alignment = { horizontal: 'center', vertical: 'middle' }
        r.getCell('type').alignment = { horizontal: 'center', vertical: 'middle' }
        r.getCell('no').alignment = { horizontal: 'center', vertical: 'middle' }
      }
    })

    // ตีเส้นตาราง
    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        }
      })
    })

    // จัดความกว้างคอลัมน์อัตโนมัติ (คำนวณอย่างละเอียด)
    ws.columns.forEach((column, colIndex) => {
      let maxCharWidth = 0
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        if (!cell.value) return
        const val = cell.value.toString()
        // Thai chars are wider visually — weight them ~1.5x vs ASCII
        let w = 0
        for (const ch of val) {
          w += ch.charCodeAt(0) > 127 ? 1.8 : 1
        }
        if (typeof cell.value === 'number') w = Math.max(w, 14) // numbers need comma+decimal space
        if (w > maxCharWidth) maxCharWidth = w
      })
      // Clamp: min 8, max 40, add comfortable padding
      column.width = Math.min(Math.max(Math.ceil(maxCharWidth) + 4, 8), 40)
    })

    // แถวสรุปยอดรวมแต่ละ Sheet (สำหรับ Bank mode ให้แสดงด้วยเพื่อความสะดวก)
    if (mode === 'bank') {
      ws.addRow([]) // เว้นบรรทัด
      if (!isExpense) {
        const countRow = ws.addRow({ note: `ล้างรถ: ${totalWashCount} คัน | ขัดสี: ${totalPolishCount} คัน`, price: '' })
        countRow.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF374151' } }
        countRow.alignment = { vertical: 'middle', horizontal: 'right' }
        countRow.getCell('price').value = ''
        ws.mergeCells(`A${countRow.number}:H${countRow.number}`)
      }

      const summaryRow = ws.addRow(
        isExpense
          ? { title: 'ยอดรวมทั้งสิ้น:', amount: totalAmount }
          : { note: 'ยอดรวมทั้งสิ้น:', price: totalAmount }
      )
      summaryRow.font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF1F2937' } }
      summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      summaryRow.height = 30
      summaryRow.alignment = { vertical: 'middle' }

      const totalCell = isExpense ? summaryRow.getCell('amount') : summaryRow.getCell('price')
      totalCell.numFmt = '#,##0.00'
      totalCell.alignment = { horizontal: 'right' }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     MODE: INTERNAL (ดูเอง - Dashboard สรุปผลภาพรวม)
     ═══════════════════════════════════════════════════════════════════════════ */
  if (mode === 'internal') {
    const dashSheet = workbook.addWorksheet('Dashboard สรุปผล')
    
    let totalIncome = 0
    let totalWash = 0
    let totalPolish = 0
    
    interface MonthData {
      income: number
      expense: number
      wash: number
      polish: number
      label: string
    }
    const monthlyDataMap: globalThis.Record<string, MonthData> = {}

    records.forEach(r => {
      totalIncome += r.price || 0
      const d = new Date(r.created_at)
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyDataMap[sortKey]) {
         monthlyDataMap[sortKey] = { income: 0, expense: 0, wash: 0, polish: 0, label: d.toLocaleString('th-TH', { month: 'short', year: '2-digit' }) }
      }
      monthlyDataMap[sortKey].income += (r.price || 0)
      if (r.type === 'wash') {
         totalWash++
         monthlyDataMap[sortKey].wash++
      }
      if (r.type === 'polish') {
         totalPolish++
         monthlyDataMap[sortKey].polish++
      }
    })

    let totalExpense = 0
    expenses.forEach(e => {
      totalExpense += e.amount || 0
      const d = new Date(e.created_at)
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyDataMap[sortKey]) {
         monthlyDataMap[sortKey] = { income: 0, expense: 0, wash: 0, polish: 0, label: d.toLocaleString('th-TH', { month: 'short', year: '2-digit' }) }
      }
      monthlyDataMap[sortKey].expense += (e.amount || 0)
    })

    const netProfit = totalIncome - totalExpense
    const avgTicketSize = (totalWash + totalPolish) > 0 ? totalIncome / (totalWash + totalPolish) : 0
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) : 0

    // คอลัมน์ Dashboard: ปรับตามเนื้อหาแต่ละ column อย่างละเอียด
    // A=เดือน/KPI  B=รายรับ  C=รายจ่าย  D=กำไร  E=∆กำไร(บาท)  F=∆กำไร(%)  G=ล้างรถ  H=∆ล้างรถ  I=ขัดสี  J=∆ขัดสี
    dashSheet.columns = [
       { width: 14 }, // A: เดือน/KPI label
       { width: 17 }, // B: รายรับ (number + comma)
       { width: 17 }, // C: รายจ่าย
       { width: 17 }, // D: กำไรสุทธิ
       { width: 18 }, // E: ∆ กำไร (บาท)
       { width: 14 }, // F: ∆ กำไร (%)
       { width: 10 }, // G: ล้างรถ (count)
       { width: 11 }, // H: ∆ ล้างรถ
       { width: 10 }, // I: ขัดสี
       { width: 11 }, // J: ∆ ขัดสี
    ]
    
    dashSheet.mergeCells('A1:J1')
    dashSheet.getCell('A1').value = '📊 Dashboard วิเคราะห์ธุรกิจ (รายงานภายใน)'
    dashSheet.getCell('A1').font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    dashSheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }
    dashSheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' }
    dashSheet.getRow(1).height = 40

    dashSheet.addRow(['ยอดรายรับรวม', 'ยอดรายจ่ายรวม', 'กำไรสุทธิ', 'ล้างรถ (คัน)', 'ขัดสี (คัน)', 'รายรับเฉลี่ย/คัน', 'อัตรากำไร (%)', '', '', ''])
    dashSheet.getRow(2).font = { name: 'Arial', size: 12, bold: true }
    dashSheet.getRow(2).alignment = { horizontal: 'center', vertical: 'middle' }
    dashSheet.getRow(2).height = 25
    dashSheet.mergeCells('G2:J2')
    
    dashSheet.addRow([totalIncome, totalExpense, netProfit, totalWash, totalPolish, avgTicketSize, profitMargin, '', '', ''])
    const r3 = dashSheet.getRow(3)
    dashSheet.mergeCells('G3:J3')
    r3.font = { name: 'Arial', size: 14, bold: true }
    r3.getCell(1).numFmt = '#,##0.00'; r3.getCell(1).font = { color: { argb: 'FF059669' }, size: 14, bold: true }
    r3.getCell(2).numFmt = '#,##0.00'; r3.getCell(2).font = { color: { argb: 'FFDC2626' }, size: 14, bold: true }
    r3.getCell(3).numFmt = '#,##0.00'; r3.getCell(3).font = { color: { argb: netProfit >= 0 ? 'FF059669' : 'FFDC2626' }, size: 14, bold: true }
    r3.getCell(4).alignment = { horizontal: 'center' }
    r3.getCell(5).alignment = { horizontal: 'center' }
    r3.getCell(6).numFmt = '#,##0.00'; r3.getCell(6).alignment = { horizontal: 'center' }
    r3.getCell(7).numFmt = '0.00%'; r3.getCell(7).alignment = { horizontal: 'center' }; r3.getCell(7).font = { color: { argb: profitMargin >= 0.2 ? 'FF059669' : 'FFD97706' }, size: 14, bold: true }
    r3.height = 35

    dashSheet.addRow([])

    dashSheet.mergeCells('A5:J5')
    dashSheet.getCell('A5').value = '📈 สรุปเปรียบเทียบรายเดือน (Month-over-Month)'
    dashSheet.getCell('A5').font = { name: 'Arial', size: 12, bold: true }
    dashSheet.getCell('A5').alignment = { vertical: 'middle' }
    dashSheet.getRow(5).height = 25

    const th = dashSheet.addRow(['เดือน/ปี', 'รายรับ', 'รายจ่าย', 'กำไรสุทธิ', '∆ กำไร (บาท)', '∆ กำไร (%)', 'ล้างรถ', '∆ ล้างรถ', 'ขัดสี', '∆ ขัดสี'])
    th.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    th.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } }
    th.alignment = { horizontal: 'center', vertical: 'middle' }
    th.height = 30

    const sortedKeys = Object.keys(monthlyDataMap).sort()
    
    sortedKeys.forEach((key, index) => {
      const current = monthlyDataMap[key]
      const currentProfit = current.income - current.expense
      
      let profitDiffVal = 0
      let profitDiffPct = 0
      let washDiff = 0
      let polishDiff = 0
      let hasPrev = false

      if (index > 0) {
        hasPrev = true
        const prev = monthlyDataMap[sortedKeys[index - 1]]
        const prevProfit = prev.income - prev.expense
        profitDiffVal = currentProfit - prevProfit
        profitDiffPct = prevProfit !== 0 ? (profitDiffVal / Math.abs(prevProfit)) : 0
        washDiff = current.wash - prev.wash
        polishDiff = current.polish - prev.polish
      }

      const r = dashSheet.addRow([
        current.label,
        current.income,
        current.expense,
        currentProfit,
        hasPrev ? profitDiffVal : '-',
        hasPrev ? profitDiffPct : '-',
        current.wash,
        hasPrev ? washDiff : '-',
        current.polish,
        hasPrev ? polishDiff : '-'
      ])
      r.height = 22
      r.font = { name: 'Arial', size: 11 }
      
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
      r.getCell(2).numFmt = '#,##0.00'; r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' }
      r.getCell(3).numFmt = '#,##0.00'; r.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' }
      r.getCell(4).numFmt = '#,##0.00'
      r.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }
      r.getCell(4).font = { name: 'Arial', bold: true, size: 11, color: { argb: currentProfit >= 0 ? 'FF059669' : 'FFDC2626' } }
      
      if (hasPrev) {
         r.getCell(5).numFmt = '+#,##0.00;-#,##0.00;0.00'
         r.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' }
         r.getCell(5).font = { name: 'Arial', size: 11, color: { argb: profitDiffVal > 0 ? 'FF059669' : (profitDiffVal < 0 ? 'FFDC2626' : 'FF6B7280') } }
         
         r.getCell(6).numFmt = '+0.00%;-0.00%;0.00%'
         r.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' }
         r.getCell(6).font = { name: 'Arial', bold: true, size: 11, color: { argb: profitDiffPct > 0 ? 'FF059669' : (profitDiffPct < 0 ? 'FFDC2626' : 'FF6B7280') } }

         r.getCell(8).numFmt = '+0;-0;0'
         r.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' }
         r.getCell(8).font = { name: 'Arial', size: 11, color: { argb: washDiff > 0 ? 'FF059669' : (washDiff < 0 ? 'FFDC2626' : 'FF6B7280') } }

         r.getCell(10).numFmt = '+0;-0;0'
         r.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' }
         r.getCell(10).font = { name: 'Arial', size: 11, color: { argb: polishDiff > 0 ? 'FF059669' : (polishDiff < 0 ? 'FFDC2626' : 'FF6B7280') } }
      }

      r.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' }
      r.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' }
    })

    const dashRowsCount = dashSheet.rowCount
    for (let i = 2; i <= dashRowsCount; i++) {
      if (i === 4) continue // Empty row
      dashSheet.getRow(i).eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        }
      })
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     สร้าง Sheet ข้อมูลดิบ (ใช้ร่วมกันทั้ง 2 Mode)
     ═══════════════════════════════════════════════════════════════════════════ */
  createRawSheet('ข้อมูลรายรับ', false, records)
  createRawSheet('ข้อมูลรายจ่าย', true, expenses)

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `${fileName}.xlsx`)
  return true
}