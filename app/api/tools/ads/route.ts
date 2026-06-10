import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth'
import { getAnthropicClient, anthropicErrorResponse, ANTHROPIC_MODEL } from '@/lib/anthropic'

export const maxDuration = 300

const AD_TYPES = ['headline', 'body', 'hook', 'cta', 'creative'] as const

const ADS_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: [...AD_TYPES] },
          content: { type: 'string' },
        },
        required: ['type', 'content'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const

export const POST = async (request: Request) => {
  try {
    await requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: { campaignName?: string; targetAudience?: string; productFeatures?: string; count?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const campaignName = body.campaignName?.trim()
  const targetAudience = body.targetAudience?.trim()
  const productFeatures = body.productFeatures?.trim()
  const count = body.count === 10 ? 10 : 20

  if (!campaignName || !targetAudience || !productFeatures) {
    return NextResponse.json({ error: '캠페인명, 타겟 고객, 제품 특징을 모두 입력해주세요.' }, { status: 400 })
  }

  try {
    const client = getAnthropicClient()
    const stream = client.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: 64000,
      thinking: { type: 'adaptive' },
      system:
        '당신은 한국 이커머스 시장에 정통한 퍼포먼스 마케팅 카피라이터입니다. ' +
        '주어진 캠페인 정보를 바탕으로 광고 소재를 생성합니다. ' +
        '항목 타입: headline(짧고 임팩트 있는 헤드라인), body(2~3문장의 본문 카피), ' +
        'hook(스크롤을 멈추게 하는 후킹 메시지), cta(행동 유도 문구), creative(광고 소재/비주얼 아이디어). ' +
        '톤은 트렌디하고 자연스러운 한국어로, 과장 광고 표현(최고, 1위, 100% 등 근거 없는 단정)은 피하세요. ' +
        '각 타입마다 정확히 요청된 개수만큼 생성하고, 서로 중복되지 않게 다양한 각도로 작성하세요.',
      messages: [
        {
          role: 'user',
          content:
            `캠페인명: ${campaignName}\n` +
            `타겟 고객: ${targetAudience}\n` +
            `제품 특징: ${productFeatures}\n\n` +
            `headline, body, hook, cta, creative 각 타입별로 ${count}개씩 생성해주세요.`,
        },
      ],
      output_config: {
        format: { type: 'json_schema', schema: ADS_SCHEMA },
      },
    })

    const message = await stream.finalMessage()
    const textBlock = message.content.find((b) => b.type === 'text')
    const parsed = JSON.parse(textBlock && 'text' in textBlock ? textBlock.text : '{}') as {
      items: { type: (typeof AD_TYPES)[number]; content: string }[]
    }

    const items = parsed.items.map((item, index) => ({
      id: `ad-${Date.now()}-${index}`,
      type: item.type,
      content: item.content,
      status: '보류' as const,
    }))

    return NextResponse.json({ items })
  } catch (error) {
    const mapped = anthropicErrorResponse(error)
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status })
    }
    console.error('ads generation error:', error)
    return NextResponse.json({ error: '광고 문구 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
