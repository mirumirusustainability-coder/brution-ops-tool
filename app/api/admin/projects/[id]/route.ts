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

    const { data: project, error: projectError } = await admin
      .from('projects')
      .select('id, name, description, notes, created_at, company_id, step, status, companies(name)')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'PROJECT_NOT_FOUND' }, { status: 404 })
    }

    const { data: deliverables, error: deliverableError } = await admin
      .from('deliverables')
      .select('id, project_id, company_id, type, visibility, title, created_by, created_at, updated_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (deliverableError) {
      return NextResponse.json({ error: 'DELIVERABLES_FETCH_FAILED' }, { status: 500 })
    }

    const deliverableList = deliverables ?? []
    const deliverableIds = deliverableList.map((item) => item.id)

    let versions: any[] = []
    if (deliverableIds.length > 0) {
      const { data: versionsData, error: versionsError } = await admin
        .from('deliverable_versions')
        .select('id, deliverable_id, company_id, version_no, status, title, created_by, created_at, updated_at')
        .in('deliverable_id', deliverableIds)
        .order('version_no', { ascending: false })

      if (versionsError) {
        return NextResponse.json({ error: 'DELIVERABLE_VERSIONS_FETCH_FAILED' }, { status: 500 })
      }

      versions = versionsData ?? []
    }

    const versionIds = versions.map((version) => version.id)
    let assets: any[] = []
    if (versionIds.length > 0) {
      const { data: assetsData, error: assetsError } = await admin
        .from('assets')
        .select('id, deliverable_version_id, path, original_name, created_at')
        .in('deliverable_version_id', versionIds)
        .order('created_at', { ascending: false })

      if (assetsError) {
        return NextResponse.json({ error: 'ASSETS_FETCH_FAILED' }, { status: 500 })
      }

      assets = assetsData ?? []
    }

    const versionsByDeliverable: Record<string, any[]> = {}
    versions.forEach((version) => {
      if (!versionsByDeliverable[version.deliverable_id]) {
        versionsByDeliverable[version.deliverable_id] = []
      }
      versionsByDeliverable[version.deliverable_id].push(version)
    })

    const responseDeliverables = deliverableList.map((deliverable) => ({
      ...deliverable,
      versions: versionsByDeliverable[deliverable.id] ?? [],
    }))

    const companies = project.companies as { name?: string } | { name?: string }[] | null
    const companyName = Array.isArray(companies)
      ? companies[0]?.name ?? null
      : companies?.name ?? null

    return NextResponse.json({
      project: {
        ...project,
        company: {
          name: companyName,
        },
      },
      deliverables: responseDeliverables,
      assets,
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

    const body = await request.json().catch(() => null)
    const updates: Record<string, any> = {}

    if (typeof body?.name === 'string' && body.name.trim()) {
      updates.name = body.name.trim()
    }

    if (body?.description === null || typeof body?.description === 'string') {
      updates.description = body.description === null ? null : body.description
    }

    if (typeof body?.companyId === 'string' && body.companyId.trim()) {
      updates.company_id = body.companyId
    }

    if (typeof body?.step === 'number') {
      if (body.step < 0 || body.step > 4) {
        return NextResponse.json({ error: 'INVALID_STEP' }, { status: 400 })
      }
      updates.step = body.step
    }

    if (typeof body?.status === 'string') {
      const allowedStatuses = ['active', 'completed', 'paused']
      if (!allowedStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 400 })
      }
      updates.status = body.status
    }

    if (Array.isArray(body?.notes)) {
      updates.notes = body.notes
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'NO_UPDATES' }, { status: 400 })
    }

    const { id } = await params
    const admin = createSupabaseAdmin()
    const { data, error } = await admin
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select('id, name, description, created_at, company_id, step, status')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'PROJECT_UPDATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ project: data })
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

    const { data: assets, error: assetsError } = await admin
      .from('assets')
      .select('id, path, bucket')
      .eq('project_id', id)

    if (assetsError) {
      return NextResponse.json({ error: 'ASSETS_FETCH_FAILED' }, { status: 500 })
    }

    const pathsByBucket = (assets ?? []).reduce<Record<string, string[]>>((acc, asset) => {
      if (!acc[asset.bucket]) {
        acc[asset.bucket] = []
      }
      acc[asset.bucket].push(asset.path)
      return acc
    }, {})

    for (const [bucket, paths] of Object.entries(pathsByBucket)) {
      if (paths.length === 0) continue
      const { error: storageError } = await admin.storage.from(bucket).remove(paths)
      if (storageError) {
        return NextResponse.json({ error: 'ASSET_STORAGE_DELETE_FAILED' }, { status: 500 })
      }
    }

    const { error: assetsDeleteError } = await admin
      .from('assets')
      .delete()
      .eq('project_id', id)

    if (assetsDeleteError) {
      return NextResponse.json({ error: 'ASSETS_DELETE_FAILED' }, { status: 500 })
    }

    const { data: deliverables, error: deliverablesError } = await admin
      .from('deliverables')
      .select('id')
      .eq('project_id', id)

    if (deliverablesError) {
      return NextResponse.json({ error: 'DELIVERABLES_FETCH_FAILED' }, { status: 500 })
    }

    const deliverableIds = (deliverables ?? []).map((deliverable) => deliverable.id)

    if (deliverableIds.length > 0) {
      const { error: versionsDeleteError } = await admin
        .from('deliverable_versions')
        .delete()
        .in('deliverable_id', deliverableIds)

      if (versionsDeleteError) {
        return NextResponse.json({ error: 'DELIVERABLE_VERSIONS_DELETE_FAILED' }, { status: 500 })
      }
    }

    const { error: deliverablesDeleteError } = await admin
      .from('deliverables')
      .delete()
      .eq('project_id', id)

    if (deliverablesDeleteError) {
      return NextResponse.json({ error: 'DELIVERABLES_DELETE_FAILED' }, { status: 500 })
    }

    const { error: projectDeleteError } = await admin
      .from('projects')
      .delete()
      .eq('id', id)

    if (projectDeleteError) {
      return NextResponse.json({ error: 'PROJECT_DELETE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
