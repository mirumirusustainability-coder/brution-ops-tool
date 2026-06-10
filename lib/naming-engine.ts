import { getAnthropicClient, ANTHROPIC_MODEL } from './anthropic'

/**
 * 상품명 생성 엔진 (KP1 v3.3 / MODULE 1).
 * 숫자 계산(경쟁강도·정렬·TOP15)은 결정론적으로, 판단(필터링·조합)은 Claude로 분리한다.
 * 엑셀 업로드 / 네이버 API 양쪽 입력원이 동일하게 사용한다.
 */

export type RawRelated = {
  keyword: string
  searchVolume: number
  productCount: number
}

export type DevCode = {
  categories: string[]
  attributes: string[]
  tags: string[]
  productNames: string[]
}

export type TopKeyword = {
  keyword: string
  searchVolume: number
  productCount: number
  competition: number
}

export type NamingResult = {
  mainKeyword: string
  categorySummary: string
  tags: string[]
  top: TopKeyword[]
  productNames: { title: string; usedKeywords: string[] }[]
  stats: { totalRows: number; excluded: number; topCount: number }
}

const TOP_LIMIT = 15
const CANDIDATE_LIMIT = 40

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

export const runNamingEngine = async (
  rawRelated: RawRelated[],
  dev: DevCode,
  mainKeywordInput: string
): Promise<NamingResult> => {
  // 결정론적: 경쟁강도 계산 + Fail-Closed 필터
  const related = rawRelated
    .filter((r) => r.keyword && r.searchVolume > 0 && r.productCount >= 0)
    .map((r) => ({ ...r, competition: r.productCount / r.searchVolume }))

  if (related.length === 0) {
    throw new Error('NO_VALID_KEYWORDS')
  }

  // 경쟁강도 낮은 순 → 상품수 적은 순
  const sorted = [...related].sort((a, b) => {
    if (a.competition !== b.competition) return a.competition - b.competition
    return a.productCount - b.productCount
  })
  const candidates = sorted.slice(0, CANDIDATE_LIMIT)
  const allKeywordSet = new Set(related.map((r) => r.keyword))

  const client = getAnthropicClient()
  const candidateBlock = candidates.map((r, i) => `${i + 1}. ${r.keyword}`).join('\n')
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
  const top: TopKeyword[] = finalRanked.slice(0, TOP_LIMIT).map((r) => ({
    keyword: r.keyword,
    searchVolume: r.searchVolume,
    productCount: r.productCount,
    competition: Number(r.competition.toFixed(3)),
  }))
  const topKeywordSet = new Set(top.map((t) => t.keyword))
  const resolvedMain = (parsed.mainKeyword || mainKeywordInput || '').trim()

  // 상품명 키워드 검증: 표/메인키워드/원문에 존재하는 것만 유지
  const productNames = parsed.productNames.slice(0, 5).map((p) => ({
    title: p.title,
    usedKeywords: p.usedKeywords.filter(
      (k) => topKeywordSet.has(k) || k === resolvedMain || allKeywordSet.has(k)
    ),
  }))

  return {
    mainKeyword: resolvedMain,
    categorySummary: parsed.categorySummary,
    tags: parsed.tags.slice(0, 10),
    top,
    productNames,
    stats: { totalRows: related.length, excluded: excludedSet.size, topCount: top.length },
  }
}
