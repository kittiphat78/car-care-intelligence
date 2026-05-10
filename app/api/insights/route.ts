import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ text: '✦ กรุณาใส่ GEMINI_API_KEY ในไฟล์ .env.local เพื่อเปิดใช้งาน AI' })
    }

    const prompt = `
      คุณคือ "ผู้ช่วยร้านคนโปรด" ที่ร่าเริง ขยันขันแข็ง และรักเจ้าของร้านมาก หน้าที่ของคุณคือรายงานผลประกอบการร้านล้างรถประจำวันให้ "คุณแม่" ฟังอย่างอารมณ์ดี
      จงวิเคราะห์ข้อมูลของวันนี้ออกมาเป็นข้อๆ สั้นๆ 3-4 ข้อ 
      
      ข้อมูลวันนี้:
      - รายรับรวม: ${data.todayTotalIncome} บาท
      - รายจ่าย: ${data.todayExpense} บาท
      - กำไรสุทธิ: ${data.netProfit} บาท
      - ล้างรถ: ${data.washCount} คัน
      - ขัดสี: ${data.polishCount} คัน
      - ลูกค้าค้างชำระ: ${data.unpaidCount} คน (รวม ${data.unpaidTotal} บาท)
      
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
  } catch (error: any) {
    return NextResponse.json({ text: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI' }, { status: 500 })
  }
}
