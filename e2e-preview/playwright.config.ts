import { defineConfig, devices } from '@playwright/test'

// Release-candidate checks against a Vercel Preview (staging database). Not part of CI.
//
//   PREVIEW_URL=https://<deployment>.vercel.app
//   PREVIEW_BYPASS=<Vercel "Protection Bypass for Automation" secret>   (keep it in an untracked .env file)
//   STAGING_EMAIL / STAGING_PASSWORD = the staging test account
//   npx playwright test -c e2e-preview/playwright.config.ts
//
// The tests refuse to run against the production domain and check that every database
// request goes to the staging project. They create their own records and delete them.

const url = process.env.PREVIEW_URL ?? ''

export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: url,
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
  ],
})
