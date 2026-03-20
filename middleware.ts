import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const middleware = async (request: NextRequest) => {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const accessToken = request.cookies.get('sb-access-token')?.value
    ?? request.cookies.get(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`)?.value

  if (!accessToken) {
    if (pathname.startsWith('/app') || pathname === '/force-password-change') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error } = await supabase.auth.getUser(accessToken)

    if (error || !user) {
      if (pathname.startsWith('/app') || pathname === '/force-password-change') {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }
      return NextResponse.next()
    }

    const { data: profile } = await supabase
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

  } catch {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/app/:path*', '/force-password-change']
}
