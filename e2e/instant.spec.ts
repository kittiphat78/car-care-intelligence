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

  // The whole year: the seed data may not reach the current month
  await page.goto('/history?m=0')
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

test('a tab opened a moment ago opens again with no server request', async ({ page }) => {
  await signIn(page)
  const menu = page.getByRole('navigation', { name: 'เมนูหลัก' }).filter({ visible: true })
  await menu.getByRole('link', { name: /ค้างชำระ/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'ค้างชำระ' })).toBeVisible()
  await menu.getByRole('link', { name: /ภาพรวม/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'ภาพรวมวันนี้' })).toBeVisible()
  // The browser kept /debts (staleTimes in next.config.ts)
  expect(
    await serverRenders(page, '/debts', async () => {
      await menu.getByRole('link', { name: /ค้างชำระ/ }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'ค้างชำระ' })).toBeVisible()
    }),
  ).toEqual([])
})

test('typing in the customer search asks the server for nothing (ADR-23)', async ({ page }) => {
  // Not even prefetches: next/link prefetched every link on screen again after each URL
  // change, with the search in a request header (AppLink prefetches on a tap only)
  await signIn(page, '/customers')
  const search = page.getByRole('searchbox', { name: 'ค้นหาชื่อ เบอร์ หรือทะเบียน' })
  await expect(search).toBeVisible()
  await page.waitForLoadState('networkidle')
  // The test's pointer stays where it last clicked; results appearing under it would count
  // as the pointer moving over a card (AppLink prefetches on that). A phone has no pointer.
  await page.mouse.move(0, 0)
  const sent: string[] = []
  const onRequest = (r: Request) => {
    const url = new URL(r.url())
    if (url.origin === new URL(page.url()).origin && !url.pathname.startsWith('/_next/static')) sent.push(r.url())
  }
  page.on('request', onRequest)
  await search.pressSequentially('ทดสอบ 08', { delay: 80 })
  // The URL follows the typing after a pause (CustomersScreen); wait past it
  await expect(page).toHaveURL(/q=/)
  await page.waitForTimeout(1500)
  page.off('request', onRequest)
  expect(sent).toEqual([])
})
