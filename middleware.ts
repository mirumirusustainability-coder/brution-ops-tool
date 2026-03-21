import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const middleware = async (request: NextRequest) => {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => {
          response.cookies.set({ name, value, ...options })
        },
        remove: (name, options) => {
          response.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (pathname.startsWith('/app') || pathname === '/force-password-change') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return response
  }

  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await admin
    .from('profiles')
    .select('must_change_password, status')
    .eq('user_id', user.id)
    .single()

  if (profile?.must_change_password && pathname !== '/force-password-change') {
    const url = request.nextUrl.clone()
    url.pathname = '/force-password-change'
    return NextResponse.redirect(url)
  }

  if (pathname === '/force-password-change' && !profile?.must_change_password) {
    const url = request.nextUrl.clone()
    url.pathname = '/app/projects'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/app/:path*', '/force-password-change']
}
