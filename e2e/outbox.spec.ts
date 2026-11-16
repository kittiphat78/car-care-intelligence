import { expect, test, type Route } from '@playwright/test'
import { signIn, uniquePlate } from './helpers'

// "บันทึก" shows the car at once and sends it behind (ADR-30). When the network fails the
// car stays as "ยังไม่ส่ง" and is sent again with the same request id, so it is saved once.

const INSERT_RECORDS = '**/rest/v1/records*'
const offline = (route: Route) => (route.request().method() === 'POST' ? route.abort('internetdisconnected') : route.continue())

test('a car the network lost stays as "ยังไม่ส่ง" and is saved once when sent again (ADR-30)', async ({ page }, info) => {
  const plate = uniquePlate(info, 'O')
  await signIn(page)
  await page.goto('/add')
  await page.route(INSERT_RECORDS, offline)

  await page.getByLabel(/^ป้ายทะเบียน/).fill(plate)
  await page.getByRole('radio', { name: 'รถเก๋ง' }).click()
  await page.getByLabel(/^ราคา \(บาท\)/).fill('150')
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click()

  // On the dashboard at once, the car first in today's list with its label
  await expect(page).toHaveURL('/')
  const today = page.getByRole('region', { name: /รายการวันนี้/ })
  await expect(today.getByRole('button', { name: new RegExp(`${plate}.*ยังไม่ส่ง.*แตะเพื่อส่งอีกครั้ง`) })).toBeVisible()
  const lost = page.getByRole('alert').filter({ hasText: `ส่ง ${plate} ไม่ได้ ไม่มีสัญญาณ` })
  await expect(lost).toBeVisible()

  // Back online: "ส่งอีกครั้ง" sends it (an automatic try may get there first; either way, once)
  await page.unroute(INSERT_RECORDS)
  await lost.getByRole('button', { name: 'ส่งอีกครั้ง' }).click()
  await expect(page.getByRole('status').filter({ hasText: `บันทึก ${plate} ฿150 แล้ว` })).toBeVisible()
  await expect(today.getByRole('button', { name: new RegExp(`${plate}.*แตะเพื่อแก้ไข`) })).toBeVisible()

  await page.goto(`/history?q=${encodeURIComponent(plate)}`)
  await expect(page.getByRole('main').getByRole('button', { name: new RegExp(plate) })).toHaveCount(1)
})

test('the browser asks before closing while a car is not sent (ADR-30)', async ({ page }, info) => {
  const plate = uniquePlate(info, 'Q')
  await signIn(page)
  await page.goto('/add')
  await page.route(INSERT_RECORDS, offline)
  await page.getByLabel(/^ป้ายทะเบียน/).fill(plate)
  await page.getByRole('radio', { name: 'รถเก๋ง' }).click()
  await page.getByLabel(/^ราคา \(บาท\)/).fill('150')
  await page.getByRole('button', { name: 'บันทึกแล้วทำต่อ' }).click()
  await expect(page.getByRole('alert').filter({ hasText: `ส่ง ${plate} ไม่ได้` })).toBeVisible()

  const dialog = page.waitForEvent('dialog')
  void page.close({ runBeforeUnload: true })
  const asked = await dialog
  expect(asked.type()).toBe('beforeunload')
  await asked.dismiss()
})
