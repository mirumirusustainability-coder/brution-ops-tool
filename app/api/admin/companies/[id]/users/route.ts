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

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  let result = ''
  for (let i = 0; i < 8; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export const GET = async (
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
    const { data, error } = await admin
      .from('profiles')
      .select('user_id, email, name, role, company_id, status, must_change_password, created_at, updated_at')
      .eq('company_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'USERS_FETCH_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ users: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export const POST = async (
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
    const email = body?.email
    const name = body?.name
    const role = body?.role ?? 'client_admin'

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 })
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 })
    }

    if (role !== 'client_admin' && role !== 'client_user') {
      return NextResponse.json({ error: 'INVALID_ROLE' }, { status: 400 })
    }

    const admin = createSupabaseAdmin()

    const { count, error: countError } = await admin
      .from('profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('company_id', id)
      .eq('status', 'active')

    if (countError) {
      return NextResponse.json({ error: 'USERS_COUNT_FAILED' }, { status: 500 })
    }

    if ((count ?? 0) >= 5) {
      return NextResponse.json({ error: 'SEAT_LIMIT_REACHED' }, { status: 400 })
    }

    const tempPassword = generateTempPassword()
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })

    if (createError || !createdUser?.user) {
      console.error('상세 오류:', JSON.stringify(createError))

      let errorMessage = '사용자 생성에 실패했습니다'
      if (createError?.code === 'email_exists') {
        errorMessage = '이미 등록된 이메일입니다'
      } else if (createError?.code === 'invalid_email') {
        errorMessage = '올바르지 않은 이메일 형식입니다'
      } else if (createError?.code === 'weak_password') {
        errorMessage = '비밀번호가 너무 약합니다'
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 422 }
      )
    }

    const { error: profileError, data: profileData } = await admin
      .from('profiles')
      .insert({
        user_id: createdUser.user.id,
        email,
        name,
        role,
        company_id: id,
        status: 'active',
        must_change_password: true,
      })
      .select('user_id, email, name, role, company_id, status, must_change_password, created_at, updated_at')
      .single()

    if (profileError || !profileData) {
      console.error('상세 오류:', JSON.stringify(profileError))
      return NextResponse.json(
        { error: profileError?.message ?? 'PROFILE_CREATE_FAILED', details: JSON.stringify(profileError) },
        { status: 500 }
      )
    }

    return NextResponse.json({ user: profileData, tempPassword }, { status: 201 })
  } catch (error) {
    console.error('상세 오류:', JSON.stringify(error))
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json(
      { error: message, details: JSON.stringify(error) },
      { status }
    )
  }
}
