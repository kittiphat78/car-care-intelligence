import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWeather } from '../useWeather'

const forecast = {
  current: { temperature_2m: 26.4, weather_code: 1, relative_humidity_2m: 70, apparent_temperature: 28, wind_speed_10m: 5 },
  hourly: { time: [], precipitation_probability: [] },
  daily: { precipitation_probability_max: [40, 10] },
}
const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))

describe('useWeather (D-10)', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('shows nothing, not 0° and 0% rain, when only the air-quality answer arrives', async () => {
    const fetchMock = vi.fn((url: string) => (url.includes('air-quality') ? json({ current: { us_aqi: 42 } }) : Promise.reject(new TypeError('Failed to fetch'))))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useWeather())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await new Promise((r) => setTimeout(r, 50))
    expect(result.current.data).toBeNull()
  })

  it('shows the forecast when it arrives, even without air quality', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => (url.includes('air-quality') ? Promise.reject(new TypeError('Failed to fetch')) : json(forecast))))
    const { result } = renderHook(() => useWeather())
    await waitFor(() => expect(result.current.data).not.toBeNull())
    expect(result.current.data?.temp).toBe(26)
  })
})
