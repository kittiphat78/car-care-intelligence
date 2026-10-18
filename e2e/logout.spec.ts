import { expect, test, type Browser, type Page } from '@playwright/test'
import { LOGOUT_EMAIL, LOGOUT_PASSWORD } from './global-setup'
import { signIn } from './helpers'

// Sign-out ends the session of this device only (defect-log D-03, owner decision
// 2026-10-18). Uses the sign-out account so other tests keep their sessions.

const account = { email: LOGOUT_EMAIL, password: LOGOUT_PASSWORD }

async function device(browser: Browser, baseURL: string | undefined): Promise<Page> {
  const context = await browser.newContext({ baseURL, locale: 'th-TH', timezoneId: 'Asia/Bangkok' })
  return context.newPage()
}

async function signOutHere(page: Page) {
  await page.goto('/more?logout=1')
  await page.getByRole('alertdialog', { name: 'ออกจากระบบ?' }).getByRole('button', { name: 'ออกจากระบบ' }).click()
  await expect(page).toHaveURL(/\/login$/)
}

test.describe.configure({ mode: 'serial' })

test('signing out on one device keeps the other device signed in', async ({ browser, baseURL }) => {
  test.skip(test.info().project.name !== 'desktop', 'two devices in one test is enough')
  const shopTablet = await device(browser, baseURL)
  const phone = await device(browser, baseURL)
  await signIn(shopTablet, '/', account)
  await signIn(phone, '/', account)

  await signOutHere(phone)
  await phone.goto('/history')
  await expect(phone).toHaveURL(/\/login\?next=%2Fhistory$/)

  // The tablet still works, including a fresh page load checked by the server
  await shopTablet.goto('/history')
  await expect(shopTablet).toHaveURL(/\/history$/)
  await expect(shopTablet.getByRole('heading', { level: 1 })).toBeVisible()
  await shopTablet.context().close()
  await phone.context().close()
})

test('signs this device out even when the server cannot be reached (UF-AUTH-04)', async ({ browser, baseURL }) => {
  test.skip(test.info().project.name !== 'desktop', 'network behaviour, not layout')
  const page = await device(browser, baseURL)
  await signIn(page, '/', account)
  await page.route('**/auth/v1/logout**', (route) => route.abort('internetdisconnected'))
  await signOutHere(page)
  await expect(page.getByRole('status').filter({ hasText: 'ออกจากระบบในเครื่องนี้แล้ว' })).toBeVisible()
  await page.unroute('**/auth/v1/logout**')
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await page.context().close()
})
