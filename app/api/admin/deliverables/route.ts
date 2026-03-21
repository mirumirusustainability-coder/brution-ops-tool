import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { isStaffAdmin } from '@/lib/supabase/auth'
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

export const POST = async (request: Request) => {
  try {
    const profile = await getProfile()
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const title = body?.title
    const type = body?.type
    const visibility = body?.visibility
    const projectId = body?.projectId
    const companyId = body?.companyId

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'INVALID_TITLE' }, { status: 400 })
    }

    if (!type || typeof type !== 'string') {
      return NextResponse.json({ error: 'INVALID_TYPE' }, { status: 400 })
    }

    if (!visibility || typeof visibility !== 'string') {
      return NextResponse.json({ error: 'INVALID_VISIBILITY' }, { status: 400 })
    }

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'INVALID_PROJECT' }, { status: 400 })
    }

    if (!companyId || typeof companyId !== 'string') {
      return NextResponse.json({ error: 'INVALID_COMPANY' }, { status: 400 })
    }

    const admin = createSupabaseAdmin()
    const deliverableId = crypto.randomUUID()
    const { data, error } = await admin
      .from('deliverables')
      .insert({
        id: deliverableId,
        project_id: projectId,
        company_id: companyId,
        type,
        visibility,
        title,
        created_by: profile.user_id,
      })
      .select('id, project_id, company_id, type, visibility, title, created_by, created_at, updated_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'DELIVERABLE_CREATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ deliverable: data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
