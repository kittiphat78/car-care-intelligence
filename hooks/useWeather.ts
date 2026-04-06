import { useState, useEffect } from 'react'

export interface WeatherData {
  icon: string
  condition: string
  temp: number
  prob: number
  aqi: number
  aqiStatus: { label: string; colorClass: string }
  message: string
  bgClass: string
  textClass: string
  badgeClass: string
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useEffect(() => {
    const controller = new AbortController() // 🛡️ ป้องกัน Memory Leak

    const fetchWeather = async () => {
      let icon = '☁️'; let condition = 'กำลังอัปเดต...'; let temp = 0; let prob = 0;
      let message = 'กำลังวิเคราะห์สภาพอากาศและฝุ่น...';
      let aqiValue = 0;
      let aqiStatus = { label: 'รอข้อมูล', colorClass: 'bg-gray-100 text-gray-500 border-gray-300' };
      let bgClass = 'from-[#F0F9FF] to-[#E0F2FE] border-[#BAE6FD]';
      let textClass = 'text-[#0369A1]';
      let badgeClass = 'bg-[#BAE6FD] text-[#0284C7]';
      let probTom = 0;

      const timestamp = Date.now();

      try {
        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=19.91&longitude=99.84&current=temperature_2m,weather_code&hourly=precipitation_probability&daily=precipitation_probability_max&timezone=Asia%2FBangkok&forecast_days=2&_t=${timestamp}`,
          { cache: 'no-store', signal: controller.signal }
        );
        
        if (wRes.ok) {
          const data = await wRes.json();
          const currentCode = data.current?.weather_code ?? 0;
          temp = Math.round(data.current?.temperature_2m ?? 30);
          
          const currentHour = new Date().getHours();
          const remainingProbsToday = data.hourly?.precipitation_probability?.slice(currentHour, 24) || [];
          prob = remainingProbsToday.length > 0 
            ? Math.max(...remainingProbsToday) 
            : (data.daily?.precipitation_probability_max?.[0] ?? 0);
            
          probTom = data.daily?.precipitation_probability_max?.[1] ?? 0;

          if (currentCode <= 1) { icon = '☀️'; condition = 'แดดจัด'; }
          else if (currentCode <= 3) { icon = '⛅'; condition = 'มีเมฆบางส่วน'; }
          else if (currentCode <= 67) { icon = '🌧️'; condition = 'ฝนตก'; }
          else if (currentCode <= 82) { icon = '🌦️'; condition = 'ฝนตกหนัก'; }
          else { icon = '⛈️'; condition = 'พายุเข้า'; }

          if (currentCode <= 3) {
            if (prob > 50) {
              message = `ตอนนี้ฟ้าเปิด แต่เดี๋ยวจะมีโอกาสฝนตก ${prob}% ให้รีบกอบโกยทำรอบเลยครับ!`;
            } else if (probTom > 50) {
              message = `วันนี้อากาศดี ลุยเต็มที่เลยครับ! (พรุ่งนี้มีแววฝนตก ${probTom}%)`;
            } else {
              message = 'ท้องฟ้าแจ่มใส ลูกค้าเข้าต่อเนื่องแน่นอน เตรียมกำลังคนและน้ำยาให้พร้อมลุย!';
            }
            bgClass = 'from-[#FFF7ED] to-[#FFEDD5] border-[#FED7AA]';
            textClass = 'text-[#C2410C]';
            badgeClass = 'bg-[#FED7AA] text-[#C2410C]';
          } else {
            message = `ตอนนี้ฟ้าฝนไม่เป็นใจ ลูกค้าน่าจะเงียบ ให้ลูกน้องสลับพักหรือเช็คสต๊อกน้ำยาได้เลยครับ`;
            bgClass = 'from-[#F3F4F6] to-[#E5E7EB] border-[#D1D5DB]';
            textClass = 'text-[#374151]';
            badgeClass = 'bg-[#D1D5DB] text-[#4B5563]';
          }
        }
      } catch (err: any) { 
        if (err.name !== 'AbortError') console.error("โหลดอากาศไม่สำเร็จ:", err) 
      }

      try {
        const aqRes = await fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=19.91&longitude=99.84&current=us_aqi&timezone=Asia%2FBangkok&_t=${timestamp}`,
          { cache: 'no-store', signal: controller.signal }
        );
        if (aqRes.ok) {
          const aqData = await aqRes.json();
          aqiValue = Math.round(aqData.current?.us_aqi ?? 0);
        }
      } catch (err: any) { 
        if (err.name !== 'AbortError') console.error("โหลดฝุ่นไม่สำเร็จ:", err) 
      }

      if (aqiValue > 300) {
        aqiStatus = { label: 'วิกฤต', colorClass: 'bg-[#4C0519] text-white border-[#881337]' };
        message += ' 🚨 วิกฤตฝุ่นทะลุพิกัด อันตรายมากๆ ให้ช่างใส่หน้ากาก N95 ตลอดเวลา!';
      } else if (aqiValue > 200) {
        aqiStatus = { label: 'อันตรายมาก', colorClass: 'bg-purple-100 text-purple-800 border-purple-300' };
        message += ' 🚨 ฝุ่นระดับสีม่วง (200+) อันตรายมาก ให้ช่างใส่หน้ากาก N95 ด้วยนะครับ!';
      } else if (aqiValue > 150) {
        aqiStatus = { label: 'อันตราย', colorClass: 'bg-red-100 text-red-700 border-red-300' };
        message += ' 😷 ปล. ตอนนี้ฝุ่นเริ่มแดง อย่าลืมให้ช่างใส่หน้ากากป้องกันตอนทำงานนะครับ';
      } else if (aqiValue > 100) {
        aqiStatus = { label: 'เริ่มมีผลกระทบ', colorClass: 'bg-orange-100 text-orange-700 border-orange-300' };
      } else if (aqiValue > 50) {
        aqiStatus = { label: 'ปานกลาง', colorClass: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
      } else if (aqiValue > 0) {
        aqiStatus = { label: 'ดี', colorClass: 'bg-green-100 text-green-700 border-green-300' };
      }

      setWeather({ icon, condition, temp, prob, aqi: aqiValue, aqiStatus, message, bgClass, textClass, badgeClass });
    }

    fetchWeather();
    const intervalId = setInterval(fetchWeather, 15 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
      controller.abort(); // ทำลาย Request ที่ค้างอยู่เมื่อเปลี่ยนหน้า
    }
  }, [])

  return weather
}