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

    const body = await request.json().catch(() => null)
    const updates: Record<string, any> = {}

    if (typeof body?.title === 'string' && body.title.trim()) {
      updates.title = body.title.trim()
    }

    if (typeof body?.type === 'string' && body.type.trim()) {
      updates.type = body.type
    }

    if (typeof body?.visibility === 'string' && body.visibility.trim()) {
      updates.visibility = body.visibility
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'NO_UPDATES' }, { status: 400 })
    }

    const { id } = await params
    const admin = createSupabaseAdmin()
    const { data, error } = await admin
      .from('deliverables')
      .update(updates)
      .eq('id', id)
      .select('id, project_id, company_id, type, visibility, title, created_by, created_at, updated_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'DELIVERABLE_UPDATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ deliverable: data })
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

    const { data: versions, error: versionsError } = await admin
      .from('deliverable_versions')
      .select('id')
      .eq('deliverable_id', id)

    if (versionsError) {
      return NextResponse.json({ error: 'DELIVERABLE_VERSIONS_FETCH_FAILED' }, { status: 500 })
    }

    const versionIds = (versions ?? []).map((version) => version.id)

    if (versionIds.length > 0) {
      const { data: assets, error: assetsError } = await admin
        .from('assets')
        .select('id, path, bucket')
        .in('deliverable_version_id', versionIds)

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
        .in('deliverable_version_id', versionIds)

      if (assetsDeleteError) {
        return NextResponse.json({ error: 'ASSETS_DELETE_FAILED' }, { status: 500 })
      }

      const { error: versionsDeleteError } = await admin
        .from('deliverable_versions')
        .delete()
        .in('id', versionIds)

      if (versionsDeleteError) {
        return NextResponse.json({ error: 'DELIVERABLE_VERSIONS_DELETE_FAILED' }, { status: 500 })
      }
    }

    const { error: deliverableDeleteError } = await admin
      .from('deliverables')
      .delete()
      .eq('id', id)

    if (deliverableDeleteError) {
      return NextResponse.json({ error: 'DELIVERABLE_DELETE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
