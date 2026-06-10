import { NextResponse } from 'next/server'
import { requireAuth, isStaff } from '@/lib/supabase/auth'
import { getAnthropicClient, anthropicErrorResponse, ANTHROPIC_MODEL } from '@/lib/anthropic'

export const maxDuration = 300

const NAMING_SCHEMA = {
  type: 'object',
  properties: {
    names: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['names'],
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
    features?: string
    differentiators?: string
    target?: string
    forbiddenWords?: string
    requiredWords?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const features = body.features?.trim()
  const differentiators = body.differentiators?.trim()
  const target = body.target?.trim()

  if (!features || !differentiators || !target) {
    return NextResponse.json({ error: '제품 기능, 차별점, 타깃 고객을 모두 입력해주세요.' }, { status: 400 })
  }

  const forbiddenWords = body.forbiddenWords?.trim()
  const requiredWords = body.requiredWords?.trim()

  try {
    const client = getAnthropicClient()
    const constraints = [
      forbiddenWords ? `금지어(절대 포함 금지): ${forbiddenWords}` : null,
      requiredWords ? `필수어(반드시 포함): ${requiredWords}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const stream = client.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system:
        '당신은 한국 이커머스 상품명 네이밍 전문가입니다. ' +
        '제품 정보를 바탕으로 기억하기 쉽고 검색 노출에 유리한 상품명 후보를 10개 생성합니다. ' +
        '한국어 기준 4~12자 내외의 간결한 이름으로, 발음하기 쉽고 제품 특성이 드러나야 합니다. ' +
        '금지어가 주어지면 해당 단어를 절대 포함하지 말고, 필수어가 주어지면 모든 후보에 포함하세요. ' +
        '서로 결이 다른 다양한 방향(기능 강조형, 감성형, 합성어형 등)으로 제안하세요.',
      messages: [
        {
          role: 'user',
          content:
            `제품 기능: ${features}\n` +
            `차별점: ${differentiators}\n` +
            `타깃 고객: ${target}` +
            (constraints ? `\n${constraints}` : ''),
        },
      ],
      output_config: {
        format: { type: 'json_schema', schema: NAMING_SCHEMA },
      },
    })

    const message = await stream.finalMessage()
    const textBlock = message.content.find((b) => b.type === 'text')
    const parsed = JSON.parse(textBlock && 'text' in textBlock ? textBlock.text : '{}') as {
      names: string[]
    }

    return NextResponse.json({ names: parsed.names })
  } catch (error) {
    const mapped = anthropicErrorResponse(error)
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status })
    }
    console.error('naming generation error:', error)
    return NextResponse.json({ error: '상품명 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
