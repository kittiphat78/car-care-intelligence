import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { APP_PATH_HEADER, LOGIN_PATH, NEXT_PARAM, isProtectedPath, loginPathFor, safeNextPath } from '@/lib/auth/redirect'

export async function proxy(request: NextRequest) {
  // Tell the (app) layout which page is being opened; it cannot read the URL itself.
  // Always overwritten here, so a value sent by the browser is never used.
  request.headers.set(APP_PATH_HEADER, request.nextUrl.pathname + request.nextUrl.search)

  let response = NextResponse.next({ request })

  // Redirect while keeping any session cookies refreshed during this request
  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url))
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie))
    return redirect
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ [Proxy] Missing Supabase environment variables. Please check your .env file.')
    return isProtectedPath(request.nextUrl.pathname) ? redirectTo(LOGIN_PATH) : response
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        // Cache headers from @supabase/ssr stop a CDN from caching a response that sets auth cookies
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isLoginPage = path.startsWith(LOGIN_PATH)

  // ถ้ายังไม่ได้ login และพยายามเข้าหน้า Protected Route → redirect ไป /login แล้วจำหน้าที่จะไปไว้ใน ?next=
  if (!user && isProtectedPath(path)) {
    return redirectTo(loginPathFor(path + request.nextUrl.search))
  }

  // ถ้า login อยู่แล้ว แต่ตั้งใจจะเข้า /login → ไปหน้าที่จำไว้ (หรือหน้าหลัก)
  if (user && isLoginPage) {
    return redirectTo(safeNextPath(request.nextUrl.searchParams.get(NEXT_PARAM)))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
