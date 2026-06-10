import Anthropic from '@anthropic-ai/sdk'

export const ANTHROPIC_MODEL = 'claude-opus-4-8'

export const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY_MISSING')
  }
  return new Anthropic({ apiKey })
}

export const anthropicErrorResponse = (error: unknown) => {
  if (error instanceof Error && error.message === 'ANTHROPIC_API_KEY_MISSING') {
    return {
      status: 500,
      body: { error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local에 키를 추가해주세요.' },
    }
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return { status: 500, body: { error: 'Claude API 키가 유효하지 않습니다.' } }
  }
  if (error instanceof Anthropic.RateLimitError) {
    return { status: 429, body: { error: '요청이 많아 잠시 후 다시 시도해주세요.' } }
  }
  if (error instanceof Anthropic.APIError) {
    return { status: 502, body: { error: `Claude API 오류 (${error.status})` } }
  }
  return null
}
