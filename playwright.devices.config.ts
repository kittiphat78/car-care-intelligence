import { defineConfig, devices, type Project } from '@playwright/test'
import base from './playwright.config'

// The same E2E suite on other devices (testing-guide.md §4.3), one device per run:
//
//   DEVICE=iphone npm run test:e2e:device      iPhone 13, WebKit (Safari's engine)
//   DEVICE=ipad npm run test:e2e:device        iPad Pro 12.9" portrait 1024×1366, WebKit
//   DEVICE=android-small npm run test:e2e:device   Galaxy S8 360×740, Chromium
//   DEVICE=laptop npm run test:e2e:device      laptop 1366×768, Chromium
//
// Each device runs as the "phone" or "desktop" project, so every test keeps choosing what
// it checks by layout. Not in CI: WebKit is slow to install and run; use before a release.

const DEVICES: Record<string, Project> = {
  iphone: { name: 'phone', use: { ...devices['iPhone 13'] } },
  ipad: { name: 'desktop', use: { ...devices['iPad Pro 11'], viewport: { width: 1024, height: 1366 } } },
  'android-small': { name: 'phone', use: { ...devices['Galaxy S8'] } },
  laptop: { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
}

const device = process.env.DEVICE ?? ''
if (!DEVICES[device]) throw new Error(`Set DEVICE to one of: ${Object.keys(DEVICES).join(', ')}`)

export default defineConfig({
  ...base,
  projects: [DEVICES[device]],
})
