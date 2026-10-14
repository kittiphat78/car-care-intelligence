import { describe, it, expect } from 'vitest'
import { loginPathFor, safeNextPath } from '@/lib/auth/redirect'

describe('safeNextPath', () => {
  it.each([
    ['/history', '/history'],
    ['/add?mode=expense', '/add?mode=expense'],
    ['/history#top', '/history'],
  ])('keeps the site path %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected)
  })

  it.each([
    [null],
    [undefined],
    [''],
    ['history'],
    ['https://evil.example/'],
    ['//evil.example/path'],
    ['/\\evil.example'],
    ['javascript:alert(1)'],
    ['/login'],
    ['/login?next=/history'],
  ])('falls back to / for %s', (input) => {
    expect(safeNextPath(input)).toBe('/')
  })
})

describe('loginPathFor', () => {
  it('remembers the page to return to', () => {
    expect(loginPathFor('/history?tab=expense')).toBe('/login?next=%2Fhistory%3Ftab%3Dexpense')
  })

  it('uses a plain /login for the dashboard', () => {
    expect(loginPathFor('/')).toBe('/login')
  })
})
