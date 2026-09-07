import { memo } from 'react'
import { WeatherData } from '@/hooks/useWeather'
import { AISparklesIcon } from '@/components/icons/DashboardIcons'

export const WeatherWidget = memo(function WeatherWidget({ 
  weather,
  onRefresh,
  isRefreshing
}: { 
  weather: WeatherData
  onRefresh: () => void
  isRefreshing: boolean
}) {
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
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`flex items-center gap-1.5 ${updateBg} px-2.5 py-1 rounded-full border cursor-pointer hover:opacity-80 active:scale-95 transition-all disabled:opacity-50`}
                aria-label="รีเฟรชสภาพอากาศ"
              >
                {isRefreshing ? (
                  <svg className="animate-spin w-3 h-3 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
                )}
                <span className={`text-[10px] font-bold opacity-70 ${weather.textClass}`}>อัปเดต {weather.lastUpdated} น.</span>
              </button>
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
          <div className={`text-right shrink-0 px-3.5 py-2.5 rounded-2xl border shadow-sm transition-colors duration-300 ${
            weather.prob > 40
              ? 'bg-gradient-to-br from-red-500 to-rose-600 border-red-400 shadow-red-500/40 text-white'
              : glassLight
          }`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${weather.prob > 40 ? 'text-white/90' : `opacity-70 ${weather.textClass}`}`}>โอกาสฝน</p>
            <div className="flex items-baseline justify-end gap-0.5 mt-0.5">
              <p className={`text-2xl font-black leading-none ${weather.prob > 40 ? 'text-white' : weather.textClass}`}>{weather.prob}</p>
              <p className={`text-xs font-bold ${weather.prob > 40 ? 'text-white/90' : weather.textClass}`}>%</p>
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
