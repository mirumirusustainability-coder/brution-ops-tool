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

type DownloadLogStatus = 'attempt' | 'success' | 'forbidden' | 'not_found' | 'error'

const logDownloadEvent = async ({
  admin,
  companyId,
  userId,
  assetId,
  status,
  reason,
}: {
  admin: ReturnType<typeof createSupabaseAdmin>
  companyId: string | null
  userId: string
  assetId: string
  status: DownloadLogStatus
  reason?: string
}) => {
  try {
    await admin.from('audit_logs').insert({
      company_id: companyId,
      user_id: userId,
      action: `asset_download_${status}`,
      target_type: 'asset',
      target_id: assetId,
      metadata: {
        reason: reason ?? null,
      },
    })
  } catch {
    return
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { profile } = await requireAuth(request)
    const admin = createSupabaseAdmin()
    const { assetId } = await params

    await logDownloadEvent({
      admin,
      companyId: profile.company_id,
      userId: profile.user_id,
      assetId,
      status: 'attempt',
    })

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
      .eq('id', assetId)
      .single()

    if (error || !asset) {
      await logDownloadEvent({
        admin,
        companyId: profile.company_id,
        userId: profile.user_id,
        assetId,
        status: 'not_found',
        reason: 'ASSET_NOT_FOUND',
      })
      return NextResponse.json({ error: 'ASSET_NOT_FOUND' }, { status: 404 })
    }

    const assetRecord: AssetRecord = {
      ...(asset as AssetRecord),
      project: Array.isArray(asset.project) ? asset.project[0] ?? null : asset.project ?? null,
    }
    const staff = isStaff(profile.role)

    if (!staff) {
      if (!assetRecord.deliverable_version_id) {
        await logDownloadEvent({
          admin,
          companyId: profile.company_id,
          userId: profile.user_id,
          assetId,
          status: 'forbidden',
          reason: 'MISSING_DELIVERABLE_VERSION',
        })
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }

      if (assetRecord.deliverable_version?.status !== 'published') {
        await logDownloadEvent({
          admin,
          companyId: profile.company_id,
          userId: profile.user_id,
          assetId,
          status: 'forbidden',
          reason: 'NOT_PUBLISHED',
        })
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
      }

      if (!assetRecord.project || assetRecord.project.company_id !== profile.company_id) {
        await logDownloadEvent({
          admin,
          companyId: profile.company_id,
          userId: profile.user_id,
          assetId,
          status: 'forbidden',
          reason: 'TENANT_MISMATCH',
        })
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
      await logDownloadEvent({
        admin,
        companyId: profile.company_id,
        userId: profile.user_id,
        assetId,
        status: 'error',
        reason: 'SIGNED_URL_FAILED',
      })
      return NextResponse.json({ error: 'SIGNED_URL_FAILED' }, { status: 500 })
    }

    await logDownloadEvent({
      admin,
      companyId: profile.company_id,
      userId: profile.user_id,
      assetId: params.assetId,
      status: 'success',
    })

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
