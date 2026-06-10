import { NextResponse } from 'next/server'
import { requireAuth, isStaff } from '@/lib/supabase/auth'
import { createSupabaseAdmin } from '@/lib/supabase/server'
import { anthropicErrorResponse } from '@/lib/anthropic'
import { runNamingEngine, RawRelated, DevCode } from '@/lib/naming-engine'
import {
  getRelatedKeywordVolumes,
  getProductCount,
  getDominantCategory,
  hasShoppingApi,
  hasSearchAdApi,
} from '@/lib/naver'

export const maxDuration = 300

const RELATED_LIMIT = 25

export const POST = async (request: Request) => {
  let userId: string
  let companyId: string | null
  let role: string
  try {
    const { profile } = await requireAuth(request)
    userId = profile.user_id
    companyId = profile.company_id
    role = profile.role
  } catch {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  if (!isStaff(role as any)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  let body: { mainKeyword?: string; consent?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  if (body.consent !== true) {
    return NextResponse.json(
      { error: '네이버 데이터 수집 동의가 필요합니다.', requiresConsent: true },
      { status: 403 }
    )
  }

  const mainKeyword = body.mainKeyword?.trim()
  if (!mainKeyword) {
    return NextResponse.json({ error: '메인 키워드를 입력해주세요.' }, { status: 400 })
  }

  if (!hasShoppingApi() || !hasSearchAdApi()) {
    return NextResponse.json(
      {
        error:
          '네이버 연동 상품명 생성에는 쇼핑 검색 API와 검색광고 API 키가 모두 필요합니다. .env.local을 확인해주세요.',
      },
      { status: 500 }
    )
  }

  // 동의/수집 이력 기록 (best-effort)
  try {
    const admin = createSupabaseAdmin()
    await admin.from('audit_logs').insert({
      company_id: companyId,
      user_id: userId,
      action: 'naver_naming_generation',
      target_type: 'keyword',
      metadata: {
        keyword: mainKeyword,
        consent: true,
        consented_at: new Date().toISOString(),
        source: 'naver_official_api',
      },
    })
  } catch (e) {
    console.error('audit log insert failed:', e)
  }

  // 1) 검색광고 API → 연관 키워드 + 조회수
  let relatedVolumes
  try {
    relatedVolumes = await getRelatedKeywordVolumes(mainKeyword, RELATED_LIMIT)
  } catch (error) {
    console.error('related keyword fetch error:', error)
    return NextResponse.json(
      { error: '네이버 연관 키워드 조회에 실패했습니다. 검색광고 API를 확인해주세요.' },
      { status: 502 }
    )
  }

  if (relatedVolumes.length === 0) {
    return NextResponse.json(
      { error: '해당 키워드의 연관 검색어를 찾을 수 없습니다.' },
      { status: 400 }
    )
  }

  // 2) 쇼핑 검색 API → 각 키워드의 상품수 (병렬)
  const counts = await Promise.all(
    relatedVolumes.map(async (rv) => ({
      keyword: rv.keyword,
      searchVolume: rv.searchVolume,
      productCount: await getProductCount(rv.keyword),
    }))
  )

  const rawRelated: RawRelated[] = counts
    .filter((c): c is { keyword: string; searchVolume: number; productCount: number } => c.productCount !== null)
    .map((c) => ({ keyword: c.keyword, searchVolume: c.searchVolume, productCount: c.productCount }))

  if (rawRelated.length === 0) {
    return NextResponse.json(
      { error: '상품수 데이터를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 502 }
    )
  }

  // 3) 대표 카테고리
  const category = await getDominantCategory(mainKeyword)
  const dev: DevCode = {
    categories: category ? [category] : [],
    attributes: [],
    tags: [],
    productNames: [],
  }

  // 4) 엔진 실행
  try {
    const result = await runNamingEngine(rawRelated, dev, mainKeyword)
    return NextResponse.json({ ...result, sourceCount: rawRelated.length })
  } catch (error) {
    const mapped = anthropicErrorResponse(error)
    if (mapped) {
      return NextResponse.json(mapped.body, { status: mapped.status })
    }
    console.error('naming-naver error:', error)
    return NextResponse.json({ error: '상품명 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
