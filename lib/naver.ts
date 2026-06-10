import crypto from 'crypto'

/**
 * 네이버 공식 API 클라이언트.
 *
 * 데이터 수집은 두 가지 공식 경로만 사용한다 (HTML 크롤링/팝업 우회 미사용):
 *  1) 네이버 쇼핑 검색 API (developers.naver.com OpenAPI) — 상품 목록
 *  2) 네이버 검색광고 API (searchad.naver.com) — 월간 검색량/경쟁도
 *
 * 두 경로 모두 약관상 허용된 공개 API이므로 차단·법적 리스크가 없다.
 */

export type NaverProduct = {
  rank: number
  productName: string
  brand: string
  maker: string
  category: string
  mallName: string
  price: number | null
  productType: string
  link: string
}

export type NaverVolume = {
  keyword: string
  monthlyPcCount: number
  monthlyMobileCount: number
  monthlyTotalCount: number
  competition: string // '높음' | '중간' | '낮음'
}

const stripTags = (s: string) => s.replace(/<\/?b>/g, '').replace(/&[a-z]+;/g, ' ').trim()

const toNumber = (s: unknown): number | null => {
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

export const hasShoppingApi = () =>
  Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET)

export const hasSearchAdApi = () =>
  Boolean(
    process.env.NAVER_AD_API_KEY &&
      process.env.NAVER_AD_SECRET_KEY &&
      process.env.NAVER_AD_CUSTOMER_ID
  )

/** 네이버 쇼핑 검색 API — 키워드에 대한 상위 상품 목록 */
export const searchNaverShopping = async (
  keyword: string,
  display = 40
): Promise<NaverProduct[]> => {
  const url = new URL('https://openapi.naver.com/v1/search/shop.json')
  url.searchParams.set('query', keyword)
  url.searchParams.set('display', String(Math.min(Math.max(display, 1), 100)))
  url.searchParams.set('sort', 'sim') // 정확도순

  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`NAVER_SHOPPING_${res.status}: ${text.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    items?: {
      title: string
      link: string
      lprice: string
      mallName: string
      productType: string
      brand: string
      maker: string
      category1: string
      category2: string
      category3: string
      category4: string
    }[]
  }

  return (data.items ?? []).map((item, index) => ({
    rank: index + 1,
    productName: stripTags(item.title),
    brand: item.brand || '',
    maker: item.maker || '',
    category: [item.category1, item.category2, item.category3, item.category4]
      .filter(Boolean)
      .join(' > '),
    mallName: item.mallName || '',
    price: toNumber(item.lprice),
    productType: item.productType || '',
    link: item.link || '',
  }))
}

/** 네이버 검색광고 API — 키워드 월간 검색량 (HMAC-SHA256 서명) */
export const getSearchVolume = async (keywords: string[]): Promise<NaverVolume[]> => {
  if (keywords.length === 0) return []

  const apiKey = process.env.NAVER_AD_API_KEY!
  const secretKey = process.env.NAVER_AD_SECRET_KEY!
  const customerId = process.env.NAVER_AD_CUSTOMER_ID!

  const timestamp = String(Date.now())
  const method = 'GET'
  const path = '/keywordstool'
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(`${timestamp}.${method}.${path}`)
    .digest('base64')

  // 검색광고 API는 hintKeywords에 공백 제거된 키워드를 콤마로 (최대 5개)
  const hintKeywords = keywords
    .slice(0, 5)
    .map((k) => k.replace(/\s/g, ''))
    .join(',')

  const url = new URL(`https://api.naver.com${path}`)
  url.searchParams.set('hintKeywords', hintKeywords)
  url.searchParams.set('showDetail', '1')

  const res = await fetch(url, {
    headers: {
      'X-Timestamp': timestamp,
      'X-API-KEY': apiKey,
      'X-Customer': customerId,
      'X-Signature': signature,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`NAVER_SEARCHAD_${res.status}: ${text.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    keywordList?: {
      relKeyword: string
      monthlyPcQcCnt: string | number
      monthlyMobileQcCnt: string | number
      compIdx: string
    }[]
  }

  const parseCount = (v: string | number) => {
    // 검색광고 API는 10 미만일 때 "< 10" 문자열 반환
    if (typeof v === 'number') return v
    if (v.includes('<')) return 5
    return Number(v.replace(/,/g, '')) || 0
  }

  return (data.keywordList ?? []).slice(0, 20).map((item) => {
    const pc = parseCount(item.monthlyPcQcCnt)
    const mobile = parseCount(item.monthlyMobileQcCnt)
    return {
      keyword: item.relKeyword,
      monthlyPcCount: pc,
      monthlyMobileCount: mobile,
      monthlyTotalCount: pc + mobile,
      competition: item.compIdx || '-',
    }
  })
}
