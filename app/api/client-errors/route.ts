import { createHash } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/serverAuth'
import { APP_ERROR_CODES, ERROR_REF_PATTERN } from '@/lib/errors'
import { MAX_REPORT_BYTES } from '@/lib/observability'

const reportSchema = z.strictObject({
  code: z.enum(APP_ERROR_CODES),
  ref: z.string().regex(ERROR_REF_PATTERN),
  route: z.string().max(100),
  message: z.string().max(300),
  appVersion: z.string().max(40),
  userAgent: z.string().max(200).optional(),
  at: z.iso.datetime(),
})

const empty = (status: number) => new NextResponse(null, { status })

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return request.headers.get('sec-fetch-site') !== 'cross-site'
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/** Receives client error reports (lib/observability.ts) and writes them to the runtime log. */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return empty(403)

  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_REPORT_BYTES) return empty(413)

  const auth = await authenticateRequest()
  if (auth.error) return auth.error

  const text = await request.text()
  if (Buffer.byteLength(text) > MAX_REPORT_BYTES) return empty(413)

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return empty(400)
  }
  const parsed = reportSchema.safeParse(json)
  if (!parsed.success) return empty(400)

  // Hash the user id so logs can group one person's errors without identifying them
  const userIdHash = createHash('sha256').update(auth.user.id).digest('hex').slice(0, 16)
  console.log(JSON.stringify({ level: 'error', source: 'client', userIdHash, ...parsed.data }))

  return empty(204)
}
