# Brution 운영지원툴 - UI 구현 (Step 3-A)

## 프로젝트 개요

- **프로젝트명**: Brution 운영지원툴 (브루션 데이터로 더 똑똑해진 생성형 AI)
- **목표**: 리포트 제작 시간 70% 단축, 고객 셀프서비스 제공, 내부 산출물 버전/승인/공개 체계화
- **기술 스택**: Next.js 15 (App Router) + TypeScript + TailwindCSS + Lucide Icons
- **상태**: UI 프로토타입 완성 (백엔드/API 미구현)

## 주요 기능

### ✅ 완성된 화면

1. **로그인** (`/login`)
   - 발급형 계정 로그인 (셀프 회원가입 없음)
   - 관리자 발급 계정 안내 문구 표시

2. **프로젝트 관리** (`/app/projects`)
   - 프로젝트 목록 조회
   - 역할별 프로젝트 필터링 (고객은 자기 회사 프로젝트만)

3. **프로젝트 허브** (`/app/projects/[id]`)
   - 산출물 목록 및 버전 관리
   - 상태별 다운로드 권한 제어
   - StaffAdmin만 published 전환 UI 노출

4. **키워드 분석** (`/app/tools/keyword`)
   - Excel/JSON 업로드 (최대 10MB)
   - 필수 컬럼: 키워드 / 선택 컬럼: 검색량, 상품수, 카테고리, 광고비
   - 분석 결과 요약 및 미리보기
   - published 상태만 다운로드 가능 (고객)

5. **광고 보조** (`/app/tools/ads`)
   - 캠페인 정보 입력 폼
   - 생성량 프리셋: 10개 / 20개 (전체 항목 적용)
   - 헤드라인, 본문, 후킹, CTA, 소재 생성
   - 항목별 선택/보류/제외 상태 관리

6. **시장조사** (`/app/tools/market`)
   - 내부 전용 (고객 접근 차단)
   - 접근 권한 없음 화면 표시

7. **브랜드 아이덴티티** (`/app/tools/brand-identity`)
   - 내부 전용 (고객 접근 차단)
   - PDF 업로드 (최대 30MB)
   - StaffAdmin만 published 전환 가능

8. **고객사 관리** (`/app/admin/companies`)
   - StaffAdmin 전용
   - 고객사 목록 조회

9. **사용자 발급** (`/app/admin/companies/[id]`)
   - StaffAdmin 전용
   - 사용자 발급 폼
   - **Seat 5 하드 제한**: 5명 이상이면 "사용자 추가" 버튼 비활성화 + 안내 문구

### 🎯 SSOT 하드룰 UI 반영 체크리스트

#### ✅ 1. published-only 다운로드 (고객)
- **구현 위치**: `components/download-button.tsx`, 프로젝트 허브
- **동작**: 고객(Client) 역할은 `status === 'published'` 일 때만 다운로드 버튼 활성화
- **비활성 시**: 버튼 비활성 + "승인 완료 후 다운로드 가능합니다" 안내 문구 표시
- **직원(Staff)**: 모든 상태에서 다운로드 가능 (내부 작업용)

#### ✅ 2. published 전환 UI는 StaffAdmin만 노출
- **구현 위치**: `/app/projects/[id]/page.tsx` (프로젝트 허브)
- **동작**: `currentUser.role === 'staff_admin'` 일 때만 "공개하기" 버튼 렌더링
- **StaffMember**: published 전환 UI 자체를 숨김 (비활성 X, 미노출 O)

#### ✅ 3. 필수 컬럼 문구 (키워드 분석)
- **구현 위치**: `/app/tools/keyword/page.tsx`
- **필수 컬럼**: 키워드
- **선택 컬럼**: 검색량, 상품수, 카테고리, 광고비
- **안내 문구**: "선택 컬럼이 없어도 분석 가능합니다"
- **주의**: "검색량 필수" 문구 사용 금지 (SSOT 위반)

#### ✅ 4. 광고 생성량 프리셋 10/20 (전체 적용)
- **구현 위치**: `/app/tools/ads/page.tsx`
- **프리셋**: 10개 / 20개 (기본값 20)
- **적용 범위**: 전체 생성량 (헤드라인/본문/후킹/CTA/소재 모두)
- **안내 문구**: "선택한 개수만큼 헤드라인, 본문, 후킹, CTA, 소재가 생성됩니다"

#### ✅ 5. Seat 5 하드 제한
- **구현 위치**: `/app/admin/companies/[id]/page.tsx`
- **제한 조건**: `userCount >= 5`일 때 "사용자 발급" 버튼 비활성화
- **안내 문구**: 
  - 상단 경고: "MVP 하드 제한으로 고객사당 최대 5명까지만 사용자를 발급할 수 있습니다"
  - 버튼 하단: "최대 5명 제한에 도달했습니다. 새 사용자를 추가하려면 기존 사용자를 비활성화하세요"

## 프로젝트 구조

```
webapp/
├── app/
│   ├── page.tsx                        # 홈 (랜딩)
│   ├── login/page.tsx                  # 로그인
│   ├── app/
│   │   ├── projects/
│   │   │   ├── page.tsx                # 프로젝트 목록
│   │   │   └── [id]/page.tsx           # 프로젝트 상세/허브
│   │   ├── tools/
│   │   │   ├── keyword/page.tsx        # 키워드 분석
│   │   │   ├── ads/page.tsx            # 광고 보조
│   │   │   ├── market/page.tsx         # 시장조사 (내부 전용)
│   │   │   └── brand-identity/page.tsx # 브랜드 아이덴티티 (내부 전용)
│   │   └── admin/
│   │       └── companies/
│   │           ├── page.tsx            # 고객사 관리
│   │           └── [id]/page.tsx       # 사용자 발급
│   ├── layout.tsx                      # Root Layout
│   └── globals.css                     # Global Styles
├── components/
│   ├── app-layout.tsx                  # 앱 레이아웃 (Sidebar + Topbar)
│   ├── sidebar.tsx                     # 사이드바
│   ├── topbar.tsx                      # 상단바
│   ├── status-badge.tsx                # 상태 뱃지
│   ├── download-button.tsx             # 다운로드 버튼 (권한 제어)
│   └── role-toggle.tsx                 # 역할 토글 (개발 전용)
├── lib/
│   ├── utils.ts                        # 유틸리티 (cn 함수)
│   └── mock-data.ts                    # Mock 데이터
├── types/
│   └── index.ts                        # TypeScript 타입 정의
├── public/                             # Static Assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── README.md
```

## 핵심 컴포넌트

### 1. AppLayout
- **Props**: `user`, `children`, `currentProject`, `showRoleToggle`, `onRoleChange`
- **기능**: 전체 앱 레이아웃 (Sidebar + Topbar + Main Content)
- **역할 토글**: 개발용 RoleToggle 컴포넌트 포함 (우측 상단)

### 2. Sidebar
- **Props**: `userRole`, `isOpen`, `onClose`
- **기능**: 역할별 메뉴 필터링, 모바일 반응형 (Overlay + Slide)
- **메뉴 항목**: 역할별 allowedRoles 배열로 접근 제어

### 3. Topbar
- **Props**: `user`, `currentProject`, `onMenuClick`, `onLogout`
- **기능**: 프로젝트 선택 드롭다운, 사용자 정보, 로그아웃

### 4. StatusBadge
- **Props**: `status: VersionStatus`, `className?`
- **기능**: draft/review/approved/published 상태를 색상으로 표시

### 5. DownloadButton
- **Props**: `status`, `userRole`, `fileName`, `fileUrl`, `className?`
- **기능**: 
  - 고객: `status === 'published'`만 다운로드 가능
  - 직원: 모든 상태에서 다운로드 가능
  - 비활성 시 안내 문구 표시

### 6. RoleToggle
- **Props**: `currentRole`, `onRoleChange`
- **기능**: 개발 전용 역할 테스트 (StaffAdmin / StaffMember / Client)
- **스타일**: 황색 배경, 우측 상단 고정 (z-50)

## 스타일 토큰

| 속성 | 값 | 설명 |
|------|-----|------|
| Primary | #2563EB | 메인 컬러 (블루) |
| Primary Hover | #1D4ED8 | 호버 상태 |
| Background | #FFFFFF | 배경 (화이트) |
| Foreground | #1F2937 | 텍스트 (다크그레이) |
| Muted | #F3F4F6 | 비활성/배경 |
| Border | #E5E7EB | 테두리 |

## Mock 데이터

- **Users**: 3명 (StaffAdmin, StaffMember, Client)
- **Companies**: 2개
- **Projects**: 3개
- **Deliverables**: 4개 (keyword, ads, market, brand_identity)
- **Versions**: 5개 (draft/review/approved/published 상태 혼합)
- **KeywordData**: 5개 (샘플 키워드 분석 결과)
- **AdResults**: 11개 (헤드라인/본문/후킹/CTA/소재)

## 개발 가이드

### 로컬 개발 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 역할 테스트

1. 우측 상단 "🔧 개발 전용: 권한 테스트" 패널 사용
2. StaffAdmin / StaffMember / Client 역할 전환
3. 각 역할별 메뉴/기능 접근 제어 확인

### 주요 테스트 시나리오

#### Scenario 1: Client 역할 (고객)
- ✅ 프로젝트 목록: 자기 회사 프로젝트만 표시
- ✅ 키워드/광고: 접근 가능
- ❌ 시장조사/브랜드 아이덴티티: "접근 권한 없음" 화면
- ❌ 고객사 관리: 사이드바 메뉴 미노출
- ✅ 다운로드: published 상태만 활성화

#### Scenario 2: StaffMember 역할 (직원)
- ✅ 모든 프로젝트 접근 가능
- ✅ 키워드/광고/시장조사/브랜드 아이덴티티 접근 가능
- ❌ 고객사 관리: 사이드바 메뉴 미노출
- ❌ published 전환 UI: 미노출
- ✅ 다운로드: 모든 상태에서 가능

#### Scenario 3: StaffAdmin 역할 (관리자)
- ✅ 모든 기능 접근 가능
- ✅ published 전환 버튼 노출
- ✅ 고객사 관리/사용자 발급 접근 가능
- ✅ Seat 5 제한 UI 확인 가능

## 다음 단계 (Step 3-B, 3-C)

### Step 3-B: API/백엔드 연동
- Supabase Auth + RLS 설정
- PostgreSQL 테이블 생성
- API Routes 구현 (/api/*)
- 파일 업로드/다운로드 (Storage)
- Job Runner (비동기 처리)

### Step 3-C: 배포 및 최적화
- Vercel/Cloudflare Pages 배포
- 환경 변수 설정
- 성능 최적화 (이미지/폰트/번들)
- E2E 테스트 (Playwright)

## 라이센스

Private (브루션 내부용)

---

**작성일**: 2024-03-04  
**작성자**: Claude (STEP3-A UI 구현 담당)  
**기준 문서**: `brution_ssot_v1_1.md`
