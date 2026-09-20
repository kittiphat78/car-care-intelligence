import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/serverAuth'

// Rate limit store (in-memory, suitable for single-instance / edge)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10   // max requests per window
const RATE_WINDOW = 60 * 1000  // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  
  if (entry) {
    if (now < entry.resetTime) {
      if (entry.count >= RATE_LIMIT) return false
      entry.count++
    } else {
      entry.count = 1
      entry.resetTime = now + RATE_WINDOW
    }
  } else {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
  }
  
  // Cleanup stale entries
  if (rateLimitMap.size > 100) {
    for (const [key, val] of rateLimitMap) {
      if (now >= val.resetTime) rateLimitMap.delete(key)
    }
  }
  return true
}

/** Sanitize numeric input — prevent prompt injection via non-numeric values */
function sanitizeNumber(value: unknown): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  // Clamp to reasonable range for a car wash business
  return Math.max(-1_000_000, Math.min(1_000_000, Math.round(num)))
}

export async function POST(request: Request) {
  try {
    // 1. Rate limit check
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { text: '✦ ส่งคำขอมากเกินไป กรุณารอสักครู่' },
        { status: 429 }
      )
    }

    // 2. Auth check (shared utility from Step 4)
    const auth = await authenticateRequest()
    if (auth.error) return auth.error

    // 3. Parse and validate input
    const data = await request.json()

    const requiredFields = ['todayTotalIncome', 'todayExpense', 'netProfit', 'washCount', 'polishCount'] as const
    for (const field of requiredFields) {
      if (typeof data[field] !== 'number') {
        return NextResponse.json({ text: `✦ ข้อมูลไม่ครบ: ${field} ต้องเป็นตัวเลข` }, { status: 400 })
      }
    }

    // 4. Sanitize all numeric inputs before putting them in the prompt
    const todayTotalIncome = sanitizeNumber(data.todayTotalIncome)
    const todayExpense = sanitizeNumber(data.todayExpense)
    const netProfit = sanitizeNumber(data.netProfit)
    const washCount = sanitizeNumber(data.washCount)
    const polishCount = sanitizeNumber(data.polishCount)
    const unpaidCount = sanitizeNumber(data.unpaidCount ?? 0)
    const unpaidTotal = sanitizeNumber(data.unpaidTotal ?? 0)

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ text: '✦ กรุณาใส่ GEMINI_API_KEY ในไฟล์ .env.local เพื่อเปิดใช้งาน AI' })
    }

    // 5. Build prompt with sanitized values only
    const prompt = `
      คุณคือ "ผู้ช่วยร้านคนโปรด" ที่ร่าเริง ขยันขันแข็ง และรักเจ้าของร้านมาก หน้าที่ของคุณคือรายงานผลประกอบการร้านล้างรถประจำวันให้ "คุณแม่" ฟังอย่างอารมณ์ดี
      จงวิเคราะห์ข้อมูลของวันนี้ออกมาเป็นข้อๆ สั้นๆ 3-4 ข้อ 
      
      ข้อมูลวันนี้:
      - รายรับรวม: ${todayTotalIncome} บาท
      - รายจ่าย: ${todayExpense} บาท
      - กำไรสุทธิ: ${netProfit} บาท
      - ล้างรถ: ${washCount} คัน
      - ขัดสี: ${polishCount} คัน
      - ลูกค้าค้างชำระ: ${unpaidCount} คน (รวม ${unpaidTotal} บาท)
      
      กฎการตอบกลับ:
      - ตอบเฉพาะข้อความที่เป็นข้อๆ เริ่มต้นแต่ละข้อด้วย ✦ 
      - ห้ามมีคำทักทาย เกริ่นนำ หรือคำลงท้ายใดๆ ทั้งสิ้น
      - ใช้ภาษาที่ออดอ้อน น่ารัก เป็นกันเองเหมือนคุยกับญาติผู้ใหญ่ (เช่น ใช้คำว่า "คุณแม่", "หนู/ผม", "นะคะ/ครับ")
      - ไม่พูดเรื่องตัวเลขให้ดูเครียดเกินไป เน้นชื่นชมในวันที่กำไรดี และให้กำลังใจในวันที่รายจ่ายเยอะ
      - ให้คำแนะนำง่ายๆ ในการบริหารร้านพรุ่งนี้ หรือเตือนให้คุณแม่พักผ่อนบ้าง
    `
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    )

    const resData = await response.json()
    
    if (resData.error) {
      return NextResponse.json({ text: `✦ AI Error: ${resData.error.message}` })
    }
    
    const text = resData.candidates?.[0]?.content?.parts?.[0]?.text || '✦ ไม่สามารถวิเคราะห์ข้อมูลได้ในขณะนี้'

    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ text: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI' }, { status: 500 })
  }
}
