import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '@/lib/color-contrast'

// Re-checks design-tokens.md §3.3 against the real tokens.css (S04-03).

const css = readFileSync(path.resolve(__dirname, '../tokens.css'), 'utf8')

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`block not found: ${selector}`)
  const end = css.indexOf('\n}', start)
  const vars: Record<string, string> = {}
  for (const m of css.slice(start, end).matchAll(/(--[\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim()
  return vars
}

const dark = block('@theme static')
const light = block('[data-theme="light"]')

function resolve(theme: Record<string, string>, name: string): string {
  const value = theme[name] ?? dark[name]
  if (value === undefined) throw new Error(`token not defined: ${name}`)
  return value
}

// Names in the §3.3 table are semantic tokens without `--color-`; a few are short forms
const ALIAS: Record<string, string> = {
  'on-primary': 'on-action-primary',
  'on-success': 'on-action-primary',
  'on-danger': 'on-action-primary',
  'on-warning': 'on-action-primary',
  primary: 'action-primary',
  'primary-hover': 'action-primary-hover',
  'primary-subtle': 'action-primary-subtle',
  'primary-text': 'text-link',
  focus: 'focus-ring',
  wash: 'job-wash',
  'wash-subtle': 'job-wash-subtle',
  polish: 'job-polish',
  'polish-subtle': 'job-polish-subtle',
}
const token = (short: string) => `--color-${ALIAS[short] ?? short}`

// [foreground, background, minimum ratio] — design-tokens.md §3.3, all 38 rows
const PAIRS: Array<[string, string, number]> = [
  ['text', 'bg', 4.5], ['text', 'surface', 4.5], ['text', 'surface-2', 4.5],
  ['text-secondary', 'surface', 4.5], ['text-secondary', 'bg', 4.5],
  ['text-tertiary', 'surface', 4.5], ['text-tertiary', 'bg', 4.5], ['text-tertiary', 'surface-2', 4.5],
  ['text-inverse', 'surface-inverse', 4.5],
  ['on-primary', 'primary', 4.5], ['on-primary', 'primary-hover', 4.5],
  ['primary-text', 'surface', 4.5], ['primary-text', 'bg', 4.5], ['primary-text', 'primary-subtle', 4.5],
  ['focus', 'surface', 3], ['focus', 'bg', 3],
  ['border-strong', 'surface', 3], ['border-strong', 'bg', 3],
  ['on-success', 'success', 4.5], ['success-text', 'success-subtle', 4.5], ['success-text', 'surface', 4.5],
  ['on-danger', 'danger', 4.5], ['danger-text', 'danger-subtle', 4.5], ['danger-text', 'surface', 4.5],
  ['on-warning', 'warning', 4.5], ['warning-text', 'warning-subtle', 4.5], ['warning-text', 'surface', 4.5],
  ['info-text', 'info-subtle', 4.5],
  ['wash', 'surface', 4.5], ['wash', 'wash-subtle', 4.5],
  ['polish', 'surface', 4.5], ['polish', 'polish-subtle', 4.5],
  ['income', 'surface', 4.5], ['expense', 'surface', 4.5], ['unpaid', 'surface', 4.5],
  ['income', 'bg', 4.5], ['expense', 'bg', 4.5], ['unpaid', 'bg', 4.5],
]

describe('design tokens', () => {
  it('lists all 38 pairs from design-tokens.md §3.3', () => {
    expect(PAIRS).toHaveLength(38)
  })

  it('writes every colour as its final value, never through another variable', () => {
    // A var() chain resolves to nothing if any link is missing (the bug fixed in C3-fix)
    for (const theme of [dark, light]) {
      for (const [name, value] of Object.entries(theme)) {
        if (name.startsWith('--color-')) expect(value, name).not.toContain('var(')
      }
    }
  })

  it('defines every semantic colour in both themes', () => {
    const darkColours = Object.keys(dark).filter((k) => k.startsWith('--color-'))
    const lightColours = Object.keys(light).filter((k) => k.startsWith('--color-'))
    expect(darkColours.length).toBeGreaterThanOrEqual(36)
    expect(lightColours.sort()).toEqual(darkColours.sort())
  })

  for (const [themeName, theme] of [['dark', dark], ['light', light]] as const) {
    it.each(PAIRS)(`${themeName}: %s on %s meets %s:1`, (fg, bg, min) => {
      const ratio = contrastRatio(resolve(theme, token(fg)), resolve(theme, token(bg)))
      expect(ratio).toBeGreaterThanOrEqual(min)
    })
  }

  it('matches the ratios published in design-tokens.md (spot check)', () => {
    const round = (n: number) => Math.round(n * 100) / 100
    expect(round(contrastRatio(resolve(dark, token('text')), resolve(dark, token('bg'))))).toBe(17.43)
    expect(round(contrastRatio(resolve(light, token('unpaid')), resolve(light, token('bg'))))).toBe(6.01)
    expect(round(contrastRatio(resolve(dark, token('border-strong')), resolve(dark, token('surface'))))).toBe(4.46)
  })
})

// ── Glass (ADR-28) ──
// The glass colours are translucent, so text is checked against what the eye sees: the page
// at the strongest point of each glow, a glass card laid over it, and a floating bar over it
// (the worst case of each; the blur only softens what is behind and is left out).
function parseRgba(value: string): [[number, number, number], number] {
  const m = /^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/.exec(value.trim())
  if (!m) throw new Error(`not an rgb(r g b / a) colour: ${value}`)
  return [[Number(m[1]), Number(m[2]), Number(m[3])], Number(m[4])]
}
function over(under: string, overlay: string): string {
  const [rgb, alpha] = parseRgba(overlay)
  const base = [1, 3, 5].map((i) => parseInt(under.slice(i, i + 2), 16))
  return '#' + base.map((u, i) => Math.round(u * (1 - alpha) + rgb[i] * alpha).toString(16).padStart(2, '0')).join('')
}

describe('glass tokens', () => {
  const ON_PAGE = ['text', 'text-secondary', 'text-tertiary', 'primary-text', 'income', 'expense', 'unpaid', 'wash', 'polish', 'success-text', 'danger-text', 'warning-text', 'info-text']

  for (const [themeName, theme] of [['dark', dark], ['light', light]] as const) {
    const bg = resolve(theme, '--color-bg')
    const page = [bg, over(bg, resolve(theme, '--color-glow-a')), over(bg, resolve(theme, '--color-glow-b'))]
    const card = page.map((p) => over(p, resolve(theme, '--color-glass')))
    const bar = page.map((p) => over(p, resolve(theme, '--color-glass-float')))

    it.each(ON_PAGE)(`${themeName}: %s stays 4.5:1 on the glow, on glass cards and on floating bars`, (fg) => {
      for (const surface of [...page, ...card, ...bar]) {
        expect(contrastRatio(resolve(theme, token(fg)), surface), `${fg} on ${surface}`).toBeGreaterThanOrEqual(4.5)
      }
    })

    it(`${themeName}: gradient heading text stays 4.5:1 on the glow`, () => {
      for (const end of ['--color-gradient-from', '--color-gradient-to']) {
        for (const surface of page) expect(contrastRatio(resolve(theme, end), surface), end).toBeGreaterThanOrEqual(4.5)
      }
    })

    it(`${themeName}: the primary button edge shows on a glass card (3:1)`, () => {
      for (const surface of card) expect(contrastRatio(resolve(theme, '--color-action-primary-edge'), surface)).toBeGreaterThanOrEqual(3)
    })

    // Dialogs always use it, and so do floating bars without blur
    it.each(ON_PAGE)(`${themeName}: %s stays 4.5:1 on the solid floating colour (dialogs)`, (fg) => {
      expect(contrastRatio(resolve(theme, token(fg)), resolve(theme, '--color-glass-float-solid'))).toBeGreaterThanOrEqual(4.5)
    })
  }
})
