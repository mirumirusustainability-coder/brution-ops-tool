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

export const GET = async (_request: Request) => {
  try {
    const profile = await getProfile()
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const admin = createSupabaseAdmin()
    const { data: companies, error } = await admin
      .from('companies')
      .select('id, name, metadata, created_at, updated_at')
      .neq('id', BRUTION_COMPANY_ID)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'COMPANIES_FETCH_FAILED' }, { status: 500 })
    }

    const companyIds = (companies ?? []).map((company) => company.id)
    if (companyIds.length === 0) {
      return NextResponse.json({ companies: [] })
    }

    const { data: projects } = await admin
      .from('projects')
      .select('id, company_id, name, step, status, created_at, updated_at')
      .in('company_id', companyIds)
      .order('created_at', { ascending: false })

    const latestProjectMap = new Map<string, any>()
    ;(projects ?? []).forEach((project) => {
      if (!latestProjectMap.has(project.company_id)) {
        latestProjectMap.set(project.company_id, project)
      }
    })

    const { data: clientAdmins } = await admin
      .from('profiles')
      .select('company_id, name')
      .in('company_id', companyIds)
      .eq('role', 'client_admin')
      .order('created_at', { ascending: true })

    const adminNameMap = new Map<string, string | null>()
    ;(clientAdmins ?? []).forEach((adminProfile) => {
      if (!adminNameMap.has(adminProfile.company_id)) {
        adminNameMap.set(adminProfile.company_id, adminProfile.name ?? null)
      }
    })

    // drop status counts per company
    const allProjectIds = (projects ?? []).map((p) => p.id)
    const dropCountMap = new Map<string, { published: number; in_review: number; draft: number }>()

    if (allProjectIds.length > 0) {
      const { data: versions } = await admin
        .from('deliverable_versions')
        .select('id, status, deliverables!inner(project_id)')
        .in('deliverables.project_id', allProjectIds)

      if (versions) {
        // map project_id -> company_id
        const projectToCompany = new Map<string, string>()
        ;(projects ?? []).forEach((p) => projectToCompany.set(p.id, p.company_id))

        for (const v of versions) {
          const projectId = (v.deliverables as unknown as { project_id: string })?.project_id
          if (!projectId) continue
          const companyId = projectToCompany.get(projectId)
          if (!companyId) continue
          if (!dropCountMap.has(companyId)) {
            dropCountMap.set(companyId, { published: 0, in_review: 0, draft: 0 })
          }
          const counts = dropCountMap.get(companyId)!
          const s = (v.status ?? '') as string
          if (s === 'published') counts.published++
          else if (s === 'in_review') counts.in_review++
          else if (s === 'draft') counts.draft++
        }
      }
    }

    const enriched = (companies ?? []).map((company) => ({
      ...company,
      latest_project: latestProjectMap.get(company.id) ?? null,
      client_admin_name: adminNameMap.get(company.id) ?? null,
      drop_counts: dropCountMap.get(company.id) ?? { published: 0, in_review: 0, draft: 0 },
    }))

    return NextResponse.json({ companies: enriched })
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
    const name = body?.name
    const metadata = body?.metadata

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 })
    }

    const admin = createSupabaseAdmin()
    const { data, error } = await admin
      .from('companies')
      .insert({ name, metadata: metadata ?? null })
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
