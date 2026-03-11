import { NextResponse } from 'next/server'

import { isStaff, requireAuth } from '@/lib/supabase/auth'
import { createSupabaseAdmin } from '@/lib/supabase/server'

type AssetRecord = {
  id: string
  path: string
  bucket: string
  project_id: string
  deliverable_version_id: string | null
  project: {
    id: string
    company_id: string
  } | null
  deliverable_version: {
    id: string
    status: 'draft' | 'review' | 'approved' | 'published'
  } | null
}

export const GET = async (
  request: Request,
  { params }: { params: { assetId: string } }
) => {
  try {
    const { profile } = await requireAuth(request)
    const admin = createSupabaseAdmin()

    const { data: asset, error } = await admin
      .from('assets')
      .select(
        `id,
        path,
        bucket,
        project_id,
        deliverable_version_id,
        project:projects(id, company_id),
        deliverable_version:deliverable_versions(id, status)`
      )
      .eq('id', params.assetId)
      .single()

    if (error || !asset) {
      return NextResponse.json({ error: 'ASSET_NOT_FOUND' }, { status: 404 })
    }

    const assetRecord = asset as AssetRecord
    const staff = isStaff(profile.role)

    if (!staff) {
      if (!assetRecord.deliverable_version_id) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }

      if (assetRecord.deliverable_version?.status !== 'published') {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }

      if (!assetRecord.project || assetRecord.project.company_id !== profile.company_id) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }
    }

    const storageBucket =
      process.env.SUPABASE_STORAGE_BUCKET || assetRecord.bucket || 'brution-assets'
    const expiresIn = Number.parseInt(process.env.SIGNED_URL_EXPIRES_IN ?? '3600', 10)

    const { data: signedUrl, error: signedError } = await admin.storage
      .from(storageBucket)
      .createSignedUrl(assetRecord.path, expiresIn)

    if (signedError || !signedUrl) {
      return NextResponse.json({ error: 'SIGNED_URL_FAILED' }, { status: 500 })
    }

    return NextResponse.json({
      url: signedUrl.signedUrl,
      expiresIn
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN'
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'INACTIVE' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
