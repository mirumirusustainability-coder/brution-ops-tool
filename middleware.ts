import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const middleware = async (request: NextRequest) => {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const cookie = request.headers.get('cookie') ?? ''

  try {
    const response = await fetch(new URL('/api/auth/me', request.url), {
      headers: {
        cookie,
        authorization: authHeader
      }
    })

    if (!response.ok) {
      return NextResponse.next()
    }

    const data = await response.json()
    if (data?.must_change_password) {
      if (pathname !== '/force-password-change') {
        const url = request.nextUrl.clone()
        url.pathname = '/force-password-change'
        return NextResponse.redirect(url)
      }
    } else if (pathname === '/force-password-change') {
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
