import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { requireAuth, isStaff } from '@/lib/supabase/auth'
import { getAnthropicClient, anthropicErrorResponse, ANTHROPIC_MODEL } from '@/lib/anthropic'

export const maxDuration = 300

const MAX_FILE_SIZE = 10 * 1024 * 1024
const TOP_LIMIT = 15
const CANDIDATE_LIMIT = 40 // LLM에 전달할 후보 상한
const MAX_PRODUCT_NAMES_INPUT = 60

type RelatedRow = {
  keyword: string
  searchVolume: number
  productCount: number
  competition: number // 상품수 ÷ 조회수 (재계산)
}

type DevCode = {
  categories: string[]
  attributes: string[]
  tags: string[]
  productNames: string[]
}

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

// 연관검색어 시트 컬럼 별칭 (고정 바인딩)
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

const parseRelatedSheet = (sheet: ExcelJS.Worksheet): RelatedRow[] => {
  const header = sheet.getRow(1)
  const kwCol = findHeaderColumn(header, KEYWORD_HEADERS)
  const volCol = findHeaderColumn(header, VOLUME_HEADERS)
  const prodCol = findHeaderColumn(header, PRODUCT_HEADERS)

  if (!kwCol || !volCol || !prodCol) {
    throw new Error('RELATED_COLUMNS_MISSING')
  }

  const rows: RelatedRow[] = []
  const seen = new Set<string>()
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const keyword = cellText(row.getCell(kwCol).value)
    const searchVolume = toNumber(row.getCell(volCol).value)
    const productCount = toNumber(row.getCell(prodCol).value)

    // Fail-Closed: 값 누락/불명확 행 제외
    if (!keyword) return
    if (searchVolume === null || searchVolume <= 0) return
    if (productCount === null || productCount < 0) return
    if (seen.has(keyword)) return
    seen.add(keyword)

    rows.push({
      keyword,
      searchVolume,
      productCount,
      competition: productCount / searchVolume,
    })
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

// 시트 역할 자동 인식 (시트명 + 헤더 기반)
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

const ENGINE_SCHEMA = {
  type: 'object',
  properties: {
    mainKeyword: { type: 'string' },
    categorySummary: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    excludedKeywords: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          keyword: { type: 'string' },
          reason: { type: 'string', enum: ['brand', 'informational', 'off_category', 'unrelated'] },
        },
        required: ['keyword', 'reason'],
        additionalProperties: false,
      },
    },
    productNames: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          usedKeywords: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'usedKeywords'],
        additionalProperties: false,
      },
    },
  },
  required: ['mainKeyword', 'categorySummary', 'tags', 'excludedKeywords', 'productNames'],
  additionalProperties: false,
} as const

const SYSTEM_PROMPT = `당신은 네이버 스마트스토어 상품명 생성 엔진이다. 아래 규칙(KP1 v3.3)을 그대로 적용한다.

[데이터 무결성 — 절대 준수]
- 제공된 "연관검색어 후보"에 실제 존재하는 키워드 원문만 사용한다. 키워드를 새로 만들거나 변형·유추하지 않는다.
- 숫자(조회수/상품수/경쟁강도)는 절대 언급하거나 가공하지 않는다. 숫자 계산은 시스템이 별도로 처리한다.
- 판단이 불가능하면 추론하지 말고 제외한다(Fail-Closed). 개수를 채우기 위해 키워드를 추가하지 않는다.

[1단계 — 공략 후보 필터링]
다음에 해당하는 키워드를 excludedKeywords에 분류한다(이유 코드 포함):
- brand: 브랜드/모델명/상표 패턴(고유명사+제품, 영문+숫자 조합 등). 단 욕실/미니/소형/가정용/사무실/전기/벽걸이/이동식/캠핑/난방 같은 일반 속성어는 브랜드가 아니다. 애매하면 유지(과제외 금지).
- informational: 정보성·비구매 의도(전기세/요금/사용법/후기/수리/고장 등).
- off_category: 개발자코드의 카테고리/속성과 명백히 다른 제품군.
- unrelated: 메인키워드와 텍스트상 연관성이 전혀 없는 키워드.

[2단계 — 메인키워드]
- 사용자가 메인키워드를 지정하면 그대로 사용한다. "자동"이면 후보 중 가장 대표성 있는 키워드를 메인으로 선정해 mainKeyword에 넣는다.

[3단계 — 상품명 5개 조합]
- 정확히 5개의 상품명을 생성한다.
- 각 상품명은 공략 후보(제외되지 않은 키워드) 중 최소 5개 이상의 키워드/구문을 조합한다.
- 구조: [서브]+[서브]+[메인]+[서브]+[서브] 형태를 기본으로 하되 메인 위치는 유연하게 한다.
- 동일 단어/동일 의미 토큰은 최대 2회까지만 사용한다(메인키워드는 유입 확장 목적의 2회 재사용 허용).
- 기존 상품명(개발자코드)의 키워드 배열·위치 패턴을 존중하되, 키워드 나열이 아닌 브랜드 카탈로그명은 분해하지 않는다.
- usedKeywords에는 그 상품명에 실제 사용한 "연관검색어 후보의 원문 키워드"만 넣는다(메인키워드 포함 가능).

[4단계 — 상품 정보]
- categorySummary: 개발자코드 카테고리를 한 줄로 요약.
- tags: 공략 후보와 속성을 바탕으로 정확히 10개의 태그를 생성한다(상품명에 사용한 키워드와 중복 가능).

설명·이유·전략·내부 용어는 출력하지 않는다. 결과 데이터만 스키마에 맞춰 반환한다.`

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

  let related: RelatedRow[]
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

  // 결정론적 정렬: 경쟁강도 낮은 순 → 상품수 적은 순
  const sorted = [...related].sort((a, b) => {
    if (a.competition !== b.competition) return a.competition - b.competition
    return a.productCount - b.productCount
  })

  const candidates = sorted.slice(0, CANDIDATE_LIMIT)
  const allKeywordSet = new Set(related.map((r) => r.keyword))

  try {
    const client = getAnthropicClient()

    const candidateBlock = candidates
      .map((r, i) => `${i + 1}. ${r.keyword}`)
      .join('\n')
    const devBlock = [
      dev.categories.length ? `카테고리: ${dev.categories.slice(0, 10).join(', ')}` : null,
      dev.attributes.length ? `속성: ${dev.attributes.slice(0, 20).join(', ')}` : null,
      dev.tags.length ? `태그: ${dev.tags.slice(0, 30).join(', ')}` : null,
      dev.productNames.length
        ? `기존 상품명(${dev.productNames.length}개):\n${dev.productNames.slice(0, 40).map((n) => `- ${n}`).join('\n')}`
        : '기존 상품명 데이터 없음',
    ]
      .filter(Boolean)
      .join('\n')

    const stream = client.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content:
            `메인키워드: ${mainKeywordInput || '자동'}\n\n` +
            `[연관검색어 후보 — 경쟁강도 낮은 순으로 정렬됨]\n${candidateBlock}\n\n` +
            `[개발자코드]\n${devBlock}`,
        },
      ],
      output_config: { format: { type: 'json_schema', schema: ENGINE_SCHEMA } },
    })

    const message = await stream.finalMessage()
    const textBlock = message.content.find((b) => b.type === 'text')
    const parsed = JSON.parse(textBlock && 'text' in textBlock ? textBlock.text : '{}') as {
      mainKeyword: string
      categorySummary: string
      tags: string[]
      excludedKeywords: { keyword: string; reason: string }[]
      productNames: { title: string; usedKeywords: string[] }[]
    }

    // 결정론적 재계산: 제외 적용 → TOP15 (채우기 없음)
    const excludedSet = new Set(parsed.excludedKeywords.map((e) => e.keyword))
    const finalRanked = sorted.filter((r) => !excludedSet.has(r.keyword))
    const top = finalRanked.slice(0, TOP_LIMIT).map((r) => ({
      keyword: r.keyword,
      searchVolume: r.searchVolume,
      productCount: r.productCount,
      competition: Number(r.competition.toFixed(3)),
    }))
    const topKeywordSet = new Set(top.map((t) => t.keyword))
    const resolvedMain = (parsed.mainKeyword || mainKeywordInput || '').trim()

    // 상품명 키워드 검증: 표(TOP15) 또는 메인키워드에 존재하는 원문만 유지
    const productNames = parsed.productNames.slice(0, 5).map((p) => ({
      title: p.title,
      usedKeywords: p.usedKeywords.filter(
        (k) => topKeywordSet.has(k) || k === resolvedMain || allKeywordSet.has(k)
      ),
    }))

    return NextResponse.json({
      mainKeyword: resolvedMain,
      categorySummary: parsed.categorySummary,
      tags: parsed.tags.slice(0, 10),
      top,
      productNames,
      stats: {
        totalRows: related.length,
        excluded: excludedSet.size,
        topCount: top.length,
      },
    })
  } catch (error) {
    const mapped = anthropicErrorResponse(error)
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status })
    }
    console.error('naming-excel error:', error)
    return NextResponse.json({ error: '상품명 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
