import ExcelJS from 'exceljs'
import type { DeliverableType } from '@/types'

// AI 도구 결과 → 엑셀 워크북 빌더. export 라우트와 save-as-drop 라우트가 공유.

export type ExportTool = 'keyword' | 'ads' | 'naming' | 'naver' | 'naming-excel'

type KeywordRow = {
  keyword: string
  searchVolume?: number
  productCount?: number
  category?: string
  adCost?: number
  classification: string
  customerNote?: string
}
type AdRow = { type: string; content: string; status: string }
type NamingRow = { title: string; strategy: string; score: number; reason: string; feedback?: string }
type NaverProductRow = {
  rank: number
  productName: string
  brand: string
  maker: string
  category: string
  mallName: string
  price: number | null
}
export type NamingExcelPayload = {
  mainKeyword?: string
  categorySummary?: string
  tags?: string[]
  top?: { keyword: string; searchVolume: number; productCount: number; competition: number }[]
  productNames?: { title: string; usedKeywords: string[] }[]
}

export type ExportBody = {
  tool?: ExportTool
  rows?: unknown[]
  payload?: NamingExcelPayload
}

const STRATEGY_LABELS: Record<string, string> = {
  order_fixed: '순서고정형',
  weight_based: '가중치형',
  position_aware: '위치최적형',
}
const AD_TYPE_LABELS: Record<string, string> = {
  headline: '헤드라인',
  body: '본문',
  hook: '후킹 메시지',
  cta: 'CTA',
  creative: '소재 아이디어',
}

// 도구 → 산출물 타입(deliverable_type_enum) + 기본 파일명/제목
// deliverableType 값은 실DB enum(= types/index.ts DeliverableType) 기준
export const TOOL_DELIVERABLE_META: Record<
  ExportTool,
  { deliverableType: DeliverableType; fileName: string; label: string }
> = {
  keyword: { deliverableType: 'keyword_report', fileName: 'keyword_analysis.xlsx', label: '키워드 분석' },
  ads: { deliverableType: 'content_request', fileName: 'ad_copy.xlsx', label: '광고 문구' },
  naming: { deliverableType: 'product_candidate', fileName: 'product_names.xlsx', label: '상품명 후보' },
  'naming-excel': { deliverableType: 'product_candidate', fileName: 'product_names_pro.xlsx', label: '상품명(정밀)' },
  naver: { deliverableType: 'market_research', fileName: 'naver_shopping.xlsx', label: '네이버 쇼핑 데이터' },
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
  rows.forEach((row) => sheet.addRow({ ...row, type: AD_TYPE_LABELS[row.type] ?? row.type }))
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
    sheet.addRow({ ...row, strategy: STRATEGY_LABELS[row.strategy] ?? row.strategy, charCount: row.title.length })
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

const buildNamingExcelBook = (workbook: ExcelJS.Workbook, payload: NamingExcelPayload) => {
  const kwSheet = workbook.addWorksheet('공략 키워드 TOP15')
  kwSheet.columns = [
    { header: '순위', key: 'rank', width: 8 },
    { header: '키워드', key: 'keyword', width: 30 },
    { header: '조회수', key: 'searchVolume', width: 14 },
    { header: '상품수', key: 'productCount', width: 14 },
    { header: '경쟁강도', key: 'competition', width: 12 },
  ]
  kwSheet.getRow(1).font = { bold: true }
  ;(payload.top ?? []).forEach((t, i) =>
    kwSheet.addRow({
      rank: i + 1,
      keyword: t.keyword,
      searchVolume: t.searchVolume,
      productCount: t.productCount,
      competition: t.competition,
    })
  )

  const nameSheet = workbook.addWorksheet('추천 상품명')
  nameSheet.columns = [
    { header: 'NO', key: 'no', width: 6 },
    { header: '상품명', key: 'title', width: 60 },
    { header: '글자수', key: 'len', width: 8 },
    { header: '사용 공략 키워드', key: 'keywords', width: 50 },
  ]
  nameSheet.getRow(1).font = { bold: true }
  ;(payload.productNames ?? []).forEach((p, i) =>
    nameSheet.addRow({ no: i + 1, title: p.title, len: p.title.length, keywords: (p.usedKeywords ?? []).join(', ') })
  )

  const infoSheet = workbook.addWorksheet('상품 정보')
  infoSheet.columns = [
    { header: '항목', key: 'k', width: 18 },
    { header: '내용', key: 'v', width: 70 },
  ]
  infoSheet.getRow(1).font = { bold: true }
  infoSheet.addRow({ k: '메인키워드', v: payload.mainKeyword ?? '' })
  infoSheet.addRow({ k: '카테고리 요약', v: payload.categorySummary ?? '' })
  infoSheet.addRow({ k: '태그', v: (payload.tags ?? []).join(', ') })
}

/** body(tool + rows/payload)로 ExcelJS 워크북을 만든다. 데이터 없으면 null. */
export const buildToolWorkbook = (body: ExportBody): ExcelJS.Workbook | null => {
  const workbook = new ExcelJS.Workbook()
  if (body.tool === 'keyword' && Array.isArray(body.rows) && body.rows.length) {
    buildKeywordSheet(workbook, body.rows as KeywordRow[])
  } else if (body.tool === 'ads' && Array.isArray(body.rows) && body.rows.length) {
    buildAdsSheet(workbook, body.rows as AdRow[])
  } else if (body.tool === 'naming' && Array.isArray(body.rows) && body.rows.length) {
    buildNamingSheet(workbook, body.rows as NamingRow[])
  } else if (body.tool === 'naver' && Array.isArray(body.rows) && body.rows.length) {
    buildNaverSheet(workbook, body.rows as NaverProductRow[])
  } else if (body.tool === 'naming-excel' && body.payload) {
    buildNamingExcelBook(workbook, body.payload)
  } else {
    return null
  }
  return workbook
}
