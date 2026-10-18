// Creates the accounts the tests sign in as, on the LOCAL Supabase only.
// Refuses to run against anything that is not localhost, so it can never touch staging
// or production even if the variables are set wrongly.
//
//   member    a shop member (in app_members): sees and changes shop data
//   outsider  signed up but NOT a member: must see and change nothing (ADR-04)
//   logout    a second member, only for the sign-out journey

export const E2E_EMAIL = 'e2e-member@example.com'
export const E2E_PASSWORD = 'e2e-password-123'
export const OUTSIDER_EMAIL = 'e2e-outsider@example.com'
export const OUTSIDER_PASSWORD = 'e2e-outsider-123'
// Signs out in CUJ-8 and logout.spec. Sign-out ends only that device's session (D-03),
// but a separate account keeps the sign-out tests from touching anyone else's data.
export const LOGOUT_EMAIL = 'e2e-logout@example.com'
export const LOGOUT_PASSWORD = 'e2e-logout-123'

type Headers = Record<string, string>

async function ensureUser(url: string, headers: Headers, email: string, password: string): Promise<string> {
  const created = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  if (created.ok) return ((await created.json()) as { id: string }).id
  // Created by an earlier run
  const list = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers })
  const body = (await list.json()) as { users: Array<{ id: string; email: string }> }
  const id = body.users.find((u) => u.email === email)?.id
  if (!id) throw new Error(`Could not create or find ${email}`)
  return id
}

export function localSupabase() {
  const url = process.env.E2E_SUPABASE_URL
  const anonKey = process.env.E2E_ANON_KEY
  const serviceKey = process.env.E2E_SERVICE_ROLE_KEY
  if (!url || !serviceKey || !anonKey) {
    throw new Error('Set E2E_SUPABASE_URL, E2E_ANON_KEY and E2E_SERVICE_ROLE_KEY (from `supabase status -o env`)')
  }
  const host = new URL(url).hostname
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(`E2E tests only run against a local Supabase, not ${host}`)
  }
  return { url, anonKey, serviceKey }
}

export default async function globalSetup() {
  const { url, serviceKey } = localSupabase()
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

  const memberIds = [await ensureUser(url, headers, E2E_EMAIL, E2E_PASSWORD), await ensureUser(url, headers, LOGOUT_EMAIL, LOGOUT_PASSWORD)]
  await ensureUser(url, headers, OUTSIDER_EMAIL, OUTSIDER_PASSWORD)

  // Only members join the shop (RLS lets members only see shop data, ADR-04)
  const member = await fetch(`${url}/rest/v1/app_members`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify(memberIds.map((user_id) => ({ user_id }))),
  })
  if (!member.ok && member.status !== 409) throw new Error(`app_members insert failed: ${member.status} ${await member.text()}`)
}
