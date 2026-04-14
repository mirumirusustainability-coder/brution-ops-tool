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

    const [
      { data: activeProjectRows },
      { count: contractCompletedCount },
      { count: draftVersionsCount },
      { count: step0Count },
      { count: step1Count },
      { count: step2Count },
      { count: step3Count },
      { count: step4Count },
      { data: companiesWithMeta },
    ] = await Promise.all([
      admin.from('projects').select('company_id').eq('status', 'active'),
      admin
        .from('companies')
        .select('id', { count: 'exact', head: true })
        .filter('metadata->>contract_status', 'eq', '완료')
        .neq('id', BRUTION_COMPANY_ID),
      admin
        .from('deliverable_versions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft'),
      admin.from('projects').select('id', { count: 'exact', head: true }).eq('step', 0),
      admin.from('projects').select('id', { count: 'exact', head: true }).eq('step', 1),
      admin.from('projects').select('id', { count: 'exact', head: true }).eq('step', 2),
      admin.from('projects').select('id', { count: 'exact', head: true }).eq('step', 3),
      admin.from('projects').select('id', { count: 'exact', head: true }).eq('step', 4),
      admin
        .from('companies')
        .select('id, name, metadata')
        .neq('id', BRUTION_COMPANY_ID),
    ])

    // Active companies: distinct company_ids from active projects
    const activeCompanies = new Set(
      (activeProjectRows ?? []).map((r) => r.company_id)
    ).size

    // D-day: companies with contract_end within 30 days
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

    type DdayCompany = { id: string; name: string; contract_end: string; daysLeft: number }
    const ddayCompanies: DdayCompany[] = (companiesWithMeta ?? [])
      .filter((c) => {
        const end = (c.metadata as Record<string, unknown> | null)?.contract_end
        if (!end || typeof end !== 'string') return false
        const endDate = new Date(end)
        return endDate >= today && endDate <= in30Days
      })
      .map((c) => {
        const contractEnd = (c.metadata as Record<string, unknown>).contract_end as string
        const endDate = new Date(contractEnd)
        const daysLeft = Math.ceil(
          (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )
        return { id: c.id, name: c.name, contract_end: contractEnd, daysLeft }
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)

    // Recent activity feed: top 5 across all companies
    type FeedEntry = {
      id: string
      type: string
      content: string
      author: string
      created_at: string
      pinned?: boolean
      company_id: string
      company_name: string
    }
    const allFeedItems: FeedEntry[] = (companiesWithMeta ?? []).flatMap((c) => {
      const meta = c.metadata as Record<string, unknown> | null
      const feed = Array.isArray(meta?.activity_feed) ? meta.activity_feed : []
      return (feed as Record<string, unknown>[]).map((item) => ({
        ...(item as object),
        company_id: c.id,
        company_name: c.name,
      })) as FeedEntry[]
    })
    allFeedItems.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const recentActivityFeed = allFeedItems.slice(0, 5)

    return NextResponse.json({
      activeCompanies,
      contractCompleted: contractCompletedCount ?? 0,
      draftVersions: draftVersionsCount ?? 0,
      ddayCompanies,
      recentActivityFeed,
      stepCounts: {
        0: step0Count ?? 0,
        1: step1Count ?? 0,
        2: step2Count ?? 0,
        3: step3Count ?? 0,
        4: step4Count ?? 0,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
