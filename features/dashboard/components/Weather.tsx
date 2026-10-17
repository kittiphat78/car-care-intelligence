'use client'

import { useState, useSyncExternalStore } from 'react'
import { useWeather, type WeatherData } from '@/hooks/useWeather'
import { Banner } from '@/components/ui/Banner'
import { Button, IconButton } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Icon } from '@/components/ui/Icon'

// component-specifications.md §3.9 — a small button in the header that opens the full
// details, and a rain warning above the page when rain is likely. Plain surfaces only
// (no weather gradients) so contrast stays fixed; the emoji still tells day from night.

const AREA = 'เมืองเชียงราย'
export const RAIN_ALERT_PERCENT = 40

/** The weather hook reads a browser cache on its first render; wait for the browser */
const useMounted = () => useSyncExternalStore(() => () => {}, () => true, () => false)

export function useDashboardWeather() {
  const mounted = useMounted()
  const { data, refetch, isRefetching } = useWeather()
  return { weather: mounted ? data : null, refetch, isRefetching }
}

export function WeatherStrip({ weather, onOpen }: { weather: WeatherData | null; onOpen: () => void }) {
  if (!weather) return null
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`สภาพอากาศ ${weather.condition} ${weather.temp} องศา โอกาสฝน ${weather.prob}% แตะเพื่อดูรายละเอียด`}
      className="press focus-ring flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 text-body text-text hover:bg-surface-2"
    >
      <span aria-hidden="true" className="text-heading leading-none">
        {weather.icon}
      </span>
      <span className="font-semibold tabular-nums">{weather.temp}°</span>
      <span className="flex items-center gap-1 text-caption text-text-secondary">
        <Icon name="rain" size="sm" />
        {weather.prob}%
      </span>
    </button>
  )
}

export function RainAlert({ weather }: { weather: WeatherData | null }) {
  if (!weather || weather.prob <= RAIN_ALERT_PERCENT) return null
  return (
    <Banner tone="warning" title={`มีโอกาสฝน ${weather.prob}% วันนี้`}>
      {weather.message}
    </Banner>
  )
}

export function WeatherDetail({
  open,
  onClose,
  weather,
  onRefresh,
  refreshing,
}: {
  open: boolean
  onClose: () => void
  weather: WeatherData | null
  onRefresh: () => void
  refreshing: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} title={`สภาพอากาศ · ${AREA}`}>
      {!weather ? (
        <div className="grid gap-3 py-2">
          <p className="text-body text-text-secondary">โหลดข้อมูลอากาศไม่สำเร็จ</p>
          <Button variant="secondary" leadingIcon="refresh" onClick={onRefresh} isLoading={refreshing}>
            ลองใหม่
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 pb-2">
          <p className="flex items-center gap-3">
            <span aria-hidden="true" className="text-display leading-none">
              {weather.icon}
            </span>
            <span className="grid">
              <span className="text-title text-text tabular-nums">{weather.temp}°C</span>
              <span className="text-body text-text-secondary">{weather.condition}</span>
            </span>
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-body">
            <dt className="text-text-secondary">รู้สึกเหมือน</dt>
            <dd className="text-right text-text tabular-nums">{weather.feelsLike}°C</dd>
            <dt className="text-text-secondary">ความชื้น</dt>
            <dd className="text-right text-text tabular-nums">{weather.humidity}%</dd>
            <dt className="text-text-secondary">ลม</dt>
            <dd className="text-right text-text tabular-nums">{weather.windSpeed} กม./ชม.</dd>
            <dt className="text-text-secondary">โอกาสฝนวันนี้</dt>
            <dd className="text-right text-text tabular-nums">{weather.prob}%</dd>
            <dt className="text-text-secondary">คุณภาพอากาศ (AQI)</dt>
            <dd className="text-right text-text tabular-nums">
              {weather.aqi} · {weather.aqiStatus.label}
            </dd>
          </dl>
          <p className="rounded-md bg-surface-2 px-3 py-2 text-body text-text">{weather.message}</p>
          <div className="flex items-center justify-between">
            <span className="text-caption text-text-tertiary">อัปเดต {weather.lastUpdated} น.</span>
            <IconButton icon="refresh" aria-label="รีเฟรชสภาพอากาศ" onClick={onRefresh} disabled={refreshing} className={refreshing ? 'animate-spin' : undefined} />
          </div>
        </div>
      )}
    </Dialog>
  )
}

export function useWeatherDetail() {
  const [open, setOpen] = useState(false)
  return { open, show: () => setOpen(true), hide: () => setOpen(false) }
}
