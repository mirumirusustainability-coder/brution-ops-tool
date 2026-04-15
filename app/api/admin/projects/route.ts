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

export const GET = async () => {
  try {
    const profile = await getProfile()
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const admin = createSupabaseAdmin()
    const { data, error } = await admin
      .from('projects')
      .select('id, name, description, created_at, company_id, step, status, metadata, companies(id, name, metadata), deliverables(deliverable_versions(status))')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'PROJECTS_FETCH_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ projects: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export const POST = async (request: Request) => {
  try {
    const profile = await getProfile()
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const name = body?.name
    const description = body?.description ?? null
    const companyId = body?.companyId
    const stepInput = body?.step

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 })
    }

    if (!companyId || typeof companyId !== 'string') {
      return NextResponse.json({ error: 'INVALID_COMPANY' }, { status: 400 })
    }

    const step = typeof stepInput === 'number' && stepInput >= 0 && stepInput <= 4 ? stepInput : 0

    const admin = createSupabaseAdmin()
    const { data, error } = await admin
      .from('projects')
      .insert({
        name,
        description,
        company_id: companyId,
        step,
        created_by: profile.user_id,
      })
      .select('id, name, description, created_at, company_id, step, status')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'PROJECT_CREATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ project: data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
