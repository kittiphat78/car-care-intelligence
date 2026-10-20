import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { localSupabase } from './global-setup'
import { expectAccessible, signIn } from './helpers'

// Customer directory v2.2.0 (docs/features/customer-directory.md §10), on a phone and a
// desktop. Test data follows the spec: names "ทดสอบ …", numbers 080-000-000x. Each
// project uses its own name prefix and plate letters, so the two can run side by side.

const toast = (page: Page, text: string | RegExp) => page.getByRole('status').filter({ hasText: text })

function testData(info: TestInfo) {
  const phone = info.project.name === 'phone'
  const n = `${Date.now() % 10000}`.padStart(4, '0')
  const prefix = `ทดสอบ E2E-${phone ? 'P' : 'D'}`
  return {
    prefix,
    name: `${prefix} ${n}`,
    // Full plates (Thai letters + digits) belong to one customer only (M012)
    plate1: `${phone ? 'ฮก' : 'ฮข'} ${n}`,
    plate2: `${phone ? 'ฮง' : 'ฮจ'} ${n}`,
    n,
  }
}

/** Remove what an earlier, failed run of this project left behind (service key, local only) */
async function removeLeftovers(prefix: string) {
  const { url, serviceKey } = localSupabase()
  const r = await fetch(`${url}/rest/v1/customers?name=like.${encodeURIComponent(`${prefix}*`)}`, {
    method: 'DELETE',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  expect(r.ok, 'clean up earlier test customers').toBe(true)
}

/** The list row (phone: card, desktop: table row) of one customer */
const rowOf = (page: Page, name: string) => page.locator('li, tr').filter({ has: page.getByRole('link', { name: new RegExp(`^${name}`) }) })

test('customer directory: add 2 numbers and 2 vehicles, find, call, edit, delete', async ({ page }, info) => {
  const { prefix, name, plate1, plate2, n } = testData(info)
  await removeLeftovers(prefix)

  // Nothing typed into the search may reach the app's server (ADR-23, AC-02-4)
  const appRequests: string[] = []
  const problems: string[] = []
  page.on('request', (r) => {
    if (r.url().startsWith('http://127.0.0.1:3100')) appRequests.push(decodeURIComponent(r.url()))
  })

  await signIn(page)

  // The way in: the card on /more (phones) or the side menu (desktop), Q-1
  if (info.project.name === 'phone') {
    await page.goto('/more')
    await page.getByRole('link', { name: /^ลูกค้า/ }).click()
  } else {
    await page.getByRole('navigation', { name: 'เมนูหลัก' }).getByRole('link', { name: 'ลูกค้า' }).click()
  }
  await expect(page).toHaveURL('/customers')
  await expect(page.getByRole('heading', { level: 1, name: 'ลูกค้า' })).toBeVisible()
  // From here on: errors of the customer pages only (not of the dashboard left behind)
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    // The local and CI stacks run without the realtime service the dashboard listens to
    if (m.type() === 'error' && !/realtime\/v1\/websocket/.test(m.text())) problems.push(`console: ${m.text()}`)
  })
  await expectAccessible(page, info, 'customers')

  // Not found → "add" with the search text as the name (AC-02-5)
  const search = page.getByRole('searchbox', { name: 'ค้นหาชื่อ เบอร์ หรือทะเบียน' })
  await search.fill(name)
  await expect(page.getByText(`ไม่พบ “${name}”`)).toBeVisible()
  await page.getByRole('button', { name: `เพิ่มลูกค้าใหม่ชื่อ ${name}` }).click()
  const form = page.getByRole('dialog', { name: 'เพิ่มลูกค้า' })
  await expect(form).toBeVisible()
  await expect(form.getByRole('textbox', { name: /ชื่อลูกค้า/ })).toHaveValue(name)

  // 2 numbers and 2 vehicles (AC-01-1)
  await form.getByRole('textbox', { name: 'เบอร์', exact: true }).fill('080-000-0001')
  await form.getByRole('button', { name: 'เพิ่มเบอร์' }).click()
  await form.getByRole('textbox', { name: 'เบอร์ 2' }).fill('080-000-0002')
  await form.getByRole('textbox', { name: 'ชื่อเรียกเบอร์ (ไม่บังคับ)' }).first().fill('เจ้าของ')
  await form.getByRole('textbox', { name: 'ทะเบียน' }).fill(plate1)
  await form.getByRole('radio', { name: 'รถกระบะ' }).click()
  await form.getByLabel('ยี่ห้อ').selectOption('toyota')
  await form.getByRole('textbox', { name: 'สี' }).fill('ขาว')
  await form.getByRole('button', { name: 'เพิ่มรถ' }).click()
  await form.getByRole('textbox', { name: 'ทะเบียน' }).nth(1).fill(plate2)
  await expectAccessible(page, info, 'customer form')
  await form.getByRole('button', { name: 'บันทึก', exact: true }).click()

  // The new customer's page
  await expect(page).toHaveURL(/\/customers\/[0-9a-f-]{36}$/)
  await expect(toast(page, `เพิ่มลูกค้า ${name} แล้ว`)).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
  await expect(page.getByRole('link', { name: `โทร 080-000-0001 ${name}` })).toHaveAttribute('href', 'tel:0800000001')
  await expect(page.getByRole('link', { name: `โทร 080-000-0002 ${name}` })).toHaveAttribute('href', 'tel:0800000002')
  await expect(page.getByText(plate1, { exact: true })).toBeVisible()
  await expect(page.getByText('รถกระบะ · TOYOTA · ขาว')).toBeVisible()
  await expectAccessible(page, info, 'customer page')

  // Back to the list: the search is still there (AC-02-4)
  await page.getByRole('main').getByRole('link', { name: 'ลูกค้า', exact: true }).click()
  await expect(page).toHaveURL(/\/customers\?q=/)
  await expect(search).toHaveValue(name)

  // Find by name, part of a number, part of a plate (AC-02-1..3)
  for (const [query, match] of [
    [name.slice(0, -2), 'ตรงกับ: ชื่อ'],
    ['000-0002', 'ตรงกับ: เบอร์ 080-000-0002'],
    [`${plate1.slice(0, 2)}${n.slice(0, 3)}`, `ตรงกับ: ทะเบียน ${plate1}`],
  ]) {
    await search.fill(query)
    await expect(rowOf(page, name).getByText(match)).toBeVisible()
  }
  // The call button dials the main number (AC-03-1)
  await expect(rowOf(page, name).getByRole('link', { name: `โทร 080-000-0001 ${name}` })).toHaveAttribute('href', 'tel:0800000001')

  // Edit: new name, one vehicle less (AC-06-1); the dialog is in the URL (AC-06-3)
  await rowOf(page, name).getByRole('link', { name: new RegExp(`^${name}`) }).click()
  await page.getByRole('button', { name: 'แก้ไข', exact: true }).click()
  await expect(page).toHaveURL(/\?edit=customer%3A|\?edit=customer:/)
  const edit = page.getByRole('dialog', { name: 'แก้ไขลูกค้า' })
  await edit.getByRole('textbox', { name: /ชื่อลูกค้า/ }).fill(`${name} แก้`)
  await edit.getByRole('button', { name: 'ลบคันที่ 2' }).click()
  await edit.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await expect(toast(page, 'บันทึกการแก้ไขแล้ว')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: `${name} แก้` })).toBeVisible()
  await expect(page.getByText(plate2)).toHaveCount(0)

  // Delete after a confirmation that says what goes and what stays (AC-07-1, AC-07-2)
  await page.getByRole('button', { name: 'ลบลูกค้า' }).click()
  const confirm = page.getByRole('alertdialog', { name: `ลบ ${name} แก้?` })
  await expect(confirm).toContainText('เบอร์ 2 เบอร์ · รถ 1 คัน จะถูกลบด้วย')
  await expect(confirm).toContainText('ประวัติการล้างรถไม่ถูกลบ')
  await expect(confirm.getByRole('button', { name: 'ยกเลิก' })).toBeFocused()
  await confirm.getByRole('button', { name: 'ลบลูกค้า' }).click()
  await expect(toast(page, `ลบ ${name} แก้ แล้ว`)).toBeVisible()
  await expect(page).toHaveURL(/\/customers(\?|$)/)
  await search.fill(name)
  await expect(page.getByText(`ไม่พบ “${name}”`)).toBeVisible()

  expect(appRequests.filter((u) => /000-?0002|0800000002|E2E-/.test(u)), 'search text sent to the app server').toEqual([])
  expect(problems, 'console errors').toEqual([])
})

test('a full plate of another customer moves only when asked (AC-08-1, AC-08-2)', async ({ page }, info) => {
  const { prefix, name, plate1 } = testData(info)
  await removeLeftovers(prefix)
  await signIn(page, '/customers')

  async function add(customerName: string, plate: string) {
    await page.getByRole('button', { name: 'เพิ่มลูกค้า' }).first().click()
    const form = page.getByRole('dialog', { name: 'เพิ่มลูกค้า' })
    await form.getByRole('textbox', { name: /ชื่อลูกค้า/ }).fill(customerName)
    await form.getByRole('textbox', { name: 'ทะเบียน' }).fill(plate)
    return form
  }

  await (await add(`${name} B`, plate1)).getByRole('button', { name: 'บันทึก', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: `${name} B` })).toBeVisible()
  await page.goto('/customers')

  // The same plate typed differently, with a province (M012 plate_core)
  const form = await add(`${name} A`, `${plate1.replace(' ', '-')} ชร.`)
  await expect(form.getByText(`ทะเบียนนี้อยู่กับ ${name} B`)).toBeVisible()
  await form.getByRole('button', { name: 'ย้ายรถมาที่ลูกค้านี้' }).click()
  await expect(form.getByText(`จะย้ายรถคันนี้จาก ${name} B`)).toBeVisible()
  await form.getByRole('button', { name: 'บันทึก', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: `${name} A` })).toBeVisible()

  // B no longer has it
  await page.goto('/customers')
  await page.getByRole('searchbox').fill(`${name} B`)
  await rowOf(page, `${name} B`).getByRole('link', { name: new RegExp(`^${name} B`) }).click()
  await expect(page.getByText('ยังไม่มีรถ')).toBeVisible()
  await removeLeftovers(prefix)
})
