import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth'
import { buildToolWorkbook, TOOL_DELIVERABLE_META, type ExportBody } from '@/lib/tool-export'

export const maxDuration = 60

export const POST = async (request: Request) => {
  try {
    await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: ExportBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const workbook = buildToolWorkbook(body)
  if (!workbook) {
    return NextResponse.json({ error: '내보낼 데이터가 없습니다.' }, { status: 400 })
  }

  const fileName = body.tool ? TOOL_DELIVERABLE_META[body.tool].fileName : 'export.xlsx'
  const buffer = await workbook.xlsx.writeBuffer()
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
