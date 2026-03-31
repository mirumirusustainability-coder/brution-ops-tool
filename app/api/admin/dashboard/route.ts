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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

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

export const GET = async () => {
  try {
    const profile = await getProfile()
    if (!isStaffAdmin(profile.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const admin = createSupabaseAdmin()

    const [{ count: projectsCount }, { count: activeProjectsCount }, { count: companiesCount }, { count: usersCount }] =
      await Promise.all([
        admin.from('projects').select('id', { count: 'exact', head: true }),
        admin.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        admin.from('companies').select('id', { count: 'exact', head: true }),
        admin
          .from('profiles')
          .select('user_id', { count: 'exact', head: true })
          .in('role', ['staff_admin', 'staff_member']),
      ])

    const { data: recentProjects, error: recentError } = await admin
      .from('projects')
      .select('id, name, step, status, created_at, companies(name)')
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) {
      return NextResponse.json({ error: 'RECENT_PROJECTS_FETCH_FAILED' }, { status: 500 })
    }

    return NextResponse.json({
      counts: {
        projects: projectsCount ?? 0,
        activeProjects: activeProjectsCount ?? 0,
        companies: companiesCount ?? 0,
        users: usersCount ?? 0,
      },
      recentProjects: recentProjects ?? [],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
