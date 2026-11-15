import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { THEME_COLOR } from '@/components/patterns/theme-constants'

// The installed app (PWA) opens on the manifest's colours before any CSS loads, so they
// must be the dark --color-bg the page then paints (ADR-28) — otherwise the splash and
// the system bar flash a different shade.
const root = join(__dirname, '..', '..')
const manifest = JSON.parse(readFileSync(join(root, 'public', 'manifest.json'), 'utf8')) as Record<string, unknown>
const tokens = readFileSync(join(root, 'app', 'styles', 'tokens.css'), 'utf8')

describe('PWA manifest colours', () => {
  it('match the dark background token and the theme-color meta', () => {
    const darkBg = tokens.match(/--color-bg:\s*(#[0-9A-Fa-f]{6})/)?.[1]
    expect(darkBg).toBe(THEME_COLOR.dark)
    expect(manifest.theme_color).toBe(THEME_COLOR.dark)
    expect(manifest.background_color).toBe(THEME_COLOR.dark)
  })
})
