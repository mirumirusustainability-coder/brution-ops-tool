import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/supabase/auth'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import {
  searchNaverShopping,
  getSearchVolume,
  hasShoppingApi,
  hasSearchAdApi,
} from '@/lib/naver'

export const maxDuration = 60

export const POST = async (request: Request) => {
  let userId: string
  let companyId: string | null
  try {
    const { profile } = await requireAuth(request)
    userId = profile.user_id
    companyId = profile.company_id
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: { keyword?: string; consent?: boolean; includeVolume?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  // 동의 게이트 — 고객사가 데이터 수집에 동의해야만 진행
  if (body.consent !== true) {
    return NextResponse.json(
      { error: '네이버 데이터 수집 동의가 필요합니다.', requiresConsent: true },
      { status: 403 }
    )
  }

  const keyword = body.keyword?.trim()
  if (!keyword) {
    return NextResponse.json({ error: '검색할 키워드를 입력해주세요.' }, { status: 400 })
  }

  if (!hasShoppingApi()) {
    return NextResponse.json(
      {
        error:
          '네이버 쇼핑 검색 API 키가 설정되지 않았습니다. .env.local에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET를 추가해주세요.',
      },
      { status: 500 }
    )
  }

  // 동의 이력 audit_logs 기록 (best-effort)
  try {
    const admin = createSupabaseAdmin()
    await admin.from('audit_logs').insert({
      company_id: companyId,
      user_id: userId,
      action: 'naver_data_collection',
      target_type: 'keyword',
      metadata: {
        keyword,
        consent: true,
        consented_at: new Date().toISOString(),
        source: 'naver_official_api',
      },
    })
  } catch (e) {
    console.error('audit log insert failed:', e)
  }

  try {
    const products = await searchNaverShopping(keyword, 40)

    let volume = null
    let volumeError: string | null = null
    if (body.includeVolume !== false && hasSearchAdApi()) {
      try {
        const volumes = await getSearchVolume([keyword])
        volume = volumes[0] ?? null
      } catch (e) {
        volumeError = '검색량 조회에 실패했습니다 (검색광고 API 확인 필요).'
        console.error('search volume error:', e)
      }
    }

    return NextResponse.json({
      keyword,
      products,
      productCount: products.length,
      volume,
      volumeAvailable: hasSearchAdApi(),
      volumeError,
    })
  } catch (error) {
    console.error('naver collection error:', error)
    const message = error instanceof Error ? error.message : ''
    if (message.startsWith('NAVER_SHOPPING_401') || message.startsWith('NAVER_SHOPPING_403')) {
      return NextResponse.json(
        { error: '네이버 쇼핑 API 인증에 실패했습니다. 클라이언트 ID/시크릿을 확인해주세요.' },
        { status: 502 }
      )
    }
    if (message.startsWith('NAVER_SHOPPING_429')) {
      return NextResponse.json(
        { error: '네이버 API 일일 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      )
    }
    return NextResponse.json({ error: '네이버 데이터 수집 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
