import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { createSupabaseAdmin } from '@/lib/supabase/server'
import { isStaff } from '@/lib/supabase/auth'

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) => {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: (name, value, options) => {
            cookieStore.set({ name, value, ...options })
          },
          remove: (name, options) => {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 })
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const admin = createSupabaseAdmin()
    const { assetId } = await params

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('user_id, role, company_id, status')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    if (profile.status !== 'active') {
      return NextResponse.json({ error: 'INACTIVE' }, { status: 403 })
    }

    const { data: asset, error: assetError } = await admin
      .from('assets')
      .select('id, bucket, path, original_name, company_id, deliverable_version_id')
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'ASSET_NOT_FOUND' }, { status: 404 })
    }

    // ── 접근 제어 (service role은 RLS를 우회하므로 여기서 명시 검증) ──
    // 직원: 모든 산출물 접근 가능. 고객: 자기 회사 + published + client 공개분만.
    if (!isStaff(profile.role)) {
      if (!profile.company_id || asset.company_id !== profile.company_id) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
      if (!asset.deliverable_version_id) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
      const { data: version, error: versionError } = await admin
        .from('deliverable_versions')
        .select('status, deliverables(visibility)')
        .eq('id', asset.deliverable_version_id)
        .single()

      if (versionError || !version) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
      const deliverable = Array.isArray((version as any).deliverables)
        ? (version as any).deliverables[0]
        : (version as any).deliverables
      if (version.status !== 'published' || deliverable?.visibility !== 'client') {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    }

    const { data: signedUrl, error: signedError } = await admin.storage
      .from(asset.bucket || 'deliverables')
      .createSignedUrl(asset.path, 60)

    if (signedError || !signedUrl) {
      return NextResponse.json({ error: 'SIGNED_URL_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ url: signedUrl.signedUrl, originalName: asset.original_name ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
