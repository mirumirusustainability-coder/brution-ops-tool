import { NextResponse } from 'next/server'
import { requireAuth, isStaff } from '@/lib/supabase/auth'
import { getAnthropicClient, anthropicErrorResponse, ANTHROPIC_MODEL } from '@/lib/anthropic'

export const maxDuration = 300

const STRATEGIES = ['order_fixed', 'weight_based', 'position_aware'] as const

const NAMING_SCHEMA = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          strategy: { type: 'string', enum: [...STRATEGIES] },
          score: { type: 'integer' },
          reason: { type: 'string' },
        },
        required: ['title', 'strategy', 'score', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['candidates'],
  additionalProperties: false,
} as const

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

  let body: {
    mainKeyword?: string
    features?: string
    differentiators?: string
    target?: string
    brand?: string
    category?: string
    forbiddenWords?: string
    requiredWords?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const mainKeyword = body.mainKeyword?.trim()
  const features = body.features?.trim()
  const differentiators = body.differentiators?.trim()
  const target = body.target?.trim()

  if (!mainKeyword || !features || !differentiators || !target) {
    return NextResponse.json(
      { error: '메인 키워드, 제품 기능, 차별점, 타깃 고객을 모두 입력해주세요.' },
      { status: 400 }
    )
  }

  const brand = body.brand?.trim()
  const category = body.category?.trim()
  const forbiddenWords = body.forbiddenWords?.trim()
  const requiredWords = body.requiredWords?.trim()

  try {
    const client = getAnthropicClient()
    const inputLines = [
      `메인 키워드(네이버 검색 기준): ${mainKeyword}`,
      brand ? `브랜드: ${brand}` : null,
      category ? `카테고리: ${category}` : null,
      `제품 기능: ${features}`,
      `차별점: ${differentiators}`,
      `타깃 고객: ${target}`,
      forbiddenWords ? `금지어(절대 포함 금지): ${forbiddenWords}` : null,
      requiredWords ? `필수어(모든 후보에 포함): ${requiredWords}` : null,
    ].filter(Boolean)

    const stream = client.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      system:
        '당신은 네이버 쇼핑 SEO에 정통한 상품명 최적화 전문가입니다. ' +
        '검색 노출과 클릭률을 동시에 잡는 상품명 후보를 생성합니다.\n\n' +
        '[네이버 쇼핑 상품명 규칙 — 반드시 준수]\n' +
        '- 공백 포함 50자 이내. 모바일 목록에서는 앞 25자만 노출되므로 핵심 키워드는 앞부분에 배치\n' +
        '- 기본 구조: 브랜드 + 핵심 키워드 + 속성(기능/사이즈/수량) 순서가 표준\n' +
        '- 동일 키워드 반복 금지(어뷰징 판정), 특수문자·이모지·괄호 남용 금지\n' +
        '- 과장 표현(최고, 1위, 100% 등 근거 없는 단정) 금지\n' +
        '- 금지어가 주어지면 절대 포함하지 말고, 필수어는 모든 후보에 포함\n\n' +
        '[생성 전략 — 3가지, 각 전략당 3개씩 총 9개]\n' +
        '1. order_fixed (순서고정형): 메인 키워드의 어순을 그대로 유지하고 상품명 맨 앞쪽에 배치. 검색 정확도 최우선\n' +
        '2. weight_based (가중치형): 검색 수요가 높을 핵심 토큰들을 앞 1/3 구간에 집중 배치. 노출 가중치 최우선\n' +
        '3. position_aware (위치최적형): 앞(브랜드+메인 키워드) / 중간(속성·기능) / 뒤(타깃·용도)로 균형 배치. 가독성과 클릭률 최우선\n\n' +
        '[평가]\n' +
        '각 후보에 0~100점의 score를 매기세요. 기준: 키워드 배치 적합도 40점 + 가독성/클릭 유도 30점 + 차별성 30점. ' +
        'reason에는 점수 근거를 한 문장으로 작성하세요. 같은 전략 내에서도 서로 다른 각도의 후보를 만드세요.',
      messages: [
        {
          role: 'user',
          content: inputLines.join('\n'),
        },
      ],
      output_config: {
        format: { type: 'json_schema', schema: NAMING_SCHEMA },
      },
    })

    const message = await stream.finalMessage()
    const textBlock = message.content.find((b) => b.type === 'text')
    const parsed = JSON.parse(textBlock && 'text' in textBlock ? textBlock.text : '{}') as {
      candidates: {
        title: string
        strategy: (typeof STRATEGIES)[number]
        score: number
        reason: string
      }[]
    }

    const candidates = parsed.candidates
      .map((c, index) => ({
        id: `name-${index}`,
        title: c.title,
        strategy: c.strategy,
        score: Math.max(0, Math.min(100, c.score)),
        reason: c.reason,
      }))
      .sort((a, b) => b.score - a.score)

    return NextResponse.json({ candidates })
  } catch (error) {
    const mapped = anthropicErrorResponse(error)
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status })
    }
    console.error('naming generation error:', error)
    return NextResponse.json({ error: '상품명 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
