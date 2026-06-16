import { DeliverableType, VersionStatus } from '@/types'

export const DELIVERABLE_TYPE_LABELS: Record<DeliverableType, string> = {
  keyword_report: '키워드 분석 리포트',
  competitor_report: '경쟁사 분석 리포트',
  sample_analysis: '샘플 분석',
  brand_identity: '브랜드 아이덴티티 제안서',
  market_research: '시장조사 리포트',
  product_candidate: '제품 후보 확정서',
  product_design: '제품 디자인 시안',
  packaging_design: '패키징 디자인 시안',
  certification: '인증 서류',
  quotation: '견적/비용 청구',
  qc_report: 'QC 검수 리포트',
  delivery_confirm: '납품 확인서',
  content_request: '컨텐츠 제작 의뢰',
  photo_video: '사진·영상',
  performance_report: '성과 분석 리포트',
  sales_strategy: '판매 전략 문서',
  brand_philosophy: '브랜드 철학/방향성',
  logo_design: '로고·심볼',
  color_variation: '컬러 바리에이션',
  bi_application: 'BI 어플리케이션',
  package_design: '패키지 디자인',
  label_design: '라벨·스티커',
  detail_page: '상세페이지',
  viral_content: '바이럴 콘텐츠',
  thumbnail: '썸네일·배너',
}

export const STEP_LABELS = [
  '스타터 패키지',
  '브랜드 기획',
  '디자인·인증',
  '생산·납품',
  '출시',
] as const

export const STEP_DELIVERABLE_GROUPS: Record<number, DeliverableType[]> = {
  0: ['keyword_report', 'competitor_report', 'sample_analysis'],
  1: ['brand_identity', 'market_research', 'product_candidate'],
  2: ['product_design', 'packaging_design', 'certification', 'quotation'],
  3: ['qc_report', 'delivery_confirm', 'content_request'],
  4: ['photo_video', 'performance_report', 'sales_strategy'],
}

export const DELIVERABLE_STEP_ORDER = [0, 1, 2, 3, 4] as const

// 드롭 생성 드롭다운용 — 25개 타입을 6개 친숙한 그룹으로 (데이터 무손실, UI 그룹핑)
export const DELIVERABLE_TYPE_GROUPS: { label: string; types: DeliverableType[] }[] = [
  { label: '분석·리서치', types: ['keyword_report', 'competitor_report', 'market_research', 'sample_analysis'] },
  { label: '브랜드·BI', types: ['brand_identity', 'brand_philosophy', 'logo_design', 'color_variation', 'bi_application'] },
  { label: '제품·패키지', types: ['product_candidate', 'product_design', 'packaging_design', 'package_design', 'label_design'] },
  { label: '콘텐츠·광고', types: ['content_request', 'detail_page', 'viral_content', 'thumbnail', 'photo_video'] },
  { label: '생산·인증', types: ['certification', 'qc_report', 'delivery_confirm'] },
  { label: '견적·성과', types: ['quotation', 'performance_report', 'sales_strategy'] },
]

// ── Design deliverable types ────────────────────────────────────────────────

export const DESIGN_TYPE_CATEGORIES: Record<string, { label: string; color: string; types: DeliverableType[] }> = {
  brand: {
    label: '브랜드 설계',
    color: 'bg-purple-100 text-purple-700',
    types: ['brand_philosophy', 'logo_design', 'color_variation', 'bi_application'],
  },
  product: {
    label: '제품 디자인',
    color: 'bg-blue-100 text-blue-700',
    types: ['package_design', 'product_design', 'label_design'],
  },
  content: {
    label: '콘텐츠',
    color: 'bg-green-100 text-green-700',
    types: ['detail_page', 'viral_content', 'photo_video', 'thumbnail'],
  },
}

export const ALL_DESIGN_TYPES: DeliverableType[] = Object.values(DESIGN_TYPE_CATEGORIES).flatMap((c) => c.types)

export const getDesignCategory = (type: DeliverableType) => {
  for (const [key, cat] of Object.entries(DESIGN_TYPE_CATEGORIES)) {
    if (cat.types.includes(type)) return { key, ...cat }
  }
  return null
}

// 산출물 버전 상태의 단일 소스 (라벨/뱃지 톤). 모든 상태 뱃지·셀렉트가 여기서 파생.
export type StatusTone = 'neutral' | 'warning' | 'info' | 'success'

export const VERSION_STATUS_META: Record<VersionStatus, { label: string; tone: StatusTone }> = {
  draft: { label: '초안', tone: 'neutral' },
  in_review: { label: '검토중', tone: 'warning' },
  revision: { label: '반영중', tone: 'info' },
  published: { label: '최종본', tone: 'success' },
}

export const VERSION_STATUS_ORDER: VersionStatus[] = ['draft', 'in_review', 'revision', 'published']

// 디자인 시안 단계 선택용 (상태 뱃지와 별개 — 단계 흐름 라벨은 도메인 특화 유지)
export const DESIGN_VERSION_STEPS: { value: string; label: string; color: string }[] = [
  { value: 'draft', label: '초안제작', color: 'bg-gray-100 text-gray-600' },
  { value: 'in_review', label: '피드백', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'revision', label: '반영중', color: 'bg-blue-100 text-blue-700' },
  { value: 'published', label: '최종본', color: 'bg-green-100 text-green-700' },
]
