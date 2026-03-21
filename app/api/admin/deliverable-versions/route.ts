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
    const deliverableId = body?.deliverableId
    const companyId = body?.companyId

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'INVALID_TITLE' }, { status: 400 })
    }

    if (!deliverableId || typeof deliverableId !== 'string') {
      return NextResponse.json({ error: 'INVALID_DELIVERABLE' }, { status: 400 })
    }

    if (!companyId || typeof companyId !== 'string') {
      return NextResponse.json({ error: 'INVALID_COMPANY' }, { status: 400 })
    }

    const admin = createSupabaseAdmin()
    const { count, error: countError } = await admin
      .from('deliverable_versions')
      .select('id', { count: 'exact', head: true })
      .eq('deliverable_id', deliverableId)

    if (countError) {
      return NextResponse.json({ error: 'VERSION_COUNT_FAILED' }, { status: 500 })
    }

    const versionNo = (count ?? 0) + 1
    const versionId = crypto.randomUUID()

    const { data, error } = await admin
      .from('deliverable_versions')
      .insert({
        id: versionId,
        deliverable_id: deliverableId,
        company_id: companyId,
        version_no: versionNo,
        status: 'draft',
        title,
        created_by: profile.user_id,
      })
      .select('id, deliverable_id, company_id, version_no, status, title, created_by, created_at, updated_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'DELIVERABLE_VERSION_CREATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ version: data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
