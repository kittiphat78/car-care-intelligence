import { describe, it, expect } from 'vitest'
import { cellText } from '@/lib/spreadsheet-text'

describe('cellText (formula injection guard for Excel export)', () => {
  it.each([
    ['=HYPERLINK("http://x","click")', `'=HYPERLINK("http://x","click")`],
    ['+cmd|" /C calc"!A0', `'+cmd|" /C calc"!A0`],
    ['@SUM(A1:A2)', `'@SUM(A1:A2)`],
    ['-2+3+cmd', `'-2+3+cmd`],
    ['\t=1+1', `'\t=1+1`],
  ])('keeps %j as text', (input, output) => {
    expect(cellText(input)).toBe(output)
  })

  it('leaves normal values alone', () => {
    for (const v of ['กข 1234', 'วาโยคาร์เซ็นเตอร์', '0809797662', 'ราคา <500', '-', '-50', 'Civic fc เทาดำ']) {
      expect(cellText(v)).toBe(v)
    }
  })

  it('shows "-" for empty values', () => {
    expect(cellText('')).toBe('-')
    expect(cellText(null)).toBe('-')
    expect(cellText(undefined)).toBe('-')
  })
})
