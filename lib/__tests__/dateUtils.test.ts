import { describe, it, expect } from 'vitest'
import {
  getStartOfDay,
  getStartOfYesterday,
  getDaysAgo,
  parseDateMs,
  splitDateTime,
  mergeDateTime,
} from '../dateUtils'

describe('dateUtils', () => {
  it('getStartOfDay sets time to 00:00:00.000', () => {
    const d = new Date('2026-09-28T14:35:22.500')
    const start = getStartOfDay(d)
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getSeconds()).toBe(0)
    expect(start.getMilliseconds()).toBe(0)
  })

  it('getStartOfYesterday calculates previous day correctly', () => {
    const today = getStartOfDay()
    const yesterday = getStartOfYesterday()
    const diffDays = Math.round((today.getTime() - yesterday.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(1)
  })

  it('getDaysAgo calculates correct day offset', () => {
    const today = getStartOfDay()
    const fiveDaysAgo = getDaysAgo(5)
    const diffDays = Math.round((today.getTime() - fiveDaysAgo.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(5)
  })

  it('parseDateMs parses ISO strings accurately', () => {
    const iso = '2026-09-28T10:00:00.000Z'
    expect(parseDateMs(iso)).toBe(Date.parse(iso))
  })

  it('splitDateTime and mergeDateTime round-trip consistently', () => {
    const dateStr = '2026-09-28'
    const timeStr = '14:30'
    const merged = mergeDateTime(dateStr, timeStr)
    const split = splitDateTime(merged)
    expect(split.time).toBe(timeStr)
  })
})
