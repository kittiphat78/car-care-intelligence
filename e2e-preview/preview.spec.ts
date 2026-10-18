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
    if (m.type() === 'error') problems.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 200)}`))
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
  const r = await request.get('/login')
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

  const title = `ทดสอบ ${plate}`
  await page.goto('/add?type=expense')
  await page.getByLabel(/^จำนวนเงินที่จ่าย/).fill('33')
  await page.getByLabel(/^จ่ายค่าอะไร/).fill(title)
  await page.getByRole('button', { name: 'บันทึกรายจ่าย' }).click()
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
  expect(problems.filter((p) => !/realtime|websocket/i.test(p)), 'console errors').toEqual([])
})

test('sign out on this device only, then protected pages ask to sign in', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'once')
  await signIn(page)
  const other = await (await browser.newContext({ ...info.project.use })).newPage()
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
