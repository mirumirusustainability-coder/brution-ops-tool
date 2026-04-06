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
  { params }: { params: Promise<{ id: string; userId: string }> }
) => {
  try {
    const profile = await getProfile()
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const { id, userId } = await params
    const body = await request.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name : undefined
    const phone = typeof body?.phone === 'string' ? body.phone : undefined
    const job_title = typeof body?.job_title === 'string' ? body.job_title : undefined
    const role = typeof body?.role === 'string' ? body.role : undefined
    const avatar_url =
      typeof body?.avatar_url === 'string' || body?.avatar_url === null ? body.avatar_url : undefined
    const business_card_url =
      typeof body?.business_card_url === 'string' || body?.business_card_url === null
        ? body.business_card_url
        : undefined

    if (!name && !phone && !job_title && !role && !avatar_url && !business_card_url) {
      return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
    }

    if (role && role !== 'client_admin' && role !== 'client_member') {
      return NextResponse.json({ error: 'INVALID_ROLE' }, { status: 400 })
    }

    const admin = createSupabaseAdmin()
    const updatePayload: Record<string, any> = {}
    if (name !== undefined) updatePayload.name = name
    if (phone !== undefined) updatePayload.phone = phone
    if (job_title !== undefined) updatePayload.job_title = job_title
    if (role !== undefined) updatePayload.role = role
    if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url
    if (business_card_url !== undefined) updatePayload.business_card_url = business_card_url

    const { data: updated, error: updateError } = await admin
      .from('profiles')
      .update(updatePayload)
      .eq('user_id', userId)
      .eq('company_id', id)
      .select('user_id, email, name, role, phone, job_title, avatar_url, business_card_url, company_id, status, must_change_password, created_at, updated_at')
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

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) => {
  try {
    const profile = await getProfile()
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const { id, userId } = await params
    const body = await request.json().catch(() => null)
    const business_card_url =
      typeof body?.business_card_url === 'string' || body?.business_card_url === null
        ? body.business_card_url
        : undefined

    if (business_card_url === undefined) {
      return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
    }

    const admin = createSupabaseAdmin()
    const { data: updated, error: updateError } = await admin
      .from('profiles')
      .update({ business_card_url })
      .eq('user_id', userId)
      .eq('company_id', id)
      .select('user_id, email, name, role, phone, job_title, avatar_url, business_card_url, company_id, status, must_change_password, created_at, updated_at')
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
  { params }: { params: Promise<{ id: string; userId: string }> }
) => {
  try {
    const profile = await getProfile()
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const { id, userId } = await params
    const admin = createSupabaseAdmin()

    const { data: targetProfile, error: targetError } = await admin
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .eq('company_id', id)
      .single()

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
    }

    const { error: profileDeleteError } = await admin
      .from('profiles')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', id)

    if (profileDeleteError) {
      return NextResponse.json({ error: 'PROFILE_DELETE_FAILED' }, { status: 500 })
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId)
    if (authDeleteError) {
      return NextResponse.json({ error: 'AUTH_DELETE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
