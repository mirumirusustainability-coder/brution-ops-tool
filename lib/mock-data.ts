import { User, Company, Project, Deliverable, DeliverableVersion, KeywordData, AdResultItem } from '@/types';

// Mock Companies
export const mockCompanies: Company[] = [
  {
    id: 'company-1',
    name: '브루션 클라이언트 A',
    maxUsers: 5,
    createdAt: '2024-01-15T09:00:00Z',
  },
  {
    id: 'company-2',
    name: '브루션 클라이언트 B',
    maxUsers: 5,
    createdAt: '2024-02-10T09:00:00Z',
  },
];

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user-admin',
    email: 'admin@brution.com',
    name: '관리자',
    role: 'staff_admin',
    companyId: 'brution',
    mustChangePassword: false,
    status: 'active',
  },
  {
    id: 'user-staff',
    email: 'member@brution.com',
    name: '직원',
    role: 'staff_member',
    companyId: 'brution',
    mustChangePassword: false,
    status: 'active',
  },
  {
    id: 'user-client-1',
    email: 'client1@company-a.com',
    name: '고객 담당자',
    role: 'client_admin',
    companyId: 'company-1',
    mustChangePassword: false,
    status: 'active',
  },
];

// Mock Projects
export const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: '2024 Q1 마케팅 캠페인',
    companyId: 'company-1',
    description: '신제품 출시 캠페인',
    createdAt: '2024-01-20T09:00:00Z',
    updatedAt: '2024-01-25T14:30:00Z',
  },
  {
    id: 'project-2',
    name: '브랜드 리뉴얼 프로젝트',
    companyId: 'company-1',
    description: 'CI/BI 전면 개편',
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-02-15T11:20:00Z',
  },
  {
    id: 'project-3',
    name: '경쟁사 분석 리포트',
    companyId: 'company-1',
    description: '시장 조사 및 경쟁력 분석',
    createdAt: '2024-02-10T09:00:00Z',
    updatedAt: '2024-02-20T16:45:00Z',
  },
];

// Mock Deliverables
export const mockDeliverables: Deliverable[] = [
  {
    id: 'deliverable-1',
    projectId: 'project-1',
    type: 'keyword',
    visibility: 'client',
    createdAt: '2024-01-20T10:00:00Z',
  },
  {
    id: 'deliverable-2',
    projectId: 'project-1',
    type: 'ads',
    visibility: 'client',
    createdAt: '2024-01-21T10:00:00Z',
  },
  {
    id: 'deliverable-3',
    projectId: 'project-2',
    type: 'brand_identity',
    visibility: 'client',
    createdAt: '2024-02-02T10:00:00Z',
  },
  {
    id: 'deliverable-4',
    projectId: 'project-3',
    type: 'market',
    visibility: 'internal',
    createdAt: '2024-02-11T10:00:00Z',
  },
];

// Mock Deliverable Versions
export const mockVersions: DeliverableVersion[] = [
  // Keyword - published (고객이 다운로드 가능)
  {
    id: 'version-1',
    deliverableId: 'deliverable-1',
    versionNo: 1,
    status: 'published',
    assetId: 'asset-keyword-v1',
    fileName: '2024_Q1_마케팅_캠페인_keyword_v1_20240125.xlsx',
    fileSize: 245678,
    fileUrl: '/mock/keyword-v1.xlsx',
    createdAt: '2024-01-20T10:30:00Z',
    createdBy: 'user-staff',
    publishedAt: '2024-01-25T14:30:00Z',
    publishedBy: 'user-admin',
  },
  // Ads - approved (아직 고객 다운로드 불가)
  {
    id: 'version-2',
    deliverableId: 'deliverable-2',
    versionNo: 1,
    status: 'approved',
    assetId: 'asset-ads-v1',
    fileName: '2024_Q1_마케팅_캠페인_ads_v1_20240122.xlsx',
    fileSize: 189234,
    fileUrl: '/mock/ads-v1.xlsx',
    createdAt: '2024-01-21T11:00:00Z',
    createdBy: 'user-staff',
    approvedAt: '2024-01-22T15:00:00Z',
    approvedBy: 'user-admin',
  },
  // Brand Identity - draft
  {
    id: 'version-3',
    deliverableId: 'deliverable-3',
    versionNo: 1,
    status: 'draft',
    assetId: 'asset-brand-v1',
    fileName: '브랜드_리뉴얼_brand_identity_v1_20240205.pdf',
    fileSize: 5234567,
    fileUrl: '/mock/brand-v1.pdf',
    createdAt: '2024-02-02T11:00:00Z',
    createdBy: 'user-staff',
  },
  // Brand Identity - published
  {
    id: 'version-4',
    deliverableId: 'deliverable-3',
    versionNo: 2,
    status: 'published',
    assetId: 'asset-brand-v2',
    fileName: '브랜드_리뉴얼_brand_identity_v2_20240215.pdf',
    fileSize: 5456789,
    fileUrl: '/mock/brand-v2.pdf',
    createdAt: '2024-02-10T11:00:00Z',
    createdBy: 'user-staff',
    publishedAt: '2024-02-15T11:20:00Z',
    publishedBy: 'user-admin',
  },
  // Market - review (내부 전용)
  {
    id: 'version-5',
    deliverableId: 'deliverable-4',
    versionNo: 1,
    status: 'review',
    assetId: 'asset-market-v1',
    fileName: '경쟁사_분석_market_v1_20240218.pdf',
    fileSize: 3456789,
    fileUrl: '/mock/market-v1.pdf',
    createdAt: '2024-02-11T11:00:00Z',
    createdBy: 'user-staff',
  },
];

// Mock Keyword Data
export const mockKeywordData: KeywordData[] = [
  { keyword: '에어컨 추천', searchVolume: 45000, productCount: 1250, category: '가전', classification: '유지' },
  { keyword: '저렴한 에어컨', searchVolume: 23000, productCount: 890, category: '가전', classification: '유지' },
  { keyword: '에어컨 설치', searchVolume: 18000, productCount: 450, category: '서비스', classification: '유지' },
  { keyword: '중고 에어컨', searchVolume: 8900, productCount: 320, category: '가전', classification: '제외', customerNote: '신제품 캠페인에 부적합' },
  { keyword: '에어컨 청소', searchVolume: 12000, productCount: 180, category: '서비스', classification: '확인필요' },
];

// Mock Ad Results
export const mockAdResults: AdResultItem[] = [
  // Headlines
  { id: 'ad-1', type: 'headline', content: '여름 필수템! 프리미엄 에어컨 특가', status: '선택' },
  { id: 'ad-2', type: 'headline', content: '시원한 여름, 지금 시작하세요', status: '선택' },
  { id: 'ad-3', type: 'headline', content: '에너지 절약형 스마트 에어컨', status: '보류' },
  // Body
  { id: 'ad-4', type: 'body', content: '전력 소비 30% 절감! 친환경 냉방 솔루션으로 여름을 시원하고 경제적으로', status: '선택' },
  { id: 'ad-5', type: 'body', content: '조용하고 강력한 냉방 성능. 당신의 공간을 완벽한 온도로', status: '보류', customerNote: '너무 일반적인 표현' },
  // Hook
  { id: 'ad-6', type: 'hook', content: '무더위는 이제 그만! 🌡️', status: '선택' },
  { id: 'ad-7', type: 'hook', content: '폭염 대비, 지금 준비하세요', status: '제외' },
  // CTA
  { id: 'ad-8', type: 'cta', content: '지금 특가 확인하기', status: '선택' },
  { id: 'ad-9', type: 'cta', content: '무료 상담 신청', status: '선택' },
  // Creative Ideas
  { id: 'ad-10', type: 'creative', content: '에어컨 전/후 온도계 비교 이미지', status: '선택' },
  { id: 'ad-11', type: 'creative', content: '에너지 절감 그래프 인포그래픽', status: '보류' },
];
