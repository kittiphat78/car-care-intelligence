// Plain constants (no 'use client') so the server root layout can read them too
export type Theme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'car-care-theme'
export const THEME_COLOR: Record<Theme, string> = { dark: '#0B111A', light: '#F4F6F9' }
