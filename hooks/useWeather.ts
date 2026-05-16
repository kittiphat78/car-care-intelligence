import { useState, useEffect, useCallback, useRef } from 'react'

export interface WeatherData {
  icon: string
  condition: string
  temp: number
  feelsLike: number
  humidity: number
  windSpeed: number
  prob: number
  aqi: number
  aqiStatus: { label: string; colorClass: string }
  message: string
  bgClass: string
  textClass: string
  badgeClass: string
  lastUpdated: string  // เวลาอัปเดตล่าสุด
}

// ── WMO Weather Code Mapping ──
// อ้างอิง: https://open-meteo.com/en/docs#weathervariables
function mapWeatherCode(code: number, isNight: boolean): { icon: string; condition: string; group: 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'heavyrain' | 'snow' | 'storm' } {
  if (code <= 0) return { icon: isNight ? '🌙' : '☀️', condition: isNight ? 'ท้องฟ้าแจ่มใส' : 'แดดจัด', group: 'clear' }
  if (code <= 1) return { icon: isNight ? '🌙' : '☀️', condition: isNight ? 'ฟ้าโปร่ง' : 'แดดจ้า', group: 'clear' }
  if (code <= 2) return { icon: isNight ? '☁️' : '⛅', condition: 'มีเมฆบางส่วน', group: 'cloudy' }
  if (code <= 3) return { icon: '☁️', condition: 'เมฆเต็มท้องฟ้า', group: 'cloudy' }
  if (code <= 48) return { icon: '🌫️', condition: 'หมอกลง', group: 'fog' }
  if (code <= 57) return { icon: '🌦️', condition: 'ฝนปรอยๆ', group: 'drizzle' }
  if (code <= 65) return { icon: '🌧️', condition: 'ฝนตก', group: 'rain' }
  if (code <= 67) return { icon: '🌧️', condition: 'ฝนเย็นจัด', group: 'rain' }
  if (code <= 77) return { icon: '❄️', condition: 'หิมะ', group: 'snow' }
  if (code <= 82) return { icon: '🌧️', condition: 'ฝนตกหนัก', group: 'heavyrain' }
  if (code <= 86) return { icon: '❄️', condition: 'พายุหิมะ', group: 'snow' }
  return { icon: '⛈️', condition: 'พายุฝนฟ้าคะนอง', group: 'storm' }
}

// ── สีพื้นหลังตามกลุ่มสภาพอากาศ + กลางวัน/กลางคืน ──
function getWeatherTheme(group: string, isNight: boolean) {
  // 🌙 ธีมกลางคืน — โทนเข้ม ดูพรีเมียม
  if (isNight) {
    switch (group) {
      case 'clear':
        return {
          bgClass: 'from-[#1E1B4B] to-[#312E81] border-[#4338CA]',
          textClass: 'text-[#E0E7FF]',
          badgeClass: 'bg-[#3730A3]/50 text-[#C7D2FE]',
        }
      case 'cloudy':
        return {
          bgClass: 'from-[#1E293B] to-[#334155] border-[#475569]',
          textClass: 'text-[#CBD5E1]',
          badgeClass: 'bg-[#475569]/50 text-[#E2E8F0]',
        }
      case 'fog':
        return {
          bgClass: 'from-[#1E293B] to-[#374151] border-[#4B5563]',
          textClass: 'text-[#E5E7EB]',
          badgeClass: 'bg-[#4B5563]/50 text-[#F3F4F6]',
        }
      case 'drizzle':
        return {
          bgClass: 'from-[#0C4A6E] to-[#164E63] border-[#155E75]',
          textClass: 'text-[#BAE6FD]',
          badgeClass: 'bg-[#155E75]/50 text-[#E0F2FE]',
        }
      case 'rain':
      case 'heavyrain':
        return {
          bgClass: 'from-[#1E293B] to-[#0F172A] border-[#334155]',
          textClass: 'text-[#E2E8F0]',
          badgeClass: 'bg-[#334155]/50 text-[#F1F5F9]',
        }
      case 'storm':
        return {
          bgClass: 'from-[#2E1065] to-[#1E1B4B] border-[#5B21B6]',
          textClass: 'text-[#EDE9FE]',
          badgeClass: 'bg-[#4C1D95]/50 text-[#F5F3FF]',
        }
      default:
        return {
          bgClass: 'from-[#1E293B] to-[#334155] border-[#475569]',
          textClass: 'text-[#CBD5E1]',
          badgeClass: 'bg-[#475569]/50 text-[#E2E8F0]',
        }
    }
  }

  // ☀️ ธีมกลางวัน
  switch (group) {
    case 'clear':
      return {
        bgClass: 'from-[#FFF7ED] to-[#FFEDD5] border-[#FED7AA]',
        textClass: 'text-[#C2410C]',
        badgeClass: 'bg-[#FED7AA] text-[#C2410C]',
      }
    case 'cloudy':
      return {
        bgClass: 'from-[#F8FAFC] to-[#F1F5F9] border-[#CBD5E1]',
        textClass: 'text-[#475569]',
        badgeClass: 'bg-[#E2E8F0] text-[#475569]',
      }
    case 'fog':
      return {
        bgClass: 'from-[#F8FAFC] to-[#E2E8F0] border-[#94A3B8]',
        textClass: 'text-[#475569]',
        badgeClass: 'bg-[#CBD5E1] text-[#334155]',
      }
    case 'drizzle':
      return {
        bgClass: 'from-[#F0F9FF] to-[#E0F2FE] border-[#7DD3FC]',
        textClass: 'text-[#0369A1]',
        badgeClass: 'bg-[#BAE6FD] text-[#0284C7]',
      }
    case 'rain':
      return {
        bgClass: 'from-[#E0E7FF] to-[#C7D2FE] border-[#A5B4FC]',
        textClass: 'text-[#3730A3]',
        badgeClass: 'bg-[#C7D2FE] text-[#4338CA]',
      }
    case 'heavyrain':
      return {
        bgClass: 'from-[#DBEAFE] to-[#BFDBFE] border-[#93C5FD]',
        textClass: 'text-[#1E40AF]',
        badgeClass: 'bg-[#BFDBFE] text-[#1D4ED8]',
      }
    case 'storm':
      return {
        bgClass: 'from-[#F5F3FF] to-[#EDE9FE] border-[#C4B5FD]',
        textClass: 'text-[#5B21B6]',
        badgeClass: 'bg-[#DDD6FE] text-[#6D28D9]',
      }
    default:
      return {
        bgClass: 'from-[#F0F9FF] to-[#E0F2FE] border-[#BAE6FD]',
        textClass: 'text-[#0369A1]',
        badgeClass: 'bg-[#BAE6FD] text-[#0284C7]',
      }
  }
}

// ── สร้างข้อความแนะนำสำหรับร้านล้างรถ ──
function buildWeatherMessage(group: string, prob: number, probTom: number, temp: number, humidity: number): string {
  // ตอนกลางคืน (ร้านปิด)
  const hour = new Date().getHours()
  if (hour >= 20 || hour < 6) {
    if (probTom > 50) return `พรุ่งนี้มีโอกาสฝนตก ${probTom}% อย่าลืมเก็บอุปกรณ์เข้าที่กันน้ำก่อนกลับบ้านนะครับ!`
    return 'หมดเวลาทำงานแล้ว พักผ่อนให้เต็มที่ พรุ่งนี้ลุยใหม่ครับ! 💪'
  }

  switch (group) {
    case 'clear':
      if (temp >= 38) return `แดดแรงมาก (${temp}°C) ดื่มน้ำเยอะๆ ลูกค้าอาจอยากได้เคลือบเงาป้องกัน UV ให้แนะนำบริการเสริมเลยครับ!`
      if (prob > 50) return `ตอนนี้ฟ้าเปิด แต่เดี๋ยวจะมีโอกาสฝนตก ${prob}% รีบกอบโกยก่อนฝนมาเลยครับ!`
      if (probTom > 50) return `วันนี้อากาศดี ลุยเต็มที่เลยครับ! (พรุ่งนี้มีแววฝนตก ${probTom}%)`
      return 'ท้องฟ้าแจ่มใส ลูกค้าเข้าต่อเนื่องแน่นอน เตรียมกำลังคนและน้ำยาให้พร้อมลุย!'
    case 'cloudy':
      if (prob > 50) return `เมฆเยอะ โอกาสฝนตก ${prob}% ให้เตรียมผ้าใบคลุมรถที่ล้างเสร็จไว้ด้วยนะครับ!`
      return 'ฟ้าครึ้มๆ แต่ยังพอทำงานได้ดี อากาศไม่ร้อนมาก ช่างทำงานสบายครับ'
    case 'fog':
      return 'หมอกลงหนา ทัศนวิสัยต่ำ ระวังลูกค้าเข้าออกลานจอด ดูแลความปลอดภัยให้ดีครับ'
    case 'drizzle':
      return 'ฝนปรอยๆ ลูกค้าอาจชะลอเข้าร้าน ใช้เวลานี้เช็คสต๊อกน้ำยาและเตรียมอุปกรณ์ให้พร้อมครับ'
    case 'rain':
      if (humidity > 85) return `ฝนตก ความชื้นสูง (${humidity}%) รถที่ล้างเสร็จจะแห้งช้า ให้เช็ดซ้ำก่อนส่งมอบลูกค้านะครับ`
      return 'ฟ้าฝนไม่เป็นใจ ลูกค้าน่าจะเงียบ ให้ลูกน้องสลับพักหรือเช็คสต๊อกน้ำยาได้เลยครับ'
    case 'heavyrain':
      return '⚠️ ฝนตกหนักมาก ระวังน้ำท่วมลาน ให้หยุดรับงานชั่วคราวและเก็บอุปกรณ์ให้ดีครับ'
    case 'storm':
      return '⛈️ พายุเข้า! หยุดทำงานกลางแจ้ง อพยพเข้าที่กำบัง ระวังฟ้าผ่าและลมแรงครับ!'
    default:
      return 'กำลังวิเคราะห์สภาพอากาศ...'
  }
}

// ── ฟอร์แมตเวลาอัปเดต ──
function formatUpdateTime(date: Date): string {
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

// ── ตั้งค่า interval ──
const FETCH_INTERVAL_MS = 5 * 60 * 1000   // ⏱️ ดึงข้อมูลทุก 5 นาที (เดิม 15 นาที)
const RETRY_DELAY_MS = 30 * 1000          // 🔄 retry ถ้า fetch ล้มเหลว ทุก 30 วินาที
const MAX_RETRIES = 3

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchWeather = useCallback(async (signal?: AbortSignal) => {
    const timestamp = Date.now()
    const hour = new Date().getHours()
    const isNight = hour >= 18 || hour < 6

    let icon = '☁️'; let condition = 'กำลังอัปเดต...'; let temp = 0; let feelsLike = 0;
    let humidity = 0; let windSpeed = 0; let prob = 0; let probTom = 0;
    let aqiValue = 0;
    let weatherGroup: string = 'cloudy';
    let aqiStatus = { label: 'รอข้อมูล', colorClass: 'bg-gray-100 text-gray-500 border-gray-300' };
    let fetchSuccess = false;

    // ── 1. ดึงข้อมูลอากาศ ──
    try {
      const wRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=19.91&longitude=99.84&current=temperature_2m,weather_code,relative_humidity_2m,apparent_temperature,wind_speed_10m&hourly=precipitation_probability&daily=precipitation_probability_max&timezone=Asia%2FBangkok&forecast_days=2&_t=${timestamp}`,
        { cache: 'no-store', signal }
      );
      
      if (wRes.ok) {
        const data = await wRes.json();
        const currentCode = data.current?.weather_code ?? 0;
        temp = Math.round(data.current?.temperature_2m ?? 30);
        feelsLike = Math.round(data.current?.apparent_temperature ?? temp);
        humidity = Math.round(data.current?.relative_humidity_2m ?? 0);
        windSpeed = Math.round(data.current?.wind_speed_10m ?? 0);
        
        // หา precipitation probability ที่เหลือของวันนี้
        const currentHour = new Date().getHours();
        const remainingProbsToday = data.hourly?.precipitation_probability?.slice(currentHour, 24) || [];
        prob = remainingProbsToday.length > 0 
          ? Math.max(...remainingProbsToday) 
          : (data.daily?.precipitation_probability_max?.[0] ?? 0);
          
        probTom = data.daily?.precipitation_probability_max?.[1] ?? 0;

        // แปลง weather code เป็น icon + condition
        const mapped = mapWeatherCode(currentCode, isNight);
        icon = mapped.icon;
        condition = mapped.condition;
        weatherGroup = mapped.group;
        
        fetchSuccess = true;
      }
    } catch (err: unknown) { 
      if (err instanceof Error && err.name !== 'AbortError') console.error("โหลดอากาศไม่สำเร็จ:", err) 
    }

    // ── 2. ดึงข้อมูลคุณภาพอากาศ (AQI) ──
    try {
      const aqRes = await fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=19.91&longitude=99.84&current=us_aqi&timezone=Asia%2FBangkok&_t=${timestamp}`,
        { cache: 'no-store', signal }
      );
      if (aqRes.ok) {
        const aqData = await aqRes.json();
        aqiValue = Math.round(aqData.current?.us_aqi ?? 0);
        fetchSuccess = true;
      }
    } catch (err: unknown) { 
      if (err instanceof Error && err.name !== 'AbortError') console.error("โหลดฝุ่นไม่สำเร็จ:", err) 
    }

    // ── 3. ถ้าดึงไม่สำเร็จเลย → retry ──
    if (!fetchSuccess) {
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++
        retryTimerRef.current = setTimeout(() => fetchWeather(signal), RETRY_DELAY_MS)
      }
      return // ไม่ update state ถ้าไม่มีข้อมูลใหม่
    }
    retryCountRef.current = 0 // reset retry counter

    // ── 4. จัดระดับ AQI ──
    if (aqiValue > 300) {
      aqiStatus = { label: 'วิกฤต', colorClass: 'bg-[#4C0519] text-white border-[#881337]' };
    } else if (aqiValue > 200) {
      aqiStatus = { label: 'อันตรายมาก', colorClass: 'bg-purple-100 text-purple-800 border-purple-300' };
    } else if (aqiValue > 150) {
      aqiStatus = { label: 'อันตราย', colorClass: 'bg-red-100 text-red-700 border-red-300' };
    } else if (aqiValue > 100) {
      aqiStatus = { label: 'เริ่มมีผลกระทบ', colorClass: 'bg-orange-100 text-orange-700 border-orange-300' };
    } else if (aqiValue > 50) {
      aqiStatus = { label: 'ปานกลาง', colorClass: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    } else if (aqiValue > 0) {
      aqiStatus = { label: 'ดี', colorClass: 'bg-green-100 text-green-700 border-green-300' };
    }

    // ── 5. สร้างข้อความ + theme ──
    let message = buildWeatherMessage(weatherGroup, prob, probTom, temp, humidity);
    const theme = getWeatherTheme(weatherGroup, isNight);

    // เพิ่มคำเตือน AQI ถ้าสูง
    if (aqiValue > 200) {
      message += ' 🚨 ฝุ่นระดับสีม่วง (200+) อันตรายมาก ให้ช่างใส่หน้ากาก N95 ด้วยนะครับ!'
    } else if (aqiValue > 150) {
      message += ' 😷 ปล. ตอนนี้ฝุ่นเริ่มแดง อย่าลืมให้ช่างใส่หน้ากากป้องกันตอนทำงานนะครับ'
    }

    setWeather({
      icon, condition, temp, feelsLike, humidity, windSpeed,
      prob, aqi: aqiValue, aqiStatus, message,
      ...theme,
      lastUpdated: formatUpdateTime(new Date()),
    });
  }, [])

  useEffect(() => {
    // 🛡️ สร้าง AbortController ใหม่ทุกครั้งที่ mount (แก้ bug เดิม)
    const controller = new AbortController()

    // fetch ทันที
    fetchWeather(controller.signal)

    // ⏱️ ตั้ง interval 5 นาที (เดิม 15 นาที)
    const intervalId = setInterval(() => fetchWeather(controller.signal), FETCH_INTERVAL_MS)

    return () => {
      clearInterval(intervalId)
      controller.abort()
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [fetchWeather])

  return weather
}