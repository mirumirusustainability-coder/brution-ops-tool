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

type NamingRow = {
  title: string
  strategy: string
  score: number
  reason: string
  feedback?: string
}

const STRATEGY_LABELS: Record<string, string> = {
  order_fixed: '순서고정형',
  weight_based: '가중치형',
  position_aware: '위치최적형',
}

type NaverProductRow = {
  rank: number
  productName: string
  brand: string
  maker: string
  category: string
  mallName: string
  price: number | null
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

const buildNamingSheet = (workbook: ExcelJS.Workbook, rows: NamingRow[]) => {
  const sheet = workbook.addWorksheet('상품명 후보')
  sheet.columns = [
    { header: '상품명', key: 'title', width: 50 },
    { header: '전략', key: 'strategy', width: 12 },
    { header: '점수', key: 'score', width: 8 },
    { header: '글자수', key: 'charCount', width: 8 },
    { header: '평가 근거', key: 'reason', width: 60 },
    { header: '피드백', key: 'feedback', width: 10 },
  ]
  sheet.getRow(1).font = { bold: true }
  rows.forEach((row) =>
    sheet.addRow({
      ...row,
      strategy: STRATEGY_LABELS[row.strategy] ?? row.strategy,
      charCount: row.title.length,
    })
  )
}

const buildNaverSheet = (workbook: ExcelJS.Workbook, rows: NaverProductRow[]) => {
  const sheet = workbook.addWorksheet('네이버 쇼핑 상품')
  sheet.columns = [
    { header: '순위', key: 'rank', width: 8 },
    { header: '상품명', key: 'productName', width: 50 },
    { header: '브랜드', key: 'brand', width: 16 },
    { header: '제조사', key: 'maker', width: 16 },
    { header: '카테고리', key: 'category', width: 40 },
    { header: '판매처', key: 'mallName', width: 18 },
    { header: '최저가', key: 'price', width: 12 },
  ]
  sheet.getRow(1).font = { bold: true }
  rows.forEach((row) => sheet.addRow(row))
}

export const POST = async (request: Request) => {
  try {
    await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: { tool?: 'keyword' | 'ads' | 'naming' | 'naver'; rows?: unknown[] }
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
  } else if (body.tool === 'naming') {
    buildNamingSheet(workbook, body.rows as NamingRow[])
    fileName = 'product_names.xlsx'
  } else if (body.tool === 'naver') {
    buildNaverSheet(workbook, body.rows as NaverProductRow[])
    fileName = 'naver_shopping.xlsx'
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
