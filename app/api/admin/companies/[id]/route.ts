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

    const { data: company, error: companyError } = await admin
      .from('companies')
      .select('id, name, metadata, created_at, updated_at')
      .eq('id', id)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'COMPANY_NOT_FOUND' }, { status: 404 })
    }

    const { data: projects, error: projectsError } = await admin
      .from('projects')
      .select('id, company_id, name, description, step, status, metadata, created_at, updated_at')
      .eq('company_id', id)
      .order('created_at', { ascending: false })

    if (projectsError) {
      return NextResponse.json({ error: 'PROJECTS_FETCH_FAILED' }, { status: 500 })
    }

    const { data: members, error: membersError } = await admin
      .from('profiles')
      .select('user_id, email, name, role, phone, job_title, avatar_url, business_card_url, company_id, status, must_change_password, created_at, updated_at')
      .eq('company_id', id)
      .order('created_at', { ascending: false })

    if (membersError) {
      return NextResponse.json({ error: 'MEMBERS_FETCH_FAILED' }, { status: 500 })
    }

    return NextResponse.json({
      company,
      projects: projects ?? [],
      members: members ?? [],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
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
    const name = typeof body?.name === 'string' ? body.name.trim() : undefined
    const incomingMetadata =
      body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? body.metadata
        : null

    if (incomingMetadata && 'contact_name' in incomingMetadata && !('representative_name' in incomingMetadata)) {
      incomingMetadata.representative_name = incomingMetadata.contact_name
      delete incomingMetadata.contact_name
    }

    if (!name && !incomingMetadata) {
      return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
    }

    const admin = createSupabaseAdmin()
    let mergedMetadata: Record<string, any> | undefined = undefined

    if (incomingMetadata) {
      const { data: existing, error: existingError } = await admin
        .from('companies')
        .select('metadata')
        .eq('id', id)
        .single()

      if (existingError || !existing) {
        return NextResponse.json({ error: 'COMPANY_NOT_FOUND' }, { status: 404 })
      }

      mergedMetadata = {
        ...(existing.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
        ...incomingMetadata,
      }
    }

    const updatePayload: Record<string, any> = {}
    if (name) updatePayload.name = name
    if (mergedMetadata) updatePayload.metadata = mergedMetadata

    const { data: updated, error: updateError } = await admin
      .from('companies')
      .update(updatePayload)
      .eq('id', id)
      .select('id, name, metadata, created_at, updated_at')
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: 'COMPANY_UPDATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ company: updated })
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

    const { data: members, error: membersError } = await admin
      .from('profiles')
      .select('user_id')
      .eq('company_id', id)

    if (membersError) {
      return NextResponse.json({ error: 'MEMBERS_FETCH_FAILED' }, { status: 500 })
    }

    const userIds = (members ?? []).map((member) => member.user_id)

    const { error: profileDeleteError } = await admin
      .from('profiles')
      .delete()
      .eq('company_id', id)

    if (profileDeleteError) {
      return NextResponse.json({ error: 'PROFILES_DELETE_FAILED' }, { status: 500 })
    }

    const authDeleteResults = await Promise.all(
      userIds.map((userId) => admin.auth.admin.deleteUser(userId))
    )

    const authDeleteFailed = authDeleteResults.some((result) => result.error)
    if (authDeleteFailed) {
      return NextResponse.json({ error: 'AUTH_DELETE_FAILED' }, { status: 500 })
    }

    const { error: companyDeleteError } = await admin
      .from('companies')
      .delete()
      .eq('id', id)

    if (companyDeleteError) {
      return NextResponse.json({ error: 'COMPANY_DELETE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
