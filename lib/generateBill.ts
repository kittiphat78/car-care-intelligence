import { jsPDF } from 'jspdf'
import type { Record as AppRecord } from '@/types'

/* ═══════════════════════════════════════════════════════════════════════════
   ข้อมูลร้าน — แก้ไขตรงนี้ถ้าข้อมูลเปลี่ยน
   ═══════════════════════════════════════════════════════════════════════════ */
const SHOP = {
  name: 'โรมิโอคาร์แคร์',
  address: '229/4 หมู่ 9 ต.รอบเวียง อ.เมืองเชียงราย จ.เชียงราย',
  phone: '095-697-8882 / 080-492-6364',
}

/* ═══════════════════════════════════════════════════════════════════════════
   ฟังก์ชันโหลดฟอนต์ Sarabun (รองรับภาษาไทย)
   ═══════════════════════════════════════════════════════════════════════════ */
async function loadFont(doc: jsPDF, url: string, fontName: string, fontStyle: string) {
  const res = await fetch(url)
  const buf = await res.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const base64 = btoa(binary)
  const fileName = `${fontName}-${fontStyle}.ttf`
  doc.addFileToVFS(fileName, base64)
  doc.addFont(fileName, fontName, fontStyle)
}

/* ═══════════════════════════════════════════════════════════════════════════
   สร้างเลขที่บิลอัตโนมัติ (RMyyMMdd-xxx)
   ═══════════════════════════════════════════════════════════════════════════ */
function generateBillNumber(): string {
  const now = new Date()
  const yy = (now.getFullYear() + 543).toString().slice(-2)
  const mm = (now.getMonth() + 1).toString().padStart(2, '0')
  const dd = now.getDate().toString().padStart(2, '0')
  const rand = Math.floor(Math.random() * 999).toString().padStart(3, '0')
  return `RM${yy}${mm}${dd}-${rand}`
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helper: วาดเส้น
   ═══════════════════════════════════════════════════════════════════════════ */
function line(doc: jsPDF, x1: number, y: number, x2: number, width = 0.2, color = 180) {
  doc.setDrawColor(color)
  doc.setLineWidth(width)
  doc.line(x1, y, x2, y)
}

/* ═══════════════════════════════════════════════════════════════════════════
   ฟังก์ชันหลัก — สร้างบิลเงินสด PDF และดาวน์โหลดอัตโนมัติ
   ═══════════════════════════════════════════════════════════════════════════ */
export async function generateCashBill(
  items: AppRecord[],
  customerName: string
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()  // 210
  const margin = 20
  const rightEdge = pageW - margin
  const contentW = rightEdge - margin

  // โหลดฟอนต์ Sarabun
  await loadFont(doc, '/fonts/Sarabun-Regular.ttf', 'Sarabun', 'normal')
  await loadFont(doc, '/fonts/Sarabun-Bold.ttf', 'Sarabun', 'bold')
  doc.setFont('Sarabun', 'normal')

  const billNo = generateBillNumber()
  const today = new Date()
  const thaiDate = today.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
  let y = margin + 2

  // ═════════════════════════════════════════════════════════════════════════
  //  1. HEADER — ชื่อร้าน + ข้อมูลติดต่อ
  // ═════════════════════════════════════════════════════════════════════════

  // ชื่อร้านกลางหน้า
  doc.setFont('Sarabun', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(40, 40, 40)
  doc.text(SHOP.name, pageW / 2, y, { align: 'center' })

  y += 7
  doc.setFont('Sarabun', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(SHOP.address, pageW / 2, y, { align: 'center' })
  y += 5
  doc.text(`โทร. ${SHOP.phone}`, pageW / 2, y, { align: 'center' })

  // ═════════════════════════════════════════════════════════════════════════
  //  2. TITLE — บิลเงินสด + เส้นคั่น
  // ═════════════════════════════════════════════════════════════════════════

  y += 10
  doc.setFont('Sarabun', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(40, 40, 40)
  doc.text('บิลเงินสด', pageW / 2, y, { align: 'center' })

  y += 3
  line(doc, margin, y, rightEdge, 0.5, 60)

  // ═════════════════════════════════════════════════════════════════════════
  //  3. ข้อมูลบิล — เลขที่ / วันที่ / ลูกค้า
  // ═════════════════════════════════════════════════════════════════════════

  y += 8
  doc.setFont('Sarabun', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)

  doc.setFont('Sarabun', 'bold')
  doc.text('เลขที่:', margin, y)
  doc.setFont('Sarabun', 'normal')
  doc.text(billNo, margin + 16, y)

  doc.setFont('Sarabun', 'bold')
  doc.text('วันที่:', rightEdge - 50, y)
  doc.setFont('Sarabun', 'normal')
  doc.text(thaiDate, rightEdge - 36, y)

  y += 7
  doc.setFont('Sarabun', 'bold')
  doc.text('ลูกค้า:', margin, y)
  doc.setFont('Sarabun', 'normal')
  doc.text(customerName || '-', margin + 16, y)

  y += 5
  line(doc, margin, y, rightEdge, 0.2, 180)

  // ═════════════════════════════════════════════════════════════════════════
  //  4. ตารางรายการ
  // ═════════════════════════════════════════════════════════════════════════

  y += 6

  // Column positions
  const col = {
    no:     margin,
    noW:    12,
    desc:   margin + 12,
    descW:  contentW - 12 - 30 - 30,
    unit:   rightEdge - 60,
    unitW:  30,
    amount: rightEdge - 30,
    amountW: 30,
  }

  // Table header
  const headerH = 9
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y, contentW, headerH, 'F')
  doc.setDrawColor(200)
  doc.setLineWidth(0.3)
  doc.rect(margin, y, contentW, headerH, 'S')

  doc.setFont('Sarabun', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text('ลำดับ', col.no + col.noW / 2, y + 6.5, { align: 'center' })
  doc.text('รายการ', col.desc + 4, y + 6.5)
  doc.text('หน่วยละ', col.unit + col.unitW / 2, y + 6.5, { align: 'center' })
  doc.text('จำนวนเงิน', col.amount + col.amountW / 2, y + 6.5, { align: 'center' })

  // Vertical header lines
  doc.line(col.desc, y, col.desc, y + headerH)
  doc.line(col.unit, y, col.unit, y + headerH)
  doc.line(col.amount, y, col.amount, y + headerH)

  // Data rows
  y += headerH
  const rowH = 9
  let grandTotal = 0

  doc.setFont('Sarabun', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)

  items.forEach((item, idx) => {
    const rowY = y + (idx * rowH)
    const services = item.services || []
    const typeName = item.type === 'wash' ? 'ล้างรถ' : 'ขัดสี'
    const carType = services[0] || ''
    const brand = services[1] || ''
    const note = services[2] && services[2].trim() !== '' && services[2] !== '-' ? services[2].trim() : ''

    let desc = `${item.plate} — ${typeName}`
    if (brand) desc += ` (${brand})`
    if (carType) desc += ` ${carType}`
    if (note) desc += `  [${note}]`

    // สีพื้นหลังสลับ
    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 250)
      doc.rect(margin, rowY, contentW, rowH, 'F')
    }

    // Row border
    doc.setDrawColor(220)
    doc.setLineWidth(0.15)
    doc.rect(margin, rowY, contentW, rowH, 'S')

    // Vertical lines
    doc.line(col.desc, rowY, col.desc, rowY + rowH)
    doc.line(col.unit, rowY, col.unit, rowY + rowH)
    doc.line(col.amount, rowY, col.amount, rowY + rowH)

    // Content
    doc.setFont('Sarabun', 'normal')
    doc.text(`${idx + 1}`, col.no + col.noW / 2, rowY + 6.5, { align: 'center' })
    // Truncate description if too long
    const maxDescW = col.descW - 6
    const descText = doc.getTextWidth(desc) > maxDescW ? desc.substring(0, 30) + '...' : desc
    doc.text(descText, col.desc + 4, rowY + 6.5)
    doc.text(`${item.price.toLocaleString()}`, col.unit + col.unitW - 4, rowY + 6.5, { align: 'right' })
    doc.setFont('Sarabun', 'bold')
    doc.text(`${item.price.toLocaleString()}`, col.amount + col.amountW - 4, rowY + 6.5, { align: 'right' })
    doc.setFont('Sarabun', 'normal')

    grandTotal += item.price
  })

  // Empty rows to fill at least 8
  const minRows = 8
  const emptyRows = Math.max(0, minRows - items.length)
  for (let i = 0; i < emptyRows; i++) {
    const rowY = y + ((items.length + i) * rowH)
    doc.setDrawColor(220)
    doc.setLineWidth(0.15)
    doc.rect(margin, rowY, contentW, rowH, 'S')
    doc.line(col.desc, rowY, col.desc, rowY + rowH)
    doc.line(col.unit, rowY, col.unit, rowY + rowH)
    doc.line(col.amount, rowY, col.amount, rowY + rowH)
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  5. แถวรวมเงิน
  // ═════════════════════════════════════════════════════════════════════════

  const totalRowY = y + (Math.max(items.length, minRows) * rowH)
  const totalH = 11
  doc.setFillColor(40, 40, 40)
  doc.rect(margin, totalRowY, contentW, totalH, 'F')

  doc.setFont('Sarabun', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.text('รวมเงินทั้งสิ้น', col.unit - 4, totalRowY + 8, { align: 'right' })
  doc.setFontSize(14)
  doc.text(`฿${grandTotal.toLocaleString()}`, col.amount + col.amountW - 4, totalRowY + 8, { align: 'right' })

  // ═════════════════════════════════════════════════════════════════════════
  //  6. หมายเหตุ (ถ้ามี)
  // ═════════════════════════════════════════════════════════════════════════

  let noteY = totalRowY + totalH + 10
  const notesFromItems = items
    .map((item, idx) => {
      const note = item.services?.[2]
      if (note && note.trim() !== '' && note !== '-') {
        return `${idx + 1}. ${item.plate}: ${note.trim()}`
      }
      return null
    })
    .filter(Boolean)

  if (notesFromItems.length > 0) {
    doc.setFont('Sarabun', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.text('หมายเหตุ:', margin, noteY)
    noteY += 5

    doc.setFont('Sarabun', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    notesFromItems.forEach(note => {
      doc.text(note as string, margin + 2, noteY)
      noteY += 4.5
    })
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  7. ลายเซ็น + ตราปั้ม
  // ═════════════════════════════════════════════════════════════════════════

  const sigY = Math.max(noteY + 10, totalRowY + totalH + 35)

  // ตราปั้มร้าน (วงกลม)
  const stampX = pageW / 2 + 35
  const stampY = sigY - 5
  const stampR = 16

  // วงกลมนอก
  doc.setDrawColor(200, 50, 50)
  doc.setLineWidth(1.2)
  doc.circle(stampX, stampY, stampR, 'S')

  // วงกลมใน
  doc.setLineWidth(0.5)
  doc.circle(stampX, stampY, stampR - 3, 'S')

  // ข้อความในตราปั้ม
  doc.setFont('Sarabun', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(200, 50, 50)
  doc.text(SHOP.name, stampX, stampY - 1, { align: 'center' })
  doc.setFontSize(8)
  doc.text('CAR CARE', stampX, stampY + 4, { align: 'center' })


  // ช่องลายเซ็น
  doc.setTextColor(60, 60, 60)
  doc.setFont('Sarabun', 'normal')
  doc.setFontSize(11)
  line(doc, margin + 10, sigY + 10, margin + 70, 0.3, 150)
  doc.text('ผู้รับเงิน', margin + 40, sigY + 16, { align: 'center' })

  // ═════════════════════════════════════════════════════════════════════════
  //  8. Footer
  // ═════════════════════════════════════════════════════════════════════════

  doc.setFontSize(8)
  doc.setTextColor(180, 180, 180)
  doc.text(`ออกโดยระบบ ${SHOP.name}  •  ${billNo}`, pageW / 2, 288, { align: 'center' })

  // ─── ดาวน์โหลดไฟล์ ───
  doc.save(`บิลเงินสด_${customerName}_${billNo}.pdf`)
}
