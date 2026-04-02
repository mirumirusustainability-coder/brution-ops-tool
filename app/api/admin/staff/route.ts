import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { isStaffAdmin } from '@/lib/supabase/auth'
import { createSupabaseAdmin } from '@/lib/supabase/server'

const BRUTION_COMPANY_ID = '00000000-0000-0000-0000-000000000001'

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

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < 8; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export const GET = async () => {
  try {
    const profile = await getProfile()
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const admin = createSupabaseAdmin()
    const { data, error } = await admin
      .from('profiles')
      .select('user_id, email, name, phone, job_title, role, status')
      .eq('company_id', BRUTION_COMPANY_ID)
      .in('role', ['staff_admin', 'staff_member'])
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'STAFF_FETCH_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ staff: data ?? [] })
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
    const email = body?.email
    const name = body?.name
    const phone = typeof body?.phone === 'string' ? body.phone : null
    const job_title = typeof body?.job_title === 'string' ? body.job_title : null
    const role = body?.role

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 })
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 })
    }

    if (role !== 'staff_admin' && role !== 'staff_member') {
      return NextResponse.json({ error: 'INVALID_ROLE' }, { status: 400 })
    }

    const admin = createSupabaseAdmin()
    const { count, error: countError } = await admin
      .from('profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('company_id', BRUTION_COMPANY_ID)
      .in('role', ['staff_admin', 'staff_member'])

    if (countError) {
      return NextResponse.json({ error: 'STAFF_COUNT_FAILED' }, { status: 500 })
    }

    if ((count ?? 0) >= 20) {
      return NextResponse.json({ error: 'STAFF_LIMIT_REACHED' }, { status: 400 })
    }

    const tempPassword = generateTempPassword()
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })

    if (createError || !createdUser?.user) {
      return NextResponse.json({ error: 'USER_CREATE_FAILED' }, { status: 422 })
    }

    const { error: profileError, data: profileData } = await admin
      .from('profiles')
      .insert({
        user_id: createdUser.user.id,
        email,
        name,
        phone: phone ?? null,
        job_title: job_title ?? null,
        role,
        company_id: BRUTION_COMPANY_ID,
        status: 'active',
        must_change_password: true,
      })
      .select('user_id, email, name, phone, job_title, role, status')
      .single()

    if (profileError || !profileData) {
      return NextResponse.json({ error: 'PROFILE_CREATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ user: profileData, tempPassword }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
