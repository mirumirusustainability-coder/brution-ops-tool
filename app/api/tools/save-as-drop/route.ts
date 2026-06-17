import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireAuth, isStaff } from '@/lib/supabase/auth'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { buildToolWorkbook, TOOL_DELIVERABLE_META, type ExportBody } from '@/lib/tool-export'
import { incrementUsage, TOOL_USAGE_COST_KRW } from '@/lib/usage'

export const maxDuration = 60

const BUCKET = 'deliverables'

/**
 * AI 도구 결과를 프로젝트 드롭(deliverable + version(draft) + asset)으로 저장한다.
 * 끊겨 있던 핵심 고리: 도구 → 드롭. 이후 검토(in_review) → 공개(published) → 고객 다운로드로 이어진다.
 */
export const POST = async (request: Request) => {
  let profile
  try {
    const ctx = await requireAuth(request)
    profile = ctx.profile
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  // 산출물 생성은 직원만 (고객을 위해 직원이 작업)
  if (!isStaff(profile.role)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  let body: ExportBody & { projectId?: string; title?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const projectId = body.projectId?.trim()
  if (!projectId) {
    return NextResponse.json({ error: '프로젝트를 선택해주세요.' }, { status: 400 })
  }
  if (!body.tool || !TOOL_DELIVERABLE_META[body.tool]) {
    return NextResponse.json({ error: '지원하지 않는 도구입니다.' }, { status: 400 })
  }

  const workbook = buildToolWorkbook(body)
  if (!workbook) {
    return NextResponse.json({ error: '저장할 데이터가 없습니다.' }, { status: 400 })
  }

  const admin = createSupabaseAdmin()

  // 1) 프로젝트 → company_id 확인
  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('id, company_id, name')
    .eq('id', projectId)
    .single()
  if (projectError || !project) {
    return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
  }
  const companyId = project.company_id
  const meta = TOOL_DELIVERABLE_META[body.tool]
  const title = body.title?.trim() || `${meta.label} (${new Date().toISOString().slice(0, 10)})`

  try {
    // 2) deliverable 생성
    const deliverableId = crypto.randomUUID()
    const { error: delError } = await admin.from('deliverables').insert({
      id: deliverableId,
      project_id: projectId,
      company_id: companyId,
      type: meta.deliverableType,
      visibility: 'client',
      title,
      created_by: profile.user_id,
    })
    if (delError) throw new Error('DELIVERABLE_CREATE_FAILED: ' + delError.message)

    // 3) version(draft) 생성
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
    if (verError) throw new Error('VERSION_CREATE_FAILED: ' + verError.message)

    // 4) 엑셀 buffer → Storage 업로드
    const buffer = await workbook.xlsx.writeBuffer()
    const fileId = crypto.randomUUID()
    const path = `${companyId}/${projectId}/${versionId}/${fileId}.xlsx`
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, Buffer.from(buffer), {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: false,
      })
    if (uploadError) throw new Error('UPLOAD_FAILED: ' + uploadError.message)

    // 5) asset 레코드
    const { error: assetError } = await admin.from('assets').insert({
      id: crypto.randomUUID(),
      project_id: projectId,
      company_id: companyId,
      deliverable_version_id: versionId,
      file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      bucket: BUCKET,
      path,
      original_name: `${meta.fileName.replace(/\.xlsx$/, '')}_${title}.xlsx`,
      created_by: profile.user_id,
    })
    if (assetError) throw new Error('ASSET_CREATE_FAILED: ' + assetError.message)

    // 고객사 당월 AI 사용량 누적 (best-effort)
    await incrementUsage(admin, companyId, {
      executions: 1,
      costKrw: TOOL_USAGE_COST_KRW[body.tool] ?? 0,
    })

    return NextResponse.json({
      ok: true,
      deliverableId,
      versionId,
      projectId,
      projectName: project.name,
    })
  } catch (e) {
    console.error('save-as-drop error:', e)
    return NextResponse.json({ error: '드롭 저장 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
