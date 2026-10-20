import { describe, it, expect, afterEach, vi } from 'vitest'
import { appError, isAppError, toAppError, toUserMessage, ERROR_REF_PATTERN } from '@/lib/errors'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('toAppError', () => {
  it.each([
    [{ code: 'PGRST301', message: 'JWT expired' }, 'AUTH_EXPIRED'],
    [{ code: '42501', message: 'permission denied for table records' }, 'FORBIDDEN'],
    [{ code: '23514', message: 'violates check constraint' }, 'VALIDATION'],
    [{ code: '23502', message: 'null value' }, 'VALIDATION'],
    [{ code: '22001', message: 'value too long' }, 'VALIDATION'],
    [{ code: '23505', message: 'duplicate key' }, 'DUPLICATE'],
    [{ code: 'PGRST116', message: 'no rows' }, 'NOT_FOUND'],
    [{ code: '57014', message: 'statement timeout' }, 'TIMEOUT'],
    [{ code: 'XX000', message: 'internal' }, 'SERVER'],
    [{ code: '', message: 'TypeError: Failed to fetch' }, 'NETWORK'],
    [new TypeError('Load failed'), 'NETWORK'],
    [new DOMException('aborted', 'AbortError'), 'TIMEOUT'],
    [new Error('something odd'), 'UNKNOWN'],
    ['plain string', 'UNKNOWN'],
  ])('maps %o to %s', (input, code) => {
    const result = toAppError(input)
    expect(result.code).toBe(code)
    expect(result.ref).toMatch(ERROR_REF_PATTERN)
    expect(result.cause).toBe(input)
  })

  it('maps the codes of save_customer, never as DUPLICATE ("already saved")', () => {
    expect(toAppError({ code: 'CC409', message: 'customer changed since it was loaded' }).code).toBe('CONFLICT')
    expect(toAppError({ code: 'CC404', message: 'customer not found' }).code).toBe('NOT_FOUND')
    expect(toAppError({ code: 'CC422', message: 'a plate appears twice' }).code).toBe('VALIDATION')
    const plate = toAppError({ code: 'CCPLT', message: 'a plate belongs to another customer' })
    expect([plate.code, plate.field]).toEqual(['VALIDATION', 'plate'])
  })

  it('treats an offline device as NETWORK', () => {
    vi.stubGlobal('navigator', { onLine: false })
    expect(toAppError(new Error('x')).code).toBe('NETWORK')
  })

  it('returns an AppError unchanged', () => {
    const original = appError('CONFLICT')
    expect(toAppError(original)).toBe(original)
    expect(isAppError(original)).toBe(true)
    expect(isAppError({ code: 'NOPE', ref: 'ABCDEFGH' })).toBe(false)
  })
})

describe('toUserMessage', () => {
  it('shows a Thai message with the reference and never the raw error text (ER-17)', () => {
    const error = toAppError({ code: '42501', message: 'permission denied for table records' })
    const message = toUserMessage(error)
    expect(message).toContain('ไม่มีสิทธิ์')
    expect(message).toContain(error.ref)
    expect(message).not.toContain('permission denied')
  })
})
