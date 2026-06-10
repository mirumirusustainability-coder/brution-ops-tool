import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { requireAuth } from '@/lib/supabase/auth'
import { getAnthropicClient, anthropicErrorResponse, ANTHROPIC_MODEL } from '@/lib/anthropic'

export const maxDuration = 300

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_KEYWORDS = 300

type ParsedRow = {
  keyword: string
  searchVolume?: number
  productCount?: number
  category?: string
  adCost?: number
}

const HEADER_ALIASES: Record<keyof Omit<ParsedRow, 'keyword'> | 'keyword', string[]> = {
  keyword: ['키워드', 'keyword'],
  searchVolume: ['검색량', 'search volume', 'searchvolume'],
  productCount: ['상품수', 'product count', 'productcount'],
  category: ['카테고리', 'category'],
  adCost: ['광고비', 'ad cost', 'adcost'],
}

const normalizeHeader = (value: unknown) => String(value ?? '').trim().toLowerCase()

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  const n = Number(String(value).replace(/,/g, ''))
  return Number.isFinite(n) ? n : undefined
}

const parseExcel = async (buffer: ArrayBuffer): Promise<ParsedRow[]> => {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const headerRow = sheet.getRow(1)
  const columnMap: Partial<Record<keyof ParsedRow, number>> = {}
  headerRow.eachCell((cell, colNumber) => {
    const header = normalizeHeader(cell.value)
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(header)) {
        columnMap[field as keyof ParsedRow] = colNumber
      }
    }
  })

  if (!columnMap.keyword) {
    throw new Error('KEYWORD_COLUMN_MISSING')
  }

  const rows: ParsedRow[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const keyword = String(row.getCell(columnMap.keyword!).value ?? '').trim()
    if (!keyword) return
    rows.push({
      keyword,
      searchVolume: columnMap.searchVolume ? toNumber(row.getCell(columnMap.searchVolume).value) : undefined,
      productCount: columnMap.productCount ? toNumber(row.getCell(columnMap.productCount).value) : undefined,
      category: columnMap.category ? String(row.getCell(columnMap.category).value ?? '').trim() || undefined : undefined,
      adCost: columnMap.adCost ? toNumber(row.getCell(columnMap.adCost).value) : undefined,
    })
  })
  return rows
}

const parseJson = (text: string): ParsedRow[] => {
  const data = JSON.parse(text)
  const list = Array.isArray(data) ? data : data?.keywords
  if (!Array.isArray(list)) {
    throw new Error('KEYWORD_COLUMN_MISSING')
  }
  return list
    .map((item: any): ParsedRow | null => {
      if (typeof item === 'string') return { keyword: item.trim() }
      const keyword = String(item?.keyword ?? item?.['키워드'] ?? '').trim()
      if (!keyword) return null
      return {
        keyword,
        searchVolume: toNumber(item.searchVolume ?? item['검색량']),
        productCount: toNumber(item.productCount ?? item['상품수']),
        category: item.category ?? item['카테고리'] ?? undefined,
        adCost: toNumber(item.adCost ?? item['광고비']),
      }
    })
    .filter((row): row is ParsedRow => row !== null && row.keyword.length > 0)
}

const CLASSIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          keyword: { type: 'string' },
          classification: { type: 'string', enum: ['유지', '제외', '확인필요'] },
          note: { type: 'string' },
        },
        required: ['keyword', 'classification'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
} as const

export const POST = async (request: Request) => {
  try {
    await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let rows: ParsedRow[]
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: '파일이 첨부되지 않았습니다.' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일 크기는 최대 10MB까지 가능합니다.' }, { status: 400 })
    }

    const name = file.name.toLowerCase()
    if (name.endsWith('.json')) {
      rows = parseJson(await file.text())
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      rows = await parseExcel(await file.arrayBuffer())
    } else {
      return NextResponse.json({ error: '지원하지 않는 파일 형식입니다. (.xlsx, .xls, .json)' }, { status: 400 })
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'KEYWORD_COLUMN_MISSING') {
      return NextResponse.json({ error: '필수 컬럼(키워드)을 찾을 수 없습니다.' }, { status: 400 })
    }
    return NextResponse.json({ error: '파일을 읽을 수 없습니다. 형식을 확인해주세요.' }, { status: 400 })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: '분석할 키워드가 없습니다.' }, { status: 400 })
  }

  const truncated = rows.length > MAX_KEYWORDS
  const targetRows = rows.slice(0, MAX_KEYWORDS)

  try {
    const client = getAnthropicClient()
    const keywordList = targetRows
      .map((row) => {
        const meta = [
          row.searchVolume !== undefined ? `검색량 ${row.searchVolume}` : null,
          row.productCount !== undefined ? `상품수 ${row.productCount}` : null,
          row.category ? `카테고리 ${row.category}` : null,
          row.adCost !== undefined ? `광고비 ${row.adCost}` : null,
        ].filter(Boolean)
        return meta.length > 0 ? `${row.keyword} (${meta.join(', ')})` : row.keyword
      })
      .join('\n')

    const stream = client.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: 64000,
      thinking: { type: 'adaptive' },
      system:
        '당신은 이커머스 광고 키워드 분석 전문가입니다. 주어진 키워드 목록을 광고 캠페인 적합성 기준으로 분류합니다. ' +
        '분류 기준: "유지"는 구매 의도가 명확하고 광고 효율이 기대되는 키워드, ' +
        '"제외"는 브랜드와 무관하거나 구매 의도가 낮은 키워드(중고, 무료, 경쟁사 등), ' +
        '"확인필요"는 맥락에 따라 판단이 갈리는 키워드입니다. ' +
        '제외/확인필요로 분류한 키워드에는 짧은 한국어 사유를 note에 작성하세요. ' +
        '입력된 모든 키워드를 빠짐없이 결과에 포함해야 합니다.',
      messages: [
        {
          role: 'user',
          content: `다음 키워드 목록을 분류해주세요:\n\n${keywordList}`,
        },
      ],
      output_config: {
        format: { type: 'json_schema', schema: CLASSIFICATION_SCHEMA },
      },
    })

    const message = await stream.finalMessage()
    const textBlock = message.content.find((b) => b.type === 'text')
    const parsed = JSON.parse(textBlock && 'text' in textBlock ? textBlock.text : '{}') as {
      results: { keyword: string; classification: '유지' | '제외' | '확인필요'; note?: string }[]
    }

    const classificationMap = new Map(parsed.results.map((r) => [r.keyword, r]))
    const results = targetRows.map((row) => {
      const match = classificationMap.get(row.keyword)
      return {
        ...row,
        classification: match?.classification ?? '확인필요',
        customerNote: match?.note,
      }
    })

    return NextResponse.json({
      results,
      truncated,
      totalUploaded: rows.length,
      analyzed: targetRows.length,
    })
  } catch (error) {
    const mapped = anthropicErrorResponse(error)
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status })
    }
    console.error('keyword analysis error:', error)
    return NextResponse.json({ error: '키워드 분석 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
