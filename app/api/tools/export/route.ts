import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { requireAuth } from '@/lib/supabase/auth'

export const maxDuration = 60

type KeywordRow = {
  keyword: string
  searchVolume?: number
  productCount?: number
  category?: string
  adCost?: number
  classification: string
  customerNote?: string
}

type AdRow = {
  type: string
  content: string
  status: string
}

const AD_TYPE_LABELS: Record<string, string> = {
  headline: '헤드라인',
  body: '본문',
  hook: '후킹 메시지',
  cta: 'CTA',
  creative: '소재 아이디어',
}

const buildKeywordSheet = (workbook: ExcelJS.Workbook, rows: KeywordRow[]) => {
  const sheet = workbook.addWorksheet('키워드 분석')
  sheet.columns = [
    { header: '키워드', key: 'keyword', width: 28 },
    { header: '검색량', key: 'searchVolume', width: 12 },
    { header: '상품수', key: 'productCount', width: 12 },
    { header: '카테고리', key: 'category', width: 14 },
    { header: '광고비', key: 'adCost', width: 12 },
    { header: '분류', key: 'classification', width: 10 },
    { header: '메모', key: 'customerNote', width: 40 },
  ]
  sheet.getRow(1).font = { bold: true }
  rows.forEach((row) => sheet.addRow(row))
}

const buildAdsSheet = (workbook: ExcelJS.Workbook, rows: AdRow[]) => {
  const sheet = workbook.addWorksheet('광고 문구')
  sheet.columns = [
    { header: '유형', key: 'type', width: 14 },
    { header: '내용', key: 'content', width: 70 },
    { header: '상태', key: 'status', width: 10 },
  ]
  sheet.getRow(1).font = { bold: true }
  rows.forEach((row) =>
    sheet.addRow({ ...row, type: AD_TYPE_LABELS[row.type] ?? row.type })
  )
}

export const POST = async (request: Request) => {
  try {
    await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: { tool?: 'keyword' | 'ads'; rows?: unknown[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  if (!body.tool || !Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: '내보낼 데이터가 없습니다.' }, { status: 400 })
  }

  const workbook = new ExcelJS.Workbook()
  let fileName: string
  if (body.tool === 'keyword') {
    buildKeywordSheet(workbook, body.rows as KeywordRow[])
    fileName = 'keyword_analysis.xlsx'
  } else if (body.tool === 'ads') {
    buildAdsSheet(workbook, body.rows as AdRow[])
    fileName = 'ad_copy.xlsx'
  } else {
    return NextResponse.json({ error: '지원하지 않는 도구입니다.' }, { status: 400 })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
