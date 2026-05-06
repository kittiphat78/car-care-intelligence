import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // กำหนด Route ที่ต้องการป้องกัน (รวมหน้า / ซึ่งก็คือ Dashboard ปัจจุบัน)
  const protectedRoutes = ['/', '/dashboard', '/history', '/finance', '/export', '/add']
  
  // เช็คว่า path ปัจจุบันอยู่ในรายการที่ต้องป้องกันหรือไม่
  const isProtectedRoute = protectedRoutes.some(route => {
    if (route === '/') return path === '/'
    return path.startsWith(route)
  })

  // ถ้ายังไม่ได้ login และพยายามเข้าหน้า Protected Route → redirect ไป /login
  if (!user && isProtectedRoute) {
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