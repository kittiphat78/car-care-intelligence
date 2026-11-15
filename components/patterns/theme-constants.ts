// Plain constants (no 'use client') so the server root layout can read them too
export type Theme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'car-care-theme'
// Equal to --color-bg of each theme (app/styles/tokens.css)
export const THEME_COLOR: Record<Theme, string> = { dark: '#0A0F1E', light: '#F3F6FD' }
