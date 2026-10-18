import { expect, test } from '@playwright/test'
import { expectAccessible, signIn, uniquePlate } from './helpers'

// Step 08 · Responsive layout, accessibility in both themes, keyboard-only use.

const PAGES = ['/', '/add', '/add?type=expense', '/debts', '/history', '/history?export=1', '/more']

test('no page is wider than a small phone (360 px)', async ({ page }) => {
  test.skip(test.info().project.name !== 'phone', 'phone layout only')
  await page.setViewportSize({ width: 360, height: 760 })
  await signIn(page)
  for (const path of PAGES) {
    await page.goto(path)
    // Wait for the page itself, not for the network to go quiet: the dashboard asks an
    // outside weather service that can be slow, which made networkidle flaky
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const overflow = await page.evaluate(() => {
      const width = window.innerWidth
      // Anything inside the page (not the off-screen skip link) reaching past the edge
      const wide = [...document.querySelectorAll('main *, nav *, dialog[open] *')]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.right > width + 1)
      return { scroll: document.documentElement.scrollWidth - width, wide: wide.length }
    })
    expect(overflow, path).toEqual({ scroll: 0, wide: 0 })
  }
})

test('pages are accessible in the light theme too', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('car-care-theme', 'light'))
  await signIn(page)
  for (const path of ['/', '/add', '/debts', '/history']) {
    await page.goto(path)
    // Wait for the page itself, not for the network to go quiet: the dashboard asks an
    // outside weather service that can be slow, which made networkidle flaky
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectAccessible(page, info, `light ${path}`)
  }
})

test('the edit and export dialogs are accessible', async ({ page }, info) => {
  await signIn(page)
  await page.goto('/history?export=1')
  await expect(page.getByRole('dialog', { name: 'ส่งออก Excel' })).toBeVisible()
  await expectAccessible(page, info, 'export dialog')
  // A seed record ("ทดสอบ …"): tests running alongside never delete those
  await page.goto(`/history?m=0&q=${encodeURIComponent('ทดสอบ')}`)
  await page.getByRole('button', { name: /แตะเพื่อแก้ไข|^แก้ไข / }).first().click()
  await expect(page.getByRole('dialog', { name: /แก้ไขราย/ })).toBeVisible()
  await expectAccessible(page, info, 'edit dialog')
})

test('a car can be recorded with the keyboard only (AC-34-2)', async ({ page }, info) => {
  const plate = uniquePlate(info, 'K')
  await signIn(page)
  await page.goto('/add')
  // Start from the plate field the way the skip link / Tab order would reach it
  await page.getByLabel(/^ป้ายทะเบียน/).focus()
  await page.keyboard.type(plate)
  await page.keyboard.press('Tab') // car type group (first option)
  await page.keyboard.press('Space') // รถเก๋ง
  await expect(page.getByRole('radio', { name: 'รถเก๋ง' })).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Tab') // price
  await page.keyboard.type('120')
  await page.keyboard.press('Enter') // moves on, does not save (no accidental saves)
  await expect(page).toHaveURL(/\/add/)
  await expect(page.getByLabel(/^ป้ายทะเบียน/)).toHaveValue(plate)
  // Tab along to the save button and press it with the keyboard
  for (let i = 0; i < 20 && !(await page.getByRole('button', { name: 'บันทึก', exact: true }).evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab')
  }
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('status').filter({ hasText: `บันทึก ${plate} ฿120 แล้ว` })).toBeVisible()
})

test('the skip link moves focus to the main content', async ({ page }) => {
  await signIn(page)
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'ข้ามไปเนื้อหา' })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#main$/)
})
