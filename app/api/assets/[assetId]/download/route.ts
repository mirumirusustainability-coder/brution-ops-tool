import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { createSupabaseAdmin } from '@/lib/supabase/server'

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
      .select('id, bucket, path, deliverable_version_id')
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json({ error: 'ASSET_NOT_FOUND' }, { status: 404 })
    }

    const { data: version, error: versionError } = await admin
      .from('deliverable_versions')
      .select('id, status')
      .eq('id', asset.deliverable_version_id)
      .single()

    if (versionError || !version) {
      return NextResponse.json({ error: 'VERSION_NOT_FOUND' }, { status: 404 })
    }

    const isStaffAdmin = profile.role === 'staff_admin'
    if (!isStaffAdmin && version.status !== 'published') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const { data: signedUrl, error: signedError } = await admin.storage
      .from(asset.bucket || 'deliverables')
      .createSignedUrl(asset.path, 60)

    if (signedError || !signedUrl) {
      return NextResponse.json({ error: 'SIGNED_URL_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ url: signedUrl.signedUrl, expiresIn: 60 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
