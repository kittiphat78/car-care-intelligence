import { defineConfig, devices } from '@playwright/test'

// End-to-end tests of the critical user journeys (CUJ-1..8, feature-inventory.md §7) plus
// automated accessibility checks. They run against a local Supabase started by the
// Supabase CLI (never staging or production) and a production build of the app.
//
//   E2E_SUPABASE_URL, E2E_ANON_KEY, E2E_SERVICE_ROLE_KEY   from `supabase status -o env`
//   npm run build && npm run test:e2e                       (build with the same URL/key)

const PORT = 3100
const baseURL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.E2E_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.E2E_ANON_KEY ?? '',
    },
  },
})
