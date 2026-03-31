import { DeliverableType } from '@/types'

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
  photo_video: '촬영 원본/가공 콘텐츠',
  performance_report: '성과 분석 리포트',
  sales_strategy: '판매 전략 문서',
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
