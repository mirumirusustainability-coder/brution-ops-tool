import { NextResponse } from 'next/server'

import { isStaffAdmin, requireAuth } from '@/lib/supabase/auth'
import { createSupabaseAdmin } from '@/lib/supabase/server'

export const GET = async (request: Request) => {
  try {
    const { profile } = await requireAuth(request)
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const admin = createSupabaseAdmin()
    const { data, error } = await admin
      .from('companies')
      .select('id, name, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'COMPANIES_FETCH_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ companies: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export const POST = async (request: Request) => {
  try {
    const { profile } = await requireAuth(request)
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const name = body?.name

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 })
    }

    const admin = createSupabaseAdmin()
    const { data, error } = await admin
      .from('companies')
      .insert({ name })
      .select('id, name, created_at, updated_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'COMPANY_CREATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ company: data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
