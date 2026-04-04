# 🚗 Car Wash Manager Pro (ระบบบริหารจัดการร้านล้างรถอัจฉริยะ)

ระบบ Web Application สำหรับบริหารจัดการร้านล้างรถคาร์แคร์ขนาด SME ที่ถูกออกแบบมาเพื่อ **"ลดภาระ เพิ่มความสบาย และอุดรอยรั่ว"** ของธุรกิจครอบครัวโดยเฉพาะ 

UI/UX ถูกออกแบบมาให้เป็นมิตรกับผู้ใช้งานวัยผู้ใหญ่ (User-Friendly for Elderly) เน้นการกดเลือก (Tap) ลดการพิมพ์ (Typing) และมีการแสดงผลข้อมูลแบบ Real-time ที่หน้า Dashboard ทำให้เจ้าของร้านมองเห็นภาพรวมธุรกิจได้ในหน้าเดียว

---

## ✨ Features (ฟีเจอร์เด่น)

* 📊 **Real-time Dashboard:** สรุปยอดรายรับ รายจ่าย กำไรสุทธิ และเปรียบเทียบเปอร์เซ็นต์การเติบโตกับวันก่อนหน้าแบบอัตโนมัติ
* 🌤️ **Smart Store Manager (ผู้จัดการร้าน AI):** * ดึงข้อมูลสภาพอากาศล่วงหน้าเพื่อแนะนำการเตรียมพร้อมรับมือลูกค้า
    * ดึงข้อมูลฝุ่น PM2.5 (AQI) จากเซ็นเซอร์จริงในพื้นที่ (จ.เชียงราย) พร้อมระบบแจ้งเตือนให้พนักงานสวมหน้ากากอนามัยเมื่อค่าฝุ่นเกินมาตรฐาน
* 📒 **Debt Tracking (สมุดทวงหนี้เต็นท์รถ):** ระบบบันทึกและติดตามยอดค้างชำระของลูกค้ากลุ่มเต็นท์รถ พร้อมปุ่ม "เคลียร์ยอด (จ่ายครบ)" ที่กดเพียงคลิกเดียวระบบจะอัปเดตสถานะรถทุกคันของลูกค้ารายนั้นให้ทันที
* ⚡ **Quick Add & Loyalty System:**
    * ระบบบันทึกรายการด่วน แยกล้างรถ / ขัดสี / รายจ่าย
    * **Loyalty Tracker:** จดจำป้ายทะเบียนและแจ้งเตือน "ลูกค้าประจำ" ทันทีเมื่อกรอกป้ายทะเบียน
    * **Quick Expense:** ปุ่มลัดสำหรับรายจ่ายที่ใช้บ่อย (เช่น ค่าน้ำยา, ค่าแรง) แบบเลื่อนปัดได้ (Drag-to-scroll)
* 🔒 **Kiosk Mode Protection:** ระบบป้องกันการปัดหน้าจอรีเฟรช (Pull-to-refresh) โดยไม่ได้ตั้งใจ หากมีการรีเฟรช ระบบจะพากลับไปที่หน้า Dashboard ทันทีเพื่อความต่อเนื่องในการทำงาน

---

## 🛠️ Tech Stack (เครื่องมือที่ใช้พัฒนา)

* **Frontend:** [Next.js](https://nextjs.org/) (App Router), React, Tailwind CSS
* **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL, Authentication, Real-time Subscriptions)
* **Data Visualization:** [Recharts](https://recharts.org/) (สำหรับกราฟสรุปรายได้)
* **External APIs:** * [Open-Meteo API](https://open-meteo.com/) (พยากรณ์อากาศ)
    * [WAQI API](https://aqicn.org/api/) (ข้อมูลคุณภาพอากาศ PM2.5 แบบ Real-time)

---

## 🚀 Getting Started (วิธีการรันโปรเจกต์)

1. **Clone repository:**
   ```bash
   git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
   cd your-repo-name
   Install dependencies:

2. **Install dependencies:**
   ```bash
   npm install

3. **Environment Variables:**
   สร้างไฟล์ .env.local ที่ Root ของโปรเจกต์ และใส่ค่า API Keys ของ Supabase:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

4. **Run the development server:**
   ```bash
   npm run dev

เปิดเบราว์เซอร์ไปที่ http://localhost:3000 เพื่อดูผลลัพธ์
