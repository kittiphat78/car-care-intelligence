import { expect, test } from '@playwright/test'
import { expectAccessible, signIn, uniquePlate } from './helpers'

// Step 08 · Responsive layout, accessibility in both themes, keyboard-only use.

const PAGES = ['/', '/add', '/add?type=expense', '/debts', '/history', '/history?export=1', '/customers', '/customers?new=1', '/more']

// WCAG 1.4.10 Reflow: 320 CSS px (Step 09 A-02 found a button running off at 320)
test('no page is wider than the narrowest phone (320 px)', async ({ page }) => {
  test.skip(test.info().project.name !== 'phone', 'phone layout only')
  await page.setViewportSize({ width: 320, height: 640 })
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

// WCAG 1.4.4 Resize text: with the phone's text at 200% the bottom bar used to stay 64px
// tall and cut every label off; on a folded phone (280 px) the labels ran into each other
test('the bottom bar keeps its labels with large text and on a 280 px fold', async ({ page }) => {
  test.skip(test.info().project.name !== 'phone', 'phone layout only')
  await signIn(page)
  const labels = () =>
    page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="เมนูหลัก"].bottom-0')!.getBoundingClientRect()
      const spans = [...document.querySelectorAll('nav[aria-label="เมนูหลัก"].bottom-0 a > span:not([aria-hidden]):not(.absolute)')].filter((s) => s.textContent?.trim())
      const boxes = spans.map((s) => s.getBoundingClientRect())
      return {
        // every label fully inside the bar and not clamped
        cut: spans.filter((s, i) => s.scrollHeight > s.clientHeight + 1 || boxes[i].bottom > nav.bottom + 1 || boxes[i].top < nav.top - 1).map((s) => s.textContent),
        // no two labels touching
        touching: boxes.slice(1).filter((b, i) => b.left < boxes[i].right + 2).length,
        // the page leaves room for the bar (content never hidden under it)
        room: parseFloat(getComputedStyle(document.querySelector('main')!).paddingBottom) >= nav.height,
      }
    })

  await page.setViewportSize({ width: 280, height: 653 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(await labels(), '280 px').toEqual({ cut: [], touching: 0, room: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'))
  await page.waitForTimeout(300) // the bar measures itself after it grew
  expect(await labels(), 'text 200%').toEqual({ cut: [], touching: 0, room: true })
})

test('pages are accessible in the light theme too', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem('car-care-theme', 'light'))
  await signIn(page)
  for (const path of ['/', '/add', '/debts', '/history', '/customers']) {
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
