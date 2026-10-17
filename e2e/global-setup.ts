// Creates the shop member the tests sign in as, on the LOCAL Supabase only.
// Refuses to run against anything that is not localhost, so it can never touch staging
// or production even if the variables are set wrongly.

export const E2E_EMAIL = 'e2e-member@example.com'
export const E2E_PASSWORD = 'e2e-password-123'

export default async function globalSetup() {
  const url = process.env.E2E_SUPABASE_URL
  const serviceKey = process.env.E2E_SERVICE_ROLE_KEY
  if (!url || !serviceKey || !process.env.E2E_ANON_KEY) {
    throw new Error('Set E2E_SUPABASE_URL, E2E_ANON_KEY and E2E_SERVICE_ROLE_KEY (from `supabase status -o env`)')
  }
  const host = new URL(url).hostname
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(`E2E tests only run against a local Supabase, not ${host}`)
  }

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

  // Create the account (or find it if an earlier run created it)
  let userId: string | undefined
  const created = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: E2E_EMAIL, password: E2E_PASSWORD, email_confirm: true }),
  })
  if (created.ok) {
    userId = ((await created.json()) as { id: string }).id
  } else {
    const list = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers })
    const body = (await list.json()) as { users: Array<{ id: string; email: string }> }
    userId = body.users.find((u) => u.email === E2E_EMAIL)?.id
  }
  if (!userId) throw new Error(`Could not create or find ${E2E_EMAIL}`)

  // Make it a shop member (RLS lets members only see shop data, ADR-04)
  const member = await fetch(`${url}/rest/v1/app_members`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({ user_id: userId }),
  })
  if (!member.ok && member.status !== 409) throw new Error(`app_members insert failed: ${member.status} ${await member.text()}`)
}
