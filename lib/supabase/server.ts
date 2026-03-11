import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
}

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
}

export const createSupabaseAdmin = () => {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

export const createSupabaseUserClient = (accessToken: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  })
}

const parseCookieHeader = (cookieHeader: string | null) => {
  const cookies: Record<string, string> = {}
  if (!cookieHeader) return cookies
  cookieHeader.split(';').forEach((part) => {
    const [key, ...valueParts] = part.trim().split('=')
    if (!key) return
    cookies[key] = decodeURIComponent(valueParts.join('='))
  })
  return cookies
}

export const getAccessTokenFromRequest = (request: Request) => {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim()
  }

  const cookies = parseCookieHeader(request.headers.get('cookie'))

  if (cookies['sb-access-token']) {
    return cookies['sb-access-token']
  }

  if (cookies['supabase-auth-token']) {
    try {
      const parsed = JSON.parse(cookies['supabase-auth-token'])
      if (Array.isArray(parsed) && parsed[0]) {
        return parsed[0]
      }
    } catch (_) {
      return null
    }
  }

  const authCookie = Object.keys(cookies).find((key) => key.endsWith('-auth-token'))
  if (authCookie) {
    try {
      const parsed = JSON.parse(cookies[authCookie])
      if (Array.isArray(parsed) && parsed[0]) {
        return parsed[0]
      }
    } catch (_) {
      return null
    }
  }

  return null
}
