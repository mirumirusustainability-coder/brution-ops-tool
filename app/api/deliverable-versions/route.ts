import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { isStaff } from '@/lib/supabase/auth'
import { createSupabaseAdmin } from '@/lib/supabase/server'

const getProfile = async () => {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {}
        },
        remove: (name, options) => {
          try {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 })
          } catch {}
        },
      },
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('UNAUTHORIZED')
  }

  const admin = createSupabaseAdmin()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('user_id, email, name, role, company_id, status, must_change_password')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('UNAUTHORIZED')
  }

  if (profile.status !== 'active') {
    throw new Error('INACTIVE')
  }

  return profile
}

export const GET = async (request: Request) => {
  try {
    const profile = await getProfile()
    const { searchParams } = new URL(request.url)
    const deliverableId = searchParams.get('deliverableId')

    if (!deliverableId) {
      return NextResponse.json({ error: 'INVALID_DELIVERABLE_ID' }, { status: 400 })
    }

    const admin = createSupabaseAdmin()

    if (!isStaff(profile.role)) {
      if (!profile.company_id) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }

      const { data: deliverable, error: deliverableError } = await admin
        .from('deliverables')
        .select('id, company_id, visibility')
        .eq('id', deliverableId)
        .single()

      if (deliverableError || !deliverable) {
        return NextResponse.json({ error: 'DELIVERABLE_NOT_FOUND' }, { status: 404 })
      }

      if (deliverable.company_id !== profile.company_id) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }

      if (deliverable.visibility !== 'client') {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    }

    const { data, error } = await admin
      .from('deliverable_versions')
      .select(
        'id, deliverable_id, company_id, version_no, status, title, created_by, created_at, updated_at'
      )
      .eq('deliverable_id', deliverableId)
      .order('version_no', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'DELIVERABLE_VERSIONS_FETCH_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ versions: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
