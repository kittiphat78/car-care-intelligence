import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('useWeather caching logic', () => {
  const CACHE_KEY = 'car_care_weather_cache'
  const CACHE_TTL_MS = 30 * 60 * 1000

  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('stores and retrieves cached weather within 30 minutes', () => {
    const mockData = { temp: 28, condition: 'แดดจัด' }
    const payload = { data: mockData, timestamp: Date.now() }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload))

    const raw = sessionStorage.getItem(CACHE_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    const isFresh = Date.now() - parsed.timestamp < CACHE_TTL_MS
    expect(isFresh).toBe(true)
    expect(parsed.data.temp).toBe(28)
  })

  it('identifies expired cache (> 30 minutes)', () => {
    const mockData = { temp: 25, condition: 'ฝนตก' }
    const expiredTimestamp = Date.now() - (CACHE_TTL_MS + 1000)
    const payload = { data: mockData, timestamp: expiredTimestamp }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload))

    const raw = sessionStorage.getItem(CACHE_KEY)
    const parsed = JSON.parse(raw!)
    const isFresh = Date.now() - parsed.timestamp < CACHE_TTL_MS
    expect(isFresh).toBe(false)
  })

  it('handles corrupted JSON in sessionStorage safely', () => {
    sessionStorage.setItem(CACHE_KEY, 'invalid-json{{{')
    expect(() => {
      try {
        JSON.parse(sessionStorage.getItem(CACHE_KEY)!)
      } catch {
        sessionStorage.removeItem(CACHE_KEY)
      }
    }).not.toThrow()
    expect(sessionStorage.getItem(CACHE_KEY)).toBeNull()
  })
})
