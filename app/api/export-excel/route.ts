import { NextResponse } from 'next/server'

// สร้างหน่วยความจำจำลอง (In-memory Store) สำหรับเก็บประวัติการ Request
// (หมายเหตุ: วิธีนี้เหมาะสำหรับระบบง่ายๆ หรือรันบนเซิร์ฟเวอร์ตัวเดียว หากเป็น Serverless อาจมีการรีเซ็ตค่าได้)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export async function GET(request: Request) {
  // 1. ดึง IP Address ของคนที่เรียก API
  // ใน Next.js (โดยเฉพาะเมื่อรันผ่าน Vercel หรือ Reverse Proxy) IP จะอยู่ใน Header 'x-forwarded-for'
  const ip = request.headers.get('x-forwarded-for') || 'unknown-ip'

  // 2. ตั้งค่า Rate Limit (5 ครั้ง ต่อ 1 นาที)
  const LIMIT = 5
  const WINDOW_MS = 60 * 1000 // 1 นาที (60,000 มิลลิวินาที)
  const currentTime = Date.now()

  // 3. ตรวจสอบประวัติการใช้งานของ IP นี้
  const limitData = rateLimitMap.get(ip)

  if (limitData) {
    // ถ้ายิงมาในช่วงเวลาเดิม (ยังไม่พ้น 1 นาที)
    if (currentTime < limitData.resetTime) {
      if (limitData.count >= LIMIT) {
        // ถ้ายิงเกินโควต้า 5 ครั้ง → บล็อกการเข้าถึง (HTTP 429 Too Many Requests)
        return NextResponse.json(
          { error: 'ส่งคำขอมากเกินไป กรุณารอสักครู่ (Rate limit exceeded)' },
          { status: 429 }
        )
      }
      // ถ้ายิงยังไม่เกินโควต้า → บวกจำนวนครั้งเพิ่ม
      limitData.count++
    } else {
      // ถ้าพ้น 1 นาทีไปแล้ว → รีเซ็ตจำนวนครั้งใหม่
      limitData.count = 1
      limitData.resetTime = currentTime + WINDOW_MS
    }
  } else {
    // ถ้าเพิ่งเคยยิงมาครั้งแรก → บันทึกข้อมูล IP นี้ลงในระบบ
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: currentTime + WINDOW_MS,
    })
  }

  // 🛡️ Cleanup: ลบ entries ที่หมดอายุแล้ว เพื่อป้องกัน memory leak
  if (rateLimitMap.size > 100) {
    for (const [key, val] of rateLimitMap) {
      if (currentTime >= val.resetTime) rateLimitMap.delete(key)
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     ส่วนของการดึงข้อมูลและการเขียนไฟล์ Excel หรือ Business Logic จะอยู่ตรงนี้
     (ในโปรเจกต์ของคุณ การ Export ตอนนี้ทำที่ฝั่ง Client แต่ถ้าจะย้ายมาทำที่ API ก็ทำในส่วนนี้ครับ)
     ═══════════════════════════════════════════════════════════════════════════ */

  return NextResponse.json({
    message: 'จำลองการส่งออกไฟล์ Excel สำเร็จ!',
    remainingRequests: LIMIT - (rateLimitMap.get(ip)?.count || 0),
  })
}
