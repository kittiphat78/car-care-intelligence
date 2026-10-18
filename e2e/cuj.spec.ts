import { expect, test } from '@playwright/test'
import { expectAccessible, signIn, uniquePlate } from './helpers'

// Critical user journeys (feature-inventory.md §7), each on a phone and a desktop.
// Every test makes its own data (unique plates and customer names) on the local
// Supabase, so tests do not depend on each other or on the seed.

/** The toast with this text (older toasts may still be on screen) */
const toast = (page: import('@playwright/test').Page, text: string | RegExp) => page.getByRole('status').filter({ hasText: text })

async function addIncome(
  page: import('@playwright/test').Page,
  { plate, price, unpaidFor, keepGoing = false }: { plate: string; price: string; unpaidFor?: string; keepGoing?: boolean },
) {
  await page.getByLabel(/^ป้ายทะเบียน/).fill(plate)
  await page.getByRole('radio', { name: 'รถเก๋ง' }).click()
  await page.getByLabel(/^ราคา \(บาท\)/).fill(price)
  if (unpaidFor) {
    await page.getByRole('radio', { name: 'ค้างชำระ' }).click()
    await page.getByLabel(/^ลูกค้า \/ เต็นท์/).fill(unpaidFor)
  }
  await page.getByRole('button', { name: keepGoing ? 'บันทึกแล้วทำต่อ' : 'บันทึก', exact: true }).click()
}

test('a signed-out visitor is sent to login and comes back to the page (UF-AUTH-02)', async ({ page }) => {
  await page.goto('/history?tab=expense')
  await expect(page).toHaveURL(/\/login\?next=%2Fhistory%3Ftab%3Dexpense/)
  await signIn(page, '/history?tab=expense')
  await expect(page).toHaveURL(/\/history\?tab=expense/)
})

test('CUJ-1 · login, then the dashboard; both pages are accessible', async ({ page }, info) => {
  await page.goto('/login')
  await expectAccessible(page, info, 'login')
  await signIn(page)
  await expect(page.getByRole('heading', { level: 1, name: 'ภาพรวมวันนี้' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'เงินสดสุทธิวันนี้' })).toContainText('฿')
  await expectAccessible(page, info, 'dashboard')
})

test('CUJ-2 · record a paid wash and see it on the dashboard', async ({ page }, info) => {
  const plate = uniquePlate(info, 'W')
  await signIn(page)
  await page.goto('/add')
  await expectAccessible(page, info, 'add')
  await addIncome(page, { plate, price: '150' })
  await expect(page).toHaveURL('/')
  await expect(toast(page, `บันทึก ${plate} ฿150 แล้ว`)).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(`${plate} ฿150`) })).toBeVisible()
})

test('CUJ-3 · unpaid job for a lot → debts → bill → settle', async ({ page }, info) => {
  const customer = `E2E เต็นท์ ${info.project.name} ${Date.now() % 100000}`
  await signIn(page)
  await page.goto('/add')
  await addIncome(page, { plate: uniquePlate(info, 'U'), price: '700', unpaidFor: customer })
  await expect(page).toHaveURL('/')

  await page.goto('/debts')
  const card = page.getByRole('article', { name: customer })
  await expect(card).toContainText('฿700')
  await expectAccessible(page, info, 'debts')

  const download = page.waitForEvent('download')
  await card.getByRole('button', { name: `สร้างบิล ${customer}` }).click()
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/)
  // The "bill created" toast sits over the bottom of the screen; close it as a person would
  const billToast = toast(page, `สร้างบิล ${customer} แล้ว`)
  await billToast.getByRole('button', { name: 'ปิดการแจ้งเตือน' }).click()

  await card.getByRole('button', { name: `เคลียร์ยอด ${customer}` }).click()
  const dialog = page.getByRole('alertdialog', { name: `เคลียร์ยอด ${customer}?` })
  await expect(dialog).toContainText('1 คัน')
  await dialog.getByRole('button', { name: 'เคลียร์ยอด', exact: true }).click()
  await expect(toast(page, `เคลียร์ยอด ${customer} ฿700 แล้ว`)).toBeVisible()
  await expect(page.getByRole('article', { name: customer })).toHaveCount(0)
})

test('CUJ-4 · record an expense with a shortcut', async ({ page }) => {
  await signIn(page)
  await page.goto('/add?type=expense')
  await page.getByLabel(/^จำนวนเงินที่จ่าย/).fill('300')
  await page.getByRole('radio', { name: 'ค่าน้ำยา' }).click()
  await page.getByRole('button', { name: 'บันทึกรายจ่าย' }).click()
  await expect(page).toHaveURL('/')
  await expect(toast(page, 'บันทึกรายจ่าย ค่าน้ำยา ฿300 แล้ว')).toBeVisible()
})

test('CUJ-5 · record several cars in a row', async ({ page }, info) => {
  const first = uniquePlate(info, 'A')
  const second = uniquePlate(info, 'B')
  await signIn(page)
  await page.goto('/add')
  await addIncome(page, { plate: first, price: '150', keepGoing: true })
  await expect(toast(page, first)).toBeVisible()
  // Plate cleared and focused for the next car; job and car type kept (AC-05-1)
  await expect(page.getByLabel(/^ป้ายทะเบียน/)).toHaveValue('')
  await expect(page.getByLabel(/^ป้ายทะเบียน/)).toBeFocused()
  await expect(page.getByRole('radio', { name: 'รถเก๋ง' })).toHaveAttribute('aria-checked', 'true')
  await page.getByLabel(/^ป้ายทะเบียน/).fill(second)
  await page.getByLabel(/^ราคา \(บาท\)/).fill('200')
  await page.getByRole('button', { name: 'บันทึกแล้วทำต่อ' }).click()
  await expect(toast(page, second)).toBeVisible()
  await expect(page).toHaveURL(/\/add/)
})

test('CUJ-6 · find a record in history, change its price, then delete it', async ({ page }, info) => {
  const plate = uniquePlate(info, 'E')
  await signIn(page)
  await page.goto('/add')
  await addIncome(page, { plate, price: '150' })
  await expect(page).toHaveURL('/')

  await page.goto(`/history?q=${encodeURIComponent(plate)}`)
  await expectAccessible(page, info, 'history')
  await page.getByRole('button', { name: new RegExp(plate) }).click()
  const edit = page.getByRole('dialog', { name: 'แก้ไขรายรับ' })
  await edit.getByLabel(/^ราคา \(บาท\)/).fill('250')
  await edit.getByRole('button', { name: 'บันทึกการแก้ไข' }).click()
  await expect(toast(page, 'บันทึกการแก้ไขแล้ว')).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(`${plate}.*฿250`) })).toBeVisible()

  await page.getByRole('button', { name: new RegExp(plate) }).click()
  await page.getByRole('dialog', { name: 'แก้ไขรายรับ' }).getByRole('button', { name: 'ลบ', exact: true }).click()
  await page.getByRole('button', { name: 'ลบรายการ' }).click()
  await expect(toast(page, `ลบ ${plate} ฿250 แล้ว`)).toBeVisible()
  await expect(page.getByText(`ไม่พบรายการที่ตรงกับ “${plate}”`)).toBeVisible()
})

test('CUJ-7 · export the month to Excel', async ({ page }) => {
  await signIn(page)
  await page.goto('/history')
  await page.getByRole('button', { name: 'ส่งออก Excel' }).click()
  const dialog = page.getByRole('dialog', { name: 'ส่งออก Excel' })
  await expect(dialog).toContainText(/พบ [\d,]+ รายการ/)
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'ดาวน์โหลด Excel' }).click()
  expect((await download).suggestedFilename()).toMatch(/^สรุปรายรับและรายจ่าย_.+\.xlsx$/)
  await expect(toast(page, /ส่งออก [\d,]+ รายการแล้ว/)).toBeVisible()
})

test('CUJ-8 · sign out, with a confirmation; /more is accessible', async ({ page }, info) => {
  await signIn(page)
  await page.goto('/more')
  await expectAccessible(page, info, 'more')
  await page.getByRole('main').getByRole('link', { name: 'ออกจากระบบ' }).click()
  const dialog = page.getByRole('alertdialog', { name: 'ออกจากระบบ?' })
  await expect(dialog.getByRole('button', { name: 'ยกเลิก' })).toBeFocused()
  await dialog.getByRole('button', { name: 'ออกจากระบบ' }).click()
  await expect(page).toHaveURL(/\/login$/)
  // Signed out for real: protected pages send back to login
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})
