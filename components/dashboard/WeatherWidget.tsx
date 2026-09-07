import { memo } from 'react'
import { WeatherData } from '@/hooks/useWeather'
import { AISparklesIcon } from '@/components/icons/DashboardIcons'

export const WeatherWidget = memo(function WeatherWidget({ weather }: { weather: WeatherData }) {
  // ตรวจจับว่าเป็นธีมเข้ม (กลางคืน) จากค่าสี background
  const isDark = weather.bgClass.includes('#1E') || weather.bgClass.includes('#0F') || weather.bgClass.includes('#0C') || weather.bgClass.includes('#2E') || weather.bgClass.includes('#31')
  const glassLight = isDark ? 'bg-white/10 border-white/15' : 'bg-white/40 border-white/50'
  const glassMedium = isDark ? 'bg-white/15 border-white/20' : 'bg-white/60 border-white/60'
  const iconBg = isDark ? 'bg-white/15 border-white/20' : 'bg-white border-white/50 shadow-sm'
  const updateBg = isDark ? 'bg-white/10 border-white/20' : 'bg-white/50 border-white/60'

  return (
    <section
      className={`rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 bg-gradient-to-br ${weather.bgClass} border fade-up delay-1 transition-colors duration-500`}
      aria-label="สภาพอากาศเชียงราย"
    >
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`w-14 h-14 rounded-2xl ${iconBg} border flex items-center justify-center text-3xl shrink-0`} aria-hidden="true">{weather.icon}</div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <p className={`text-[11px] font-extrabold uppercase tracking-widest opacity-80 ${weather.textClass}`}>เมืองเชียงราย 📍</p>
              <span className={`flex items-center gap-1 ${updateBg} px-2 py-0.5 rounded-full border`}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
                <span className={`text-[10px] font-bold opacity-70 ${weather.textClass}`}>อัปเดต {weather.lastUpdated} น.</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-[13px] font-bold px-2.5 py-1 rounded-lg shadow-sm ${weather.badgeClass}`}>{weather.condition} {weather.temp}°C</span>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border shadow-sm ${weather.aqiStatus.colorClass} flex items-center gap-1`}>
                <span className="opacity-80">🌫️ AQI:</span> {weather.aqi > 0 ? weather.aqi : '...'} ({weather.aqiStatus.label})
              </span>
            </div>
          </div>
        </div>
        {weather.prob > 0 && (
          <div className={`text-right shrink-0 ${glassLight} px-3 py-2 rounded-xl border shadow-sm`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider opacity-70 ${weather.textClass}`}>โอกาสฝน</p>
            <div className="flex items-baseline justify-end gap-0.5 mt-0.5">
              <p className={`text-lg font-extrabold leading-none ${weather.textClass}`}>{weather.prob}</p>
              <p className={`text-xs font-bold ${weather.textClass}`}>%</p>
            </div>
          </div>
        )}
      </div>

      {/* แถวข้อมูลเพิ่มเติม: รู้สึกเหมือน, ความชื้น, ลม */}
      <div className="flex gap-2 mb-4">
        <div className={`flex-1 ${glassLight} rounded-xl px-3 py-2 border text-center`}>
          <p className={`text-[10px] font-bold opacity-60 ${weather.textClass}`}>รู้สึกเหมือน</p>
          <p className={`text-sm font-extrabold ${weather.textClass}`}>{weather.feelsLike}°C</p>
        </div>
        <div className={`flex-1 ${glassLight} rounded-xl px-3 py-2 border text-center`}>
          <p className={`text-[10px] font-bold opacity-60 ${weather.textClass}`}>💧 ความชื้น</p>
          <p className={`text-sm font-extrabold ${weather.textClass}`}>{weather.humidity}%</p>
        </div>
        <div className={`flex-1 ${glassLight} rounded-xl px-3 py-2 border text-center`}>
          <p className={`text-[10px] font-bold opacity-60 ${weather.textClass}`}>💨 ลม</p>
          <p className={`text-sm font-extrabold ${weather.textClass}`}>{weather.windSpeed} km/h</p>
        </div>
      </div>

      <div className={`${glassMedium} backdrop-blur-md rounded-2xl p-3.5 border flex items-start gap-3 shadow-sm`}>
        <span className={`shrink-0 mt-0.5 ${weather.textClass}`} aria-hidden="true"><AISparklesIcon /></span>
        <p className={`text-[13px] font-bold leading-relaxed ${weather.textClass}`}>{weather.message}</p>
      </div>
    </section>
  )
})
