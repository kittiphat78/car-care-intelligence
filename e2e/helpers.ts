import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, type TestInfo } from '@playwright/test'
import { E2E_EMAIL, E2E_PASSWORD } from './global-setup'

/** Sign in through the login page, as a person would, and land on the dashboard */
export async function signIn(page: Page, next = '/', account = { email: E2E_EMAIL, password: E2E_PASSWORD }) {
  await page.goto(next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`)
  await page.getByLabel('อีเมล', { exact: true }).fill(account.email)
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
  await page.waitForURL((u) => u.pathname === next.split('?')[0])
}

/** A plate no other test or run uses, e.g. "E2E 4821" (max 20 characters) */
export function uniquePlate(info: TestInfo, tag: string): string {
  const n = `${Date.now() % 100000}`.padStart(5, '0')
  return `E2E${tag}${info.project.name === 'phone' ? 'P' : 'D'}${n}`.slice(0, 20)
}

/**
 * Wait until entrance animations (a dialog sliding in) have finished: measured halfway,
 * a button's colours are a blend and fail the contrast check although they pass once
 * shown. Endless animations (spinner, skeleton) are ignored.
 */
export async function animationsDone(page: Page) {
  await page
    .waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity), null, {
      timeout: 5000,
    })
    .catch(() => {})
}

/**
 * WCAG 2.2 A/AA checks (accessibility-guidelines.md §7), plus Label in Name (2.5.3),
 * which axe keeps off by default as experimental (Step 09 A-01). Serious and critical
 * problems fail the test; the rest are attached to the report.
 */
export async function expectAccessible(page: Page, info: TestInfo, name: string) {
  await animationsDone(page)
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
    .options({ rules: { 'label-content-name-mismatch': { enabled: true } } })
    .analyze()
  await info.attach(`axe-${name}.json`, { body: JSON.stringify(result.violations, null, 2), contentType: 'application/json' })
  const blocking = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(
    blocking.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`),
    `accessibility problems on ${name}`,
  ).toEqual([])
}
