import { expect, test } from '@playwright/test'
import { E2E_EMAIL } from './global-setup'
import { signIn, uniquePlate } from './helpers'

// Step 08 · v1 features that the journeys in cuj.spec.ts do not reach
// (feature-inventory.md F-06, F-08, F-28, F-29, F-39). See regression-report.md.

test('the app can still be installed: manifest and icons are served to anyone (F-08)', async ({ request }) => {
  test.skip(test.info().project.name !== 'desktop', 'no screen involved')
  const r = await request.get('/manifest.json')
  expect(r.status()).toBe(200)
  const manifest = (await r.json()) as { name: string; start_url: string; display: string; icons: Array<{ src: string }> }
  expect(manifest).toMatchObject({ name: 'Car Care Intelligence', start_url: '/', display: 'standalone' })
  expect(manifest.icons.length).toBeGreaterThan(0)
  for (const icon of manifest.icons) {
    const i = await request.get(icon.src)
    expect(i.status(), icon.src).toBe(200)
    expect(i.headers()['content-type'], icon.src).toContain('image/')
  }
})

test('the theme switch applies at once and is remembered (F-06)', async ({ page }) => {
  await signIn(page)
  await page.goto('/more')
  // The desktop side menu has the same switch; use the one on the page
  const dark = page.getByRole('main').getByRole('switch', { name: 'ธีมมืด' })
  await expect(dark).toHaveAttribute('aria-checked', 'true') // dark is the default
  await dark.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(dark).toHaveAttribute('aria-checked', 'false')
})

test('brand, customer and who saved a record come back; the customer is offered next time (F-28, F-29, F-39)', async ({ page }, info) => {
  const plate = uniquePlate(info, 'R')
  const customer = `E2E ร้าน ${info.project.name} ${Date.now() % 100000}`
  await signIn(page)
  await page.goto('/add')
  await page.getByLabel(/^ป้ายทะเบียน/).fill(plate)
  await page.getByRole('radio', { name: 'รถเก๋ง' }).click()
  await page.getByLabel(/^ราคา \(บาท\)/).fill('180')
  await page.getByRole('button', { name: 'เพิ่มชื่อลูกค้า' }).click()
  await page.getByLabel(/^ลูกค้า \/ เต็นท์/).fill(customer)
  await page.getByRole('button', { name: 'เลือกยี่ห้อ (ไม่บังคับ)' }).click()
  await page.getByRole('radio', { name: 'HONDA' }).click()
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await expect(page).toHaveURL('/')

  // The record keeps the brand and customer, and says who saved it (audit, F-39)
  await page.goto(`/history?q=${encodeURIComponent(plate)}`)
  await page.getByRole('button', { name: new RegExp(plate) }).click()
  const edit = page.getByRole('dialog', { name: 'แก้ไขรายรับ' })
  await expect(edit.getByRole('radio', { name: 'HONDA' })).toHaveAttribute('aria-checked', 'true')
  await expect(edit.getByLabel(/^ลูกค้า \/ เต็นท์/)).toHaveValue(customer)
  await expect(edit.getByText(new RegExp(`^${E2E_EMAIL.replace('.', '\\.')} · `))).toBeVisible()

  // Recent customers live on this device: the next new record offers the name in one tap
  await page.goto('/add')
  await page.getByRole('button', { name: 'เพิ่มชื่อลูกค้า' }).click()
  await page.getByRole('group', { name: 'ลูกค้าล่าสุด' }).getByRole('button', { name: customer }).click()
  await expect(page.getByLabel(/^ลูกค้า \/ เต็นท์/)).toHaveValue(customer)
})

test('the dashboard still works when the chart file cannot be downloaded (D-11)', async ({ page }) => {
  await signIn(page)
  // File names change with every build; find the chart library by its content
  await page.route(/\/_next\/static\/.*\.js/, async (route) => {
    const response = await route.fetch()
    if ((await response.text()).includes('recharts')) return route.abort('internetdisconnected')
    return route.fulfill({ response })
  })
  await page.goto('/more')
  // Go there inside the app, as a person would (the menu shows one visible link)
  await page.getByRole('link', { name: 'ภาพรวม', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('region', { name: 'เงินสดสุทธิวันนี้' })).toBeVisible()
  await expect(page.getByText('โหลดกราฟไม่สำเร็จ')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'ภาพรวมวันนี้' })).toBeVisible()
})

test('what is typed before the page is ready stays in the form and is saved (D-08)', async ({ page }, info) => {
  const plate = uniquePlate(info, 'T')
  await signIn(page)
  // Hold the scripts: the form stays exactly as the server sent it, as on a slow phone
  let release!: () => void
  const held = new Promise<void>((r) => (release = r))
  await page.route(/\/_next\/static\/chunks\/.*\.js/, async (route) => {
    await held
    await route.continue().catch(() => {})
  })
  await page.goto('/add', { waitUntil: 'domcontentloaded' })
  await page.getByLabel(/^ป้ายทะเบียน/).fill(plate)
  await page.getByLabel(/^ราคา \(บาท\)/).fill('250')
  release()
  const save = page.getByRole('button', { name: 'บันทึก', exact: true })
  await expect(save).toBeEnabled()
  // The first tap after the page was ready used to wipe what was typed before it
  await page.getByRole('radio', { name: 'รถเก๋ง' }).click()
  await expect(page.getByLabel(/^ป้ายทะเบียน/)).toHaveValue(plate)
  await expect(page.getByLabel(/^ราคา \(บาท\)/)).toHaveValue('250')
  await save.click()
  await expect(page).toHaveURL('/')
  await page.goto(`/history?q=${encodeURIComponent(plate)}`)
  await expect(page.getByRole('button', { name: new RegExp(plate) })).toBeVisible()
})
