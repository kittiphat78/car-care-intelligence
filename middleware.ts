import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Single source of truth — เฉพาะ routes ที่มี page จริง
const PROTECTED_ROUTES = ['/', '/history', '/add']

const isProtectedPath = (path: string) =>
  PROTECTED_ROUTES.some(route =>
    route === '/' ? path === '/' : path.startsWith(route)
  )

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ [Middleware] Missing Supabase environment variables. Please check your .env file.')
    const path = request.nextUrl.pathname

    if (isProtectedPath(path)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isLoginPage = path.startsWith('/login')

  // ถ้ายังไม่ได้ login และพยายามเข้าหน้า Protected Route → redirect ไป /login
  if (!user && isProtectedPath(path)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ถ้า login อยู่แล้ว แต่ตั้งใจจะเข้า /login → redirect ไปหน้าหลัก
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}