import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type TestInfo } from '@playwright/test'

// Release-candidate checks on a Vercel Preview + staging (see playwright.config.ts).

const PRODUCTION_HOST = 'car-care-intelligence-53wd.vercel.app'
const PRODUCTION_REF = 'fgzeaxntmvirrrsqpmeu'
const STAGING_REF = 'mfgucpntfiokqygzrhtt'
const EMAIL = process.env.STAGING_EMAIL ?? ''
const PASSWORD = process.env.STAGING_PASSWORD ?? ''

test.beforeAll(() => {
  const host = new URL(process.env.PREVIEW_URL ?? 'http://invalid').hostname
  if (!process.env.PREVIEW_URL || host === PRODUCTION_HOST || !host.endsWith('.vercel.app')) {
    throw new Error(`Refusing to run: PREVIEW_URL must be a Vercel Preview, not ${host}`)
  }
  if (!EMAIL || !PASSWORD) throw new Error('Set STAGING_EMAIL and STAGING_PASSWORD')
})

/**
 * Opens the protected Preview once with the bypass secret; Vercel answers with a cookie,
 * so later requests need nothing extra. (A header on every request reached other sites
 * too and broke their CORS checks; intercepting requests confused WebKit.)
 */
async function unlock(page: Page) {
  const secret = encodeURIComponent(process.env.PREVIEW_BYPASS ?? '')
  await page.goto(`/login?x-vercel-protection-bypass=${secret}&x-vercel-set-bypass-cookie=samesitenone`)
}

test.beforeEach(async ({ page }) => {
  await unlock(page)
})

/** Known Preview/browser messages that are not app errors (recorded in preview-test-results.md) */
const KNOWN = [
  /vercel\.live/, // Vercel Toolbar, injected on Preview deployments only, blocked by our CSP
  /interactive-widget/, // Safari ignores this viewport key (S03-05)
  /realtime|websocket/i, // realtime is off
  // WebKit reports requests cancelled by moving to the next page this way; Chromium (phone,
  // desktop) shows no such errors for the same flows
  /due to access control checks/,
]

const tag = (info: TestInfo) => `RC${info.project.name[0].toUpperCase()}${Date.now() % 100000}`

/** Every Supabase request of the page must go to staging, never production */
function watchDatabase(page: Page) {
  const hosts = new Set<string>()
  page.on('request', (r) => {
    const h = new URL(r.url()).hostname
    if (h.endsWith('.supabase.co')) hosts.add(h)
  })
  return () => {
    expect([...hosts].filter((h) => h.startsWith(PRODUCTION_REF)), 'requests to the production database').toEqual([])
    return [...hosts]
  }
}

/** Console errors and CSP violations */
function watchConsole(page: Page) {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' && !KNOWN.some((k) => k.test(m.text()))) problems.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => {
    if (!KNOWN.some((k) => k.test(e.message))) problems.push(`pageerror: ${e.message.slice(0, 200)}`)
  })
  return problems
}

async function signIn(page: Page) {
  await page.goto('/login')
  await expect(page.getByRole('status').filter({ hasText: 'ระบบทดสอบ (Preview)' })).toBeVisible()
  await page.getByLabel('อีเมล', { exact: true }).fill(EMAIL)
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
  await page.waitForURL((u) => u.pathname === '/')
}

const toast = (page: Page, text: string | RegExp) => page.getByRole('status').filter({ hasText: text })

test('environment: Preview label, staging database, version, security headers', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop', 'once')
  const db = watchDatabase(page)
  await signIn(page)
  await page.goto('/more')
  await expect(page.getByRole('main')).toContainText('2.1.0')
  const hosts = db()
  expect(hosts.some((h) => h.startsWith(STAGING_REF)), `talks to staging (${hosts.join(', ')})`).toBe(true)
  const r = await request.get('/login', { headers: { 'x-vercel-protection-bypass': process.env.PREVIEW_BYPASS ?? '' }, maxRedirects: 0 })
  expect(r.status()).toBe(200)
  const csp = r.headers()['content-security-policy'] ?? ''
  expect(csp).toContain("frame-ancestors 'none'")
  expect(csp).not.toContain('unsafe-eval')
  info.annotations.push({ type: 'database hosts', description: hosts.join(', ') })
})

test('CUJ: record, see, edit and delete income; record and delete an expense', async ({ page }, info) => {
  const plate = tag(info)
  const db = watchDatabase(page)
  const problems = watchConsole(page)
  await signIn(page)
  await page.goto('/add')
  await page.getByLabel(/^ป้ายทะเบียน/).fill(plate)
  await page.getByRole('radio', { name: 'รถเก๋ง' }).click()
  await page.getByLabel(/^ราคา \(บาท\)/).fill('111')
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(toast(page, `บันทึก ${plate} ฿111 แล้ว`)).toBeVisible()
  await page.goto(`/history?q=${encodeURIComponent(plate)}`)
  await page.getByRole('button', { name: new RegExp(plate) }).click()
  const edit = page.getByRole('dialog', { name: 'แก้ไขรายรับ' })
  await edit.getByLabel(/^ราคา \(บาท\)/).fill('222')
  await edit.getByRole('button', { name: 'บันทึกการแก้ไข' }).click()
  await expect(toast(page, 'บันทึกการแก้ไขแล้ว')).toBeVisible()
  await page.getByRole('button', { name: new RegExp(`${plate}.*฿222`) }).click()
  await page.getByRole('dialog', { name: 'แก้ไขรายรับ' }).getByRole('button', { name: 'ลบ', exact: true }).click()
  await page.getByRole('button', { name: 'ลบรายการ' }).click()
  await expect(toast(page, `ลบ ${plate} ฿222 แล้ว`)).toBeVisible()
  // The dialog removes ?edit= from the address; let that finish before leaving the page
  await expect(page).not.toHaveURL(/edit=/)

  const title = `ทดสอบ ${plate}`
  await page.goto('/add?type=expense')
  await page.getByLabel(/^จำนวนเงินที่จ่าย/).fill('33')
  await page.getByLabel(/^จ่ายค่าอะไร/).fill(title)
  await page.getByRole('button', { name: 'บันทึกรายจ่าย' }).click()
  await expect(page).toHaveURL('/')
  await expect(toast(page, `บันทึกรายจ่าย ${title} ฿33 แล้ว`)).toBeVisible()
  await page.goto(`/history?tab=expense&q=${encodeURIComponent(plate)}`)
  await page.getByRole('button', { name: new RegExp(plate) }).click()
  await page.getByRole('dialog', { name: 'แก้ไขรายจ่าย' }).getByRole('button', { name: 'ลบ', exact: true }).click()
  await page.getByRole('button', { name: 'ลบรายการ' }).click()
  await expect(page.getByText(`ไม่พบรายการที่ตรงกับ “${plate}”`)).toBeVisible()
  db()
  expect(problems, 'console errors').toEqual([])
})

test('CUJ: unpaid job → debts → bill PDF → settle', async ({ page }, info) => {
  const plate = tag(info)
  const customer = `ทดสอบ RC ${plate}`
  const db = watchDatabase(page)
  await signIn(page)
  await page.goto('/add')
  await page.getByLabel(/^ป้ายทะเบียน/).fill(plate)
  await page.getByRole('radio', { name: 'รถเก๋ง' }).click()
  await page.getByLabel(/^ราคา \(บาท\)/).fill('444')
  await page.getByRole('radio', { name: 'ค้างชำระ' }).click()
  await page.getByLabel(/^ลูกค้า \/ เต็นท์/).fill(customer)
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await expect(page).toHaveURL('/')
  await page.goto('/debts')
  const card = page.getByRole('article', { name: customer })
  await expect(card).toContainText('฿444')
  const download = page.waitForEvent('download')
  await card.getByRole('button', { name: `สร้างบิล ${customer}` }).click()
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/)
  await toast(page, `สร้างบิล ${customer} แล้ว`).getByRole('button', { name: 'ปิดการแจ้งเตือน' }).click()
  await card.getByRole('button', { name: `เคลียร์ยอด ${customer}` }).click()
  await page.getByRole('alertdialog', { name: `เคลียร์ยอด ${customer}?` }).getByRole('button', { name: 'เคลียร์ยอด', exact: true }).click()
  await expect(toast(page, `เคลียร์ยอด ${customer} ฿444 แล้ว`)).toBeVisible()
  await expect(page).not.toHaveURL(/settle=/)
  // Clean up: delete the settled record
  await page.goto(`/history?q=${encodeURIComponent(plate)}`)
  await page.getByRole('button', { name: new RegExp(plate) }).click()
  await page.getByRole('dialog', { name: 'แก้ไขรายรับ' }).getByRole('button', { name: 'ลบ', exact: true }).click()
  await page.getByRole('button', { name: 'ลบรายการ' }).click()
  await expect(page.getByText(`ไม่พบรายการที่ตรงกับ “${plate}”`)).toBeVisible()
  db()
})

test('CUJ: export Excel, every page loads, no console errors, accessible, fits 320 px', async ({ page }, info) => {
  const db = watchDatabase(page)
  const problems = watchConsole(page)
  await signIn(page)
  await page.goto('/history')
  await page.getByRole('button', { name: 'ส่งออก Excel' }).click()
  const dialog = page.getByRole('dialog', { name: 'ส่งออก Excel' })
  await expect(dialog).toContainText(/พบ [\d,]+ รายการ/)
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'ดาวน์โหลด Excel' }).click()
  expect((await download).suggestedFilename()).toMatch(/\.xlsx$/)
  if (info.project.name !== 'desktop') await page.setViewportSize({ width: 320, height: 640 })
  const issues: string[] = []
  for (const path of ['/', '/add', '/add?type=expense', '/debts', '/history', '/more']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 30000 }).catch(() => {})
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    if (wide > 0) issues.push(`${path}: ${wide}px too wide`)
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']).options({ rules: { 'label-content-name-mismatch': { enabled: true } } }).analyze()
    for (const v of axe.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical')) issues.push(`${path}: ${v.id}`)
  }
  expect(issues).toEqual([])
  db()
  expect(problems, 'console errors').toEqual([])
})

test('sign out on this device only, then protected pages ask to sign in', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'once')
  await signIn(page)
  const other = await (await browser.newContext({ ...info.project.use })).newPage()
  await unlock(other) // a second device needs the bypass cookie too
  await signIn(other)
  await page.goto('/more?logout=1')
  await page.getByRole('alertdialog', { name: 'ออกจากระบบ?' }).getByRole('button', { name: 'ออกจากระบบ' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/history')
  await expect(page).toHaveURL(/\/login\?next=%2Fhistory$/)
  await other.goto('/history')
  await expect(other).toHaveURL(/\/history$/)
  await other.context().close()
})

// Runs last: removes anything a failed run left behind (only this script's own patterns)
test('clean up test data left by earlier runs', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'once')
  await signIn(page)
  for (const [tab, q, mine] of [
    ['income', 'RC', /^RC[PDI]\d{5}$/],
    ['expense', 'ทดสอบ RC', /^ทดสอบ RC[PDI]\d{5}$/],
  ] as const) {
    for (let i = 0; i < 20; i++) {
      await page.goto(`/history?m=0&tab=${tab}&q=${encodeURIComponent(q)}`)
      await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 30000 })
      const rows = page.getByRole('button', { name: /แก้ไข/ })
      const names = await rows.evaluateAll((els) => els.map((el) => (el.getAttribute('aria-label') ?? '').replace(/^แก้ไข /, '').replace(/ ฿.*$/, '')))
      const index = names.findIndex((n) => mine.test(n))
      if (index < 0) break
      await rows.nth(index).click()
      await page.locator('dialog[open]').getByRole('button', { name: 'ลบ', exact: true }).click()
      await page.getByRole('button', { name: 'ลบรายการ' }).click()
      await expect(page.getByRole('status').filter({ hasText: /^ลบ / })).toBeVisible()
      info.annotations.push({ type: 'removed', description: `${tab}: ${names[index]}` })
    }
  }
})
