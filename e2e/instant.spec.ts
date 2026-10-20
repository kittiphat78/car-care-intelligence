import { expect, test, type Page, type Request } from '@playwright/test'
import { signIn } from './helpers'

// Taps answer at once (perf/instant-ui): a dialog, a tab or a filter changes the URL in
// the browser only, and a bottom-bar tab opens from what was prefetched. Each check
// counts the requests that ask the server to render (React Server Components) the page
// being opened. The menu prefetching the other tabs meanwhile is expected and left out.

/** Server renders of `path` asked for while `action` runs */
async function serverRenders(page: Page, path: string, action: () => Promise<void>): Promise<string[]> {
  const seen: string[] = []
  const onRequest = (r: Request) => {
    const url = new URL(r.url())
    const isRender = r.headers()['rsc'] === '1' || url.searchParams.has('_rsc')
    if (isRender && url.pathname === path) seen.push(r.url())
  }
  page.on('request', onRequest)
  try {
    await action()
  } finally {
    page.off('request', onRequest)
  }
  return seen
}

test('เคลียร์ยอด, the history tabs and the edit dialog open with no server request', async ({ page }) => {
  await signIn(page, '/debts')
  const settle = page.getByRole('button', { name: /^เคลียร์ยอด / }).first()
  await expect(settle).toBeVisible()
  expect(
    await serverRenders(page, '/debts', async () => {
      await settle.click()
      await expect(page.getByRole('alertdialog')).toBeVisible()
      await page.getByRole('alertdialog').getByRole('button', { name: 'ยกเลิก' }).click()
      await expect(page.getByRole('alertdialog')).toBeHidden()
    }),
  ).toEqual([])

  await page.goto('/history')
  // A job of the seed data (plates "ทดสอบ …"); a card on phones, a table row on desktop
  const row = page.getByRole('main').getByRole('button', { name: /ทดสอบ/ }).first()
  await expect(row).toBeVisible()
  expect(
    await serverRenders(page, '/history', async () => {
      await page.getByRole('tab', { name: 'รายจ่าย' }).click()
      await expect(page).toHaveURL(/tab=expense/)
      await page.getByRole('tab', { name: 'รายรับ' }).click()
      await expect(page.getByRole('tab', { name: 'รายรับ' })).toHaveAttribute('aria-selected', 'true')
      await row.click()
      await expect(page.getByRole('dialog', { name: 'แก้ไขรายรับ' })).toBeVisible()
      await page.goBack()
      await expect(page.getByRole('dialog', { name: 'แก้ไขรายรับ' })).toBeHidden()
    }),
  ).toEqual([])
})

test('a tab of the main menu opens from what was prefetched', async ({ page }) => {
  // The prefetch is an ordinary render request of /debts, sent when the link appears
  let prefetched = 0
  page.on('requestfinished', (r) => {
    const url = new URL(r.url())
    if (url.pathname === '/debts' && (r.headers()['rsc'] === '1' || url.searchParams.has('_rsc'))) prefetched++
  })
  await signIn(page)
  const menu = page.getByRole('navigation', { name: 'เมนูหลัก' }).filter({ visible: true })
  const debts = menu.getByRole('link', { name: /ค้างชำระ/ })
  await expect(debts).toBeVisible()
  // WebKit schedules prefetching later than Chromium: wait until it has been done
  await expect.poll(() => prefetched, { timeout: 15_000 }).toBeGreaterThan(0)
  await page.waitForLoadState('networkidle')
  expect(
    await serverRenders(page, '/debts', async () => {
      await debts.click()
      await expect(page.getByRole('heading', { level: 1, name: 'ค้างชำระ' })).toBeVisible()
    }),
  ).toEqual([])
})
