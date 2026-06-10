import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { requireAuth, isStaff } from '@/lib/supabase/auth'
import { anthropicErrorResponse } from '@/lib/anthropic'
import { runNamingEngine, RawRelated, DevCode } from '@/lib/naming-engine'

export const maxDuration = 300

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_PRODUCT_NAMES_INPUT = 60

const normalize = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, '')

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}

const cellText = (v: unknown): string => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object' && 'text' in (v as any)) return String((v as any).text).trim()
  if (typeof v === 'object' && 'result' in (v as any)) return String((v as any).result).trim()
  return String(v).trim()
}

const KEYWORD_HEADERS = ['키워드', 'keyword', '연관검색어']
const VOLUME_HEADERS = ['총검색수', '총 검색수', '총조회수', '조회수', '검색수', '월간검색수', '월간총조회수']
const PRODUCT_HEADERS = ['상품수', 'productcount', '상품수량', '전체상품수']

const findHeaderColumn = (headerRow: ExcelJS.Row, aliases: string[]): number | null => {
  let found: number | null = null
  headerRow.eachCell((cell, col) => {
    if (found) return
    const h = normalize(cell.value)
    if (aliases.some((a) => normalize(a) === h)) found = col
  })
  return found
}

const parseRelatedSheet = (sheet: ExcelJS.Worksheet): RawRelated[] => {
  const header = sheet.getRow(1)
  const kwCol = findHeaderColumn(header, KEYWORD_HEADERS)
  const volCol = findHeaderColumn(header, VOLUME_HEADERS)
  const prodCol = findHeaderColumn(header, PRODUCT_HEADERS)

  if (!kwCol || !volCol || !prodCol) {
    throw new Error('RELATED_COLUMNS_MISSING')
  }

  const rows: RawRelated[] = []
  const seen = new Set<string>()
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const keyword = cellText(row.getCell(kwCol).value)
    const searchVolume = toNumber(row.getCell(volCol).value)
    const productCount = toNumber(row.getCell(prodCol).value)

    if (!keyword) return
    if (searchVolume === null || searchVolume <= 0) return
    if (productCount === null || productCount < 0) return
    if (seen.has(keyword)) return
    seen.add(keyword)

    rows.push({ keyword, searchVolume, productCount })
  })
  return rows
}

const DEV_KEYWORD_HEADERS = ['productname', '상품명', 'product_name']
const DEV_CATEGORY_HEADERS = ['카테고리', 'category', '대표카테고리']
const DEV_ATTR_HEADERS = ['속성', 'attribute', 'attrs', 'attribute1']
const DEV_TAG_HEADERS = ['태그', 'tag', 'tags', '해시태그']

const collectColumn = (sheet: ExcelJS.Worksheet, aliases: string[], limit: number): string[] => {
  const header = sheet.getRow(1)
  const col = findHeaderColumn(header, aliases)
  if (!col) return []
  const out: string[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1 || out.length >= limit) return
    const val = cellText(row.getCell(col).value)
    if (val) out.push(val)
  })
  return out
}

const parseDevSheet = (sheet: ExcelJS.Worksheet): DevCode => ({
  productNames: collectColumn(sheet, DEV_KEYWORD_HEADERS, MAX_PRODUCT_NAMES_INPUT),
  categories: [...new Set(collectColumn(sheet, DEV_CATEGORY_HEADERS, 100))],
  attributes: [...new Set(collectColumn(sheet, DEV_ATTR_HEADERS, 100))],
  tags: [...new Set(collectColumn(sheet, DEV_TAG_HEADERS, 200))],
})

const detectSheets = (workbook: ExcelJS.Workbook) => {
  let related: ExcelJS.Worksheet | null = null
  let dev: ExcelJS.Worksheet | null = null

  for (const sheet of workbook.worksheets) {
    const name = normalize(sheet.name)
    const header = sheet.getRow(1)
    const hasKeyword = findHeaderColumn(header, KEYWORD_HEADERS) !== null
    const hasVolume = findHeaderColumn(header, VOLUME_HEADERS) !== null
    const hasProductName = findHeaderColumn(header, DEV_KEYWORD_HEADERS) !== null

    if (!related && (name.includes('연관') || (hasKeyword && hasVolume))) {
      related = sheet
      continue
    }
    if (!dev && (name.includes('개발자') || hasProductName)) {
      dev = sheet
    }
  }
  return { related, dev }
}

export const POST = async (request: Request) => {
  let role: string
  try {
    const { profile } = await requireAuth(request)
    role = profile.role
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  if (!isStaff(role as any)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  let related: RawRelated[]
  let dev: DevCode
  let mainKeywordInput: string
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    mainKeywordInput = String(formData.get('mainKeyword') ?? '').trim()

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '엑셀 파일이 첨부되지 않았습니다.' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일 크기는 최대 10MB까지 가능합니다.' }, { status: 400 })
    }

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await file.arrayBuffer())
    const { related: relatedSheet, dev: devSheet } = detectSheets(workbook)

    if (!relatedSheet) {
      return NextResponse.json(
        { error: '연관검색어 시트를 찾을 수 없습니다. (키워드/총 검색수/상품수 컬럼 필요)' },
        { status: 400 }
      )
    }

    related = parseRelatedSheet(relatedSheet)
    dev = devSheet
      ? parseDevSheet(devSheet)
      : { categories: [], attributes: [], tags: [], productNames: [] }
  } catch (error) {
    if (error instanceof Error && error.message === 'RELATED_COLUMNS_MISSING') {
      return NextResponse.json(
        { error: '연관검색어 시트에 필수 컬럼(키워드/총 검색수/상품수)이 없습니다.' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: '엑셀 파일을 읽을 수 없습니다. 형식을 확인해주세요.' }, { status: 400 })
  }

  if (related.length === 0) {
    return NextResponse.json({ error: '유효한 연관검색어 데이터가 없습니다.' }, { status: 400 })
  }

  try {
    const result = await runNamingEngine(related, dev, mainKeywordInput)
    return NextResponse.json(result)
  } catch (error) {
    const mapped = anthropicErrorResponse(error)
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status })
    }
    console.error('naming-excel error:', error)
    return NextResponse.json({ error: '상품명 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
