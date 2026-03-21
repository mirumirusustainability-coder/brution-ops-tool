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
      .select('id, name, description, created_at, company_id, companies(name)')
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

    return NextResponse.json({
      project: {
        ...project,
        company: {
          name: Array.isArray(project.companies)
            ? project.companies[0]?.name ?? null
            : project.companies?.name ?? null,
        },
      },
      deliverables: responseDeliverables,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
