import { expect, test } from '@playwright/test'
import { E2E_EMAIL, E2E_PASSWORD, OUTSIDER_EMAIL, OUTSIDER_PASSWORD, localSupabase } from './global-setup'
import { signIn } from './helpers'

// Step 08 · Authentication, authorization and RLS through the real APIs (PostgREST and
// Supabase Auth), not only through the UI: what an attacker with the public key, or a
// signed-up stranger, can do by calling the database directly. Local Supabase only.
// API-level tests run once (desktop project); they do not depend on screen size.

const { url, anonKey } = localSupabase()

async function tokenFor(email: string, password: string): Promise<string> {
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  expect(r.ok, `sign-in for ${email}`).toBe(true)
  return ((await r.json()) as { access_token: string }).access_token
}

function rest(token: string | null) {
  const headers = { apikey: anonKey, Authorization: `Bearer ${token ?? anonKey}`, 'Content-Type': 'application/json' }
  return {
    get: (path: string) => fetch(`${url}/rest/v1/${path}`, { headers }),
    post: (path: string, body: unknown, prefer = 'return=representation') =>
      fetch(`${url}/rest/v1/${path}`, { method: 'POST', headers: { ...headers, Prefer: prefer }, body: JSON.stringify(body) }),
    patch: (path: string, body: unknown) =>
      fetch(`${url}/rest/v1/${path}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(body) }),
    del: (path: string) => fetch(`${url}/rest/v1/${path}`, { method: 'DELETE', headers: { ...headers, Prefer: 'return=representation' } }),
    rpc: (fn: string, args: unknown) => fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(args) }),
  }
}

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })

test.describe('database access by account type', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'desktop', 'API checks run once')
  })

  test('anonymous (public key only): every table and function is refused', async () => {
    const anon = rest(null)
    for (const table of ['records', 'expenses', 'app_members', 'customers', 'customer_phones', 'customer_vehicles']) {
      const r = await anon.get(`${table}?select=*&limit=1`)
      expect(r.status, `${table} read`).toBeGreaterThanOrEqual(400)
      expect((await r.json()).code, `${table} read`).toBe('42501')
    }
    const insert = await anon.post('records', { type: 'wash', plate: 'ANON', price: 1, payment_status: 'paid', job_status: 'done' })
    expect(insert.status).toBeGreaterThanOrEqual(400)
    for (const [fn, args] of [
      ['dashboard_today', { p_day: today }],
      ['daily_series', { p_from: today, p_to: today }],
      ['customer_breakdown', { p_day: today }],
      ['settle_records', { p_ids: [] }],
      ['save_customer', { p_id: null, p_expected_updated_at: null, p_name: 'ANON', p_note: null, p_phones: [], p_vehicles: [] }],
    ] as const) {
      const r = await anon.rpc(fn, args)
      expect(r.status, fn).toBeGreaterThanOrEqual(400)
    }
  })

  test('signed-up but not a shop member: sees nothing and changes nothing (cross-user isolation)', async () => {
    const member = rest(await tokenFor(E2E_EMAIL, E2E_PASSWORD))
    const outsider = rest(await tokenFor(OUTSIDER_EMAIL, OUTSIDER_PASSWORD))

    // The member can see shop data (the seed has over a thousand records)…
    // A seed record ("ทดสอบ …"): other tests running alongside never touch those
    const memberRows = (await (await member.get(`records?select=id,price&plate=like.${encodeURIComponent('ทดสอบ*')}&order=created_at.desc&limit=5`)).json()) as Array<{ id: string; price: number }>
    expect(memberRows.length).toBe(5)
    const target = memberRows[0]

    // …the outsider gets empty results, not an error that would reveal anything
    for (const table of ['records', 'expenses', 'app_members', 'customers', 'customer_phones', 'customer_vehicles']) {
      const r = await outsider.get(`${table}?select=*&limit=5`)
      expect(r.status, table).toBe(200)
      expect(await r.json(), table).toEqual([])
    }
    expect(await (await outsider.get(`records?id=eq.${target.id}`)).json()).toEqual([])

    // Writes: insert refused by RLS; update / delete of a shop row affect nothing
    const insert = await outsider.post('records', { type: 'wash', plate: 'OUTSIDER', price: 1, payment_status: 'paid', job_status: 'done' })
    expect(insert.status).toBe(403)
    expect((await insert.json()).code).toBe('42501')
    expect(await (await outsider.patch(`records?id=eq.${target.id}`, { price: 99999 })).json()).toEqual([])
    expect(await (await outsider.del(`records?id=eq.${target.id}`)).json()).toEqual([])
    const expenseInsert = await outsider.post('expenses', { title: 'OUTSIDER', amount: 1 })
    expect(expenseInsert.status).toBe(403)

    // Functions run with the caller's rights: no totals, nothing settled
    const totals = (await (await outsider.rpc('dashboard_today', { p_day: today })).json()) as Array<Record<string, number>>
    expect(totals.every((row) => Object.values(row).every((v) => Number(v) === 0))).toBe(true)
    const series = (await (await outsider.rpc('daily_series', { p_from: '2020-01-01', p_to: today })).json()) as Array<{ income: number; expense: number }>
    expect(series.every((d) => Number(d.income) === 0 && Number(d.expense) === 0)).toBe(true)
    expect(await (await outsider.rpc('customer_breakdown', { p_day: today })).json()).toEqual([])
    const settled = (await (await outsider.rpc('settle_records', { p_ids: [target.id] })).json()) as Array<{ updated_count: number }>
    expect(Number(settled[0].updated_count)).toBe(0)

    // …and cannot add a customer, phone or vehicle (customer directory, AC-15-1)
    const customer = await outsider.rpc('save_customer', { p_id: null, p_expected_updated_at: null, p_name: 'OUTSIDER', p_note: null, p_phones: [], p_vehicles: [] })
    expect(customer.status, 'save_customer').toBeGreaterThanOrEqual(400)
    expect((await outsider.post('customers', { name: 'OUTSIDER' })).status).toBe(403)

    // The outsider cannot make itself a member
    const join = await outsider.post('app_members', { user_id: '00000000-0000-0000-0000-000000000000' })
    expect(join.status).toBeGreaterThanOrEqual(400)

    // Nothing the outsider tried changed the row
    const after = (await (await member.get(`records?id=eq.${target.id}&select=price`)).json()) as Array<{ price: number }>
    expect(after).toEqual([{ price: target.price }])
  })

  test('a member cannot bypass the form rules or fake who saved a record', async () => {
    const member = rest(await tokenFor(E2E_EMAIL, E2E_PASSWORD))
    // Database rules hold even when the app is skipped (M008)
    for (const bad of [
      { type: 'wash', plate: 'BAD', price: -1, payment_status: 'paid', job_status: 'done' },
      { type: 'wash', plate: '   ', price: 1, payment_status: 'paid', job_status: 'done' },
      { type: 'wash', plate: 'X'.repeat(21), price: 1, payment_status: 'paid', job_status: 'done' },
    ]) {
      const r = await member.post('records', bad)
      expect(r.status, JSON.stringify(bad)).toBe(400)
      expect((await r.json()).code).toBe('23514')
    }
    expect((await member.post('expenses', { title: 'x', amount: 0 })).status).toBe(400)

    // Audit fields come from the session, not from what the client sends (M005)
    const saved = (await (
      await member.post('records', {
        type: 'wash',
        plate: `AUDIT${Date.now() % 100000}`,
        price: 1,
        payment_status: 'paid',
        job_status: 'done',
        created_by_email: 'someone-else@example.com',
        seq_number: 999,
      })
    ).json()) as Array<{ id: string; created_by_email: string; seq_number: number }>
    expect(saved[0].created_by_email).toBe(E2E_EMAIL)
    expect(saved[0].seq_number).not.toBe(999)
    expect((await member.del(`records?id=eq.${saved[0].id}`)).status).toBe(200)
  })

  test('the error-report endpoint refuses callers that are not signed in', async ({ request }) => {
    const r = await request.post('/api/client-errors', {
      headers: { origin: 'http://127.0.0.1:3100' },
      data: { code: 'UNKNOWN', ref: 'ABCDEFGH', route: '/', message: 'x', appVersion: '2', at: new Date().toISOString() },
    })
    expect(r.status()).toBe(401)
    const cross = await request.post('/api/client-errors', { headers: { origin: 'https://evil.example' }, data: {} })
    expect(cross.status()).toBe(403)
  })

  test('security headers are sent on every page', async ({ request }) => {
    const r = await request.get('/login')
    const h = r.headers()
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(h['content-security-policy']).toContain("default-src 'self'")
    expect(h['content-security-policy']).not.toContain('unsafe-eval') // D-05
    expect(h['x-frame-options']).toBe('SAMEORIGIN')
    expect(h['x-content-type-options']).toBe('nosniff')
    expect(h['strict-transport-security']).toContain('max-age=')
    expect(h['referrer-policy']).toBe('origin-when-cross-origin')
    expect(h['x-powered-by']).toBeUndefined()
  })
})

test('nothing in the app is blocked by the content security policy (D-05)', async ({ page }, info) => {
  // Collect every CSP violation the browser reports, from the first script on
  await page.addInitScript(() => {
    const seen: string[] = []
    ;(window as unknown as { cspViolations: string[] }).cspViolations = seen
    document.addEventListener('securitypolicyviolation', (e) => seen.push(`${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`))
  })
  const blocked: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' && /content security policy/i.test(m.text())) blocked.push(m.text())
  })
  const violations = () => page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)

  await signIn(page)
  const all: string[] = [...(await violations())]
  // Every screen, plus the parts that load heavier code: validation, the edit dialog,
  // Excel export (exceljs) and the PDF bill (jspdf)
  for (const path of ['/', '/add', '/add?type=expense', '/debts', '/customers', '/customers?new=1', '/more']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    all.push(...(await violations()))
  }
  await page.goto('/add')
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click() // empty form: validation runs
  await expect(page.getByRole('alert').first()).toBeVisible()
  all.push(...(await violations()))
  await page.goto(`/history?m=0&q=${encodeURIComponent('ทดสอบ')}`)
  await page.getByRole('button', { name: /แตะเพื่อแก้ไข|^แก้ไข / }).first().click()
  await expect(page.getByRole('dialog', { name: /แก้ไขราย/ })).toBeVisible()
  all.push(...(await violations()))
  await page.goto('/history?export=1')
  const excel = page.waitForEvent('download')
  await page.getByRole('dialog', { name: 'ส่งออก Excel' }).getByRole('button', { name: 'ดาวน์โหลด Excel' }).click()
  await excel
  all.push(...(await violations()))
  await page.goto('/debts')
  const bill = page.getByRole('button', { name: /^สร้างบิล / }).first()
  if (await bill.count()) {
    const pdf = page.waitForEvent('download')
    await bill.click()
    await pdf
  } else {
    info.annotations.push({ type: 'note', description: 'no unpaid customer to bill in this run' })
  }
  all.push(...(await violations()))
  expect([...new Set(all)], 'CSP violations').toEqual([])
  expect(blocked, 'CSP errors in the console').toEqual([])
})

test('signing in before the JavaScript has loaded never puts the password in the address (D-07)', async ({ page }) => {
  // Hold the scripts: the page stays exactly as the server sent it
  let release!: () => void
  const held = new Promise<void>((r) => (release = r))
  await page.route(/\/_next\/static\/chunks\/.*\.js/, async (route) => {
    await held
    await route.continue().catch(() => {})
  })
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('อีเมล', { exact: true }).fill(E2E_EMAIL)
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill('typed-before-ready')
  await expect(page.locator('form')).toHaveAttribute('method', 'post')
  await expect(page.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeDisabled()
  await page.getByLabel('รหัสผ่าน', { exact: true }).press('Enter')
  await page.waitForTimeout(500)
  expect(page.url()).not.toContain('password')
  expect(new URL(page.url()).pathname).toBe('/login')
  // When the JavaScript arrives, what was typed is still there and the button works
  release()
  await expect(page.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeEnabled()
  await expect(page.getByLabel('อีเมล', { exact: true })).toHaveValue(E2E_EMAIL)
  await expect(page.getByLabel('รหัสผ่าน', { exact: true })).toHaveValue('typed-before-ready')
})

test('the record form cannot be submitted by the browser before the JavaScript has loaded (D-07)', async ({ page }) => {
  await signIn(page)
  let release!: () => void
  const held = new Promise<void>((r) => (release = r))
  await page.route(/\/_next\/static\/chunks\/.*\.js/, async (route) => {
    await held
    await route.continue().catch(() => {})
  })
  await page.goto('/add', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('form')).toHaveAttribute('method', 'post')
  await expect(page.getByRole('button', { name: 'บันทึก', exact: true })).toBeDisabled()
  release()
  await expect(page.getByRole('button', { name: 'บันทึก', exact: true })).toBeEnabled()
})

test.describe('sign-in rules in the app', () => {
  test('every protected page sends a signed-out visitor to login and remembers where', async ({ page }) => {
    for (const path of ['/', '/add', '/history', '/debts', '/customers', '/more']) {
      await page.goto(path)
      await expect(page, path).toHaveURL(path === '/' ? /\/login$/ : new RegExp(`/login\\?next=${encodeURIComponent(path)}$`))
    }
  })

  test('a "next" link to another site is ignored after sign-in (open redirect)', async ({ page }) => {
    await page.goto('/login?next=https%3A%2F%2Fevil.example%2F')
    await page.getByLabel('อีเมล', { exact: true }).fill(E2E_EMAIL)
    await page.getByLabel('รหัสผ่าน', { exact: true }).fill(E2E_PASSWORD)
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
    await page.waitForURL((u) => u.origin === 'http://127.0.0.1:3100' && u.pathname === '/')
  })

  test('a signed-in non-member sees no shop data anywhere in the app', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('อีเมล', { exact: true }).fill(OUTSIDER_EMAIL)
    await page.getByLabel('รหัสผ่าน', { exact: true }).fill(OUTSIDER_PASSWORD)
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
    await page.waitForURL((u) => u.pathname === '/')
    await expect(page.getByText('ยังไม่มีงานวันนี้')).toBeVisible()
    await expect(page.getByRole('link', { name: /ค้างชำระ.*฿/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /ค้างชำระ.*ไม่มียอดค้าง/ })).toBeVisible()
    await page.goto('/debts')
    await expect(page.getByText('ไม่มีรายการค้างชำระ')).toBeVisible()
    await page.goto('/history?m=0')
    await expect(page.getByText(/ไม่มีรายรับใน/)).toBeVisible()
    await page.goto('/customers')
    await expect(page.getByText('ยังไม่มีลูกค้า')).toBeVisible()
  })

  test('a member who signs in again lands on the dashboard', async ({ page }) => {
    await signIn(page)
    await expect(page.getByRole('heading', { level: 1, name: 'ภาพรวมวันนี้' })).toBeVisible()
  })
})
