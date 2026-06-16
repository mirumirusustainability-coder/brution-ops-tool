import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireAuth, isStaffAdmin } from '@/lib/supabase/auth'
import { createSupabaseAdmin } from '@/lib/supabase/server'

export const maxDuration = 60

const BUCKET = 'deliverables'
const MAX_FILE_SIZE = 50 * 1024 * 1024

/**
 * 원샷 드롭 생성: deliverable + version(draft, v1) + (선택)파일 asset 을 한 번에.
 * 기존의 3단 수동 플로우(드롭 생성 → 버전 생성 → 업로드)를 대체해 단순화한다.
 * multipart/form-data: projectId, type, title, file(선택), visibility(선택)
 */
export const POST = async (request: Request) => {
  let profile
  try {
    const ctx = await requireAuth(request)
    profile = ctx.profile
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  if (!isStaffAdmin(profile.role)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  let projectId: string
  let type: string
  let title: string
  let visibility: 'client' | 'internal'
  let file: File | null = null
  try {
    const form = await request.formData()
    projectId = String(form.get('projectId') ?? '').trim()
    type = String(form.get('type') ?? '').trim()
    title = String(form.get('title') ?? '').trim()
    visibility = String(form.get('visibility') ?? 'client') === 'internal' ? 'internal' : 'client'
    const f = form.get('file')
    if (f instanceof File && f.size > 0) file = f
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  if (!projectId || !type || !title) {
    return NextResponse.json({ error: '프로젝트·종류·제목은 필수입니다.' }, { status: 400 })
  }
  if (file && file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: '파일은 최대 50MB까지 가능합니다.' }, { status: 400 })
  }

  const admin = createSupabaseAdmin()
  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('id, company_id')
    .eq('id', projectId)
    .single()
  if (projectError || !project) {
    return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
  }
  const companyId = project.company_id

  try {
    const deliverableId = crypto.randomUUID()
    const { error: delError } = await admin.from('deliverables').insert({
      id: deliverableId,
      project_id: projectId,
      company_id: companyId,
      type,
      visibility,
      title,
      created_by: profile.user_id,
    })
    if (delError) throw new Error('DELIVERABLE: ' + delError.message)

    const versionId = crypto.randomUUID()
    const { error: verError } = await admin.from('deliverable_versions').insert({
      id: versionId,
      deliverable_id: deliverableId,
      company_id: companyId,
      version_no: 1,
      status: 'draft',
      title,
      created_by: profile.user_id,
    })
    if (verError) throw new Error('VERSION: ' + verError.message)

    if (file) {
      const ext = file.name.split('.').pop() || 'bin'
      const path = `${companyId}/${projectId}/${versionId}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await admin.storage
        .from(BUCKET)
        .upload(path, Buffer.from(await file.arrayBuffer()), {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })
      if (uploadError) throw new Error('UPLOAD: ' + uploadError.message)

      const { error: assetError } = await admin.from('assets').insert({
        id: crypto.randomUUID(),
        project_id: projectId,
        company_id: companyId,
        deliverable_version_id: versionId,
        file_type: file.type || 'application/octet-stream',
        bucket: BUCKET,
        path,
        original_name: file.name,
        created_by: profile.user_id,
      })
      if (assetError) throw new Error('ASSET: ' + assetError.message)
    }

    return NextResponse.json({ ok: true, deliverableId, versionId })
  } catch (e) {
    console.error('create drop error:', e)
    return NextResponse.json({ error: '드롭 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
