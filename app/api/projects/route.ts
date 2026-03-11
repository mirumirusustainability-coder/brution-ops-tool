import { NextResponse } from 'next/server'

import { isStaff, requireAuth } from '@/lib/supabase/auth'
import { createSupabaseAdmin } from '@/lib/supabase/server'

export const GET = async (request: Request) => {
  try {
    const { profile } = await requireAuth(request)
    const admin = createSupabaseAdmin()

    let query = admin
      .from('projects')
      .select('id, company_id, name, description, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (!isStaff(profile.role)) {
      if (!profile.company_id) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
      query = query.eq('company_id', profile.company_id)
    }

    const { data, error } = await query

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
    const { profile } = await requireAuth(request)
    const admin = createSupabaseAdmin()
    const body = await request.json().catch(() => null)

    const name = body?.name
    const description = body?.description ?? null
    const staff = isStaff(profile.role)
    const companyId = staff ? body?.companyId : profile.company_id

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 })
    }

    if (!companyId || typeof companyId !== 'string') {
      return NextResponse.json({ error: 'INVALID_COMPANY' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('projects')
      .insert({
        name,
        description,
        company_id: companyId,
        created_by: profile.user_id
      })
      .select('id, company_id, name, description, created_at, updated_at')
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
