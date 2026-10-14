// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const authState = vi.hoisted(() => ({ userId: 'user-123' as string | null }))

vi.mock('@/lib/serverAuth', () => ({
  authenticateRequest: async () =>
    authState.userId
      ? { user: { id: authState.userId } }
      : { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) },
}))

import { POST } from '../route'

const validReport = {
  code: 'UNKNOWN',
  ref: 'ABCDEFGH',
  route: '/history',
  message: 'TypeError: boom',
  appVersion: '1.0.1',
  userAgent: 'test-agent',
  at: '2026-10-14T12:00:00.000Z',
}

function post(body: unknown, headers: Record<string, string> = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return new NextRequest('https://shop.example/api/client-errors', {
    method: 'POST',
    body: text,
    headers: { 'content-type': 'application/json', host: 'shop.example', origin: 'https://shop.example', ...headers },
  })
}

describe('POST /api/client-errors', () => {
  let log: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    authState.userId = 'user-123'
    log = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    log.mockRestore()
  })

  it('logs a valid report as JSON with a hashed user id and returns 204', async () => {
    const res = await POST(post(validReport))
    expect(res.status).toBe(204)
    expect(log).toHaveBeenCalledTimes(1)
    const entry = JSON.parse(log.mock.calls[0][0] as string)
    expect(entry).toMatchObject({ level: 'error', source: 'client', ...validReport })
    expect(entry.userIdHash).toMatch(/^[0-9a-f]{16}$/)
    expect(JSON.stringify(entry)).not.toContain('user-123')
  })

  it('returns 401 without a session', async () => {
    authState.userId = null
    expect((await POST(post(validReport))).status).toBe(401)
    expect(log).not.toHaveBeenCalled()
  })

  it('returns 403 for another origin', async () => {
    expect((await POST(post(validReport, { origin: 'https://evil.example' }))).status).toBe(403)
  })

  it('returns 403 for a cross-site request without an Origin header', async () => {
    const req = post(validReport, { 'sec-fetch-site': 'cross-site' })
    req.headers.delete('origin')
    expect((await POST(req)).status).toBe(403)
  })

  it('returns 413 when the body is over 4KB', async () => {
    const res = await POST(post({ ...validReport, message: 'x'.repeat(5000) }))
    expect(res.status).toBe(413)
  })

  it.each([
    ['invalid JSON', '{not json'],
    ['unknown code', { ...validReport, code: 'BOOM' }],
    ['bad ref', { ...validReport, ref: 'abc' }],
    ['message over 300', { ...validReport, message: 'x'.repeat(301) }],
    ['extra field such as e-mail', { ...validReport, email: 'owner@shop.co.th' }],
    ['missing field', { ...validReport, at: undefined }],
  ])('returns 400 for %s', async (_label, body) => {
    expect((await POST(post(body))).status).toBe(400)
    expect(log).not.toHaveBeenCalled()
  })
})
