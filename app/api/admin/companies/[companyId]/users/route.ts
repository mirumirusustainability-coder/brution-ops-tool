import { NextResponse } from 'next/server'

import { isStaffAdmin, requireAuth } from '@/lib/supabase/auth'
import { createSupabaseAdmin } from '@/lib/supabase/server'

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  let result = ''
  for (let i = 0; i < 8; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) => {
  try {
    const { profile } = await requireAuth(request)
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const { companyId } = await params
    const admin = createSupabaseAdmin()
    const { data, error } = await admin
      .from('profiles')
      .select('user_id, email, name, role, company_id, status, must_change_password, created_at, updated_at')
      .eq('company_id', companyId)
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
  { params }: { params: Promise<{ companyId: string }> }
) => {
  try {
    const { profile } = await requireAuth(request)
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const { companyId } = await params
    const body = await request.json().catch(() => null)
    const email = body?.email
    const name = body?.name
    const role = body?.role

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 })
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 })
    }

    if (role !== 'client_admin' && role !== 'client_member') {
      return NextResponse.json({ error: 'INVALID_ROLE' }, { status: 400 })
    }

    const admin = createSupabaseAdmin()

    const { count, error: countError } = await admin
      .from('profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('company_id', companyId)
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
      return NextResponse.json({ error: 'AUTH_CREATE_FAILED' }, { status: 500 })
    }

    const { error: profileError, data: profileData } = await admin
      .from('profiles')
      .insert({
        user_id: createdUser.user.id,
        email,
        name,
        role,
        company_id: companyId,
        status: 'active',
        must_change_password: true,
      })
      .select('user_id, email, name, role, company_id, status, must_change_password, created_at, updated_at')
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
