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

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const profile = await getProfile()
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json().catch(() => null)
    const role = body?.role
    const status = body?.status
    const name = typeof body?.name === 'string' ? body.name : undefined
    const phone = typeof body?.phone === 'string' ? body.phone : undefined
    const job_title = typeof body?.job_title === 'string' ? body.job_title : undefined

    if (!role && !status && !name && !phone && !job_title) {
      return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
    }

    if (role && role !== 'staff_admin' && role !== 'staff_member') {
      return NextResponse.json({ error: 'INVALID_ROLE' }, { status: 400 })
    }

    if (status && status !== 'active' && status !== 'inactive') {
      return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 400 })
    }

    const admin = createSupabaseAdmin()
    const updatePayload: Record<string, any> = {}
    if (role) updatePayload.role = role
    if (status) updatePayload.status = status
    if (name !== undefined) updatePayload.name = name
    if (phone !== undefined) updatePayload.phone = phone
    if (job_title !== undefined) updatePayload.job_title = job_title

    const { data: updated, error: updateError } = await admin
      .from('profiles')
      .update(updatePayload)
      .eq('user_id', id)
      .select('user_id, email, name, phone, job_title, role, status')
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'PROFILE_UPDATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ user: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export const DELETE = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const profile = await getProfile()
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const { id } = await params
    const admin = createSupabaseAdmin()

    const { error: authError } = await admin.auth.admin.deleteUser(id)
    if (authError) {
      return NextResponse.json({ error: 'AUTH_DELETE_FAILED' }, { status: 500 })
    }

    const { error: deleteError } = await admin
      .from('profiles')
      .delete()
      .eq('user_id', id)

    if (deleteError) {
      return NextResponse.json({ error: 'PROFILE_DELETE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
