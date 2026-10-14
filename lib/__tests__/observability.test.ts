import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createErrorRef, ERROR_REF_PATTERN } from '@/lib/errors'
import {
  buildErrorReport,
  reportError,
  resetReportBudget,
  scrubMessage,
  CLIENT_ERRORS_ENDPOINT,
} from '@/lib/observability'

describe('createErrorRef', () => {
  it('returns 8 unambiguous characters', () => {
    for (let i = 0; i < 50; i++) expect(createErrorRef()).toMatch(ERROR_REF_PATTERN)
  })
})

describe('scrubMessage', () => {
  it('removes e-mail addresses and long digit runs', () => {
    expect(scrubMessage('owner@shop.co.th saved กข 1234 for 350 baht'))
      .toBe('[email] saved กข # for # baht')
  })

  it('keeps short numbers and caps the length at 300', () => {
    expect(scrubMessage('line 12')).toBe('line 12')
    expect(scrubMessage('x'.repeat(500))).toHaveLength(300)
  })
})

describe('buildErrorReport', () => {
  it('describes Error, string and unknown values', () => {
    expect(buildErrorReport(new TypeError('boom')).message).toBe('TypeError: boom')
    expect(buildErrorReport('plain').message).toBe('plain')
    expect(buildErrorReport({ any: 'object' }).message).toBe('Non-error value thrown')
  })

  it('fills defaults and honours the context', () => {
    const report = buildErrorReport(new Error('x'), { code: 'ROW_LIMIT', ref: 'ABCDEFGH', route: '/history' })
    expect(report).toMatchObject({ code: 'ROW_LIMIT', ref: 'ABCDEFGH', route: '/history' })
    expect(buildErrorReport(new Error('x')).code).toBe('UNKNOWN')
    expect(new Date(report.at).toISOString()).toBe(report.at)
  })
})

describe('reportError', () => {
  const sendBeacon = vi.fn<(url: string, data?: BodyInit | null) => boolean>()

  beforeEach(() => {
    resetReportBudget()
    sendBeacon.mockReset().mockReturnValue(true)
    Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends one JSON beacon and returns the reference', async () => {
    const ref = reportError(new Error('failed'), { code: 'SERVER' })
    expect(ref).toMatch(ERROR_REF_PATTERN)
    expect(sendBeacon).toHaveBeenCalledTimes(1)
    const [url, blob] = sendBeacon.mock.calls[0]
    expect(url).toBe(CLIENT_ERRORS_ENDPOINT)
    const body = JSON.parse(await (blob as Blob).text())
    expect(body).toMatchObject({ code: 'SERVER', ref, message: 'Error: failed' })
  })

  it('falls back to fetch when the beacon is not queued', () => {
    sendBeacon.mockReturnValue(false)
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    reportError(new Error('x'))
    expect(fetchMock).toHaveBeenCalledWith(CLIENT_ERRORS_ENDPOINT, expect.objectContaining({ method: 'POST', keepalive: true }))
  })

  it('stops after 10 reports per page load', () => {
    for (let i = 0; i < 15; i++) reportError(new Error(`e${i}`))
    expect(sendBeacon).toHaveBeenCalledTimes(10)
  })

  it('never throws when sending fails', () => {
    sendBeacon.mockImplementation(() => { throw new Error('blocked') })
    expect(() => reportError(new Error('x'))).not.toThrow()
  })
})
