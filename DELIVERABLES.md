# Brution 운영지원툴 - STEP3-A 산출물 제출

## 📦 1. 폴더 구조 (Next.js App Router)

```
webapp/
├── app/                                # Next.js App Router
│   ├── layout.tsx                      # Root Layout (전역 스타일)
│   ├── page.tsx                        # 홈 페이지 (랜딩)
│   ├── globals.css                     # 전역 CSS (Tailwind)
│   │
│   ├── login/                          # 로그인
│   │   └── page.tsx                    # 발급형 계정 로그인 (회원가입 링크 없음)
│   │
│   └── app/                            # 인증된 앱 영역
│       ├── projects/                   # 프로젝트 관리
│       │   ├── page.tsx                # 프로젝트 목록 (테넌시 필터링)
│       │   └── [id]/
│       │       └── page.tsx            # 프로젝트 허브 (산출물/버전/상태)
│       │
│       ├── tools/                      # 도구
│       │   ├── keyword/
│       │   │   └── page.tsx            # 키워드 분석 (업로드/결과)
│       │   ├── ads/
│       │   │   └── page.tsx            # 광고 보조 (폼/생성)
│       │   ├── market/
│       │   │   └── page.tsx            # 시장조사 (내부 전용)
│       │   └── brand-identity/
│       │       └── page.tsx            # 브랜드 아이덴티티 (내부 전용)
│       │
│       └── admin/                      # 관리자
│           └── companies/
│               ├── page.tsx            # 고객사 관리 (StaffAdmin)
│               └── [id]/
│                   └── page.tsx        # 사용자 발급 (Seat 5 제한)
│
├── components/                         # 공통 컴포넌트
│   ├── app-layout.tsx                  # 앱 레이아웃 (Sidebar + Topbar + Main)
│   ├── sidebar.tsx                     # 사이드바 (역할별 메뉴 필터링)
│   ├── topbar.tsx                      # 상단바 (프로젝트 선택/로그아웃)
│   ├── status-badge.tsx                # 상태 뱃지 (draft/review/approved/published)
│   ├── download-button.tsx             # 다운로드 버튼 (권한 제어)
│   └── role-toggle.tsx                 # 역할 토글 (개발 전용)
│
├── lib/                                # 유틸리티
│   ├── utils.ts                        # cn() 함수 (clsx + twMerge)
│   └── mock-data.ts                    # Mock 데이터 (Users/Projects/Deliverables/Versions)
│
├── types/
│   └── index.ts                        # TypeScript 타입 정의
│
├── public/                             # Static Assets
│
├── package.json                        # 의존성
├── tsconfig.json                       # TypeScript 설정
├── tailwind.config.ts                  # Tailwind 설정
├── next.config.mjs                     # Next.js 설정
├── postcss.config.js                   # PostCSS 설정
├── .gitignore                          # Git ignore
└── README.md                           # 프로젝트 문서
```

---

## 🧩 2. 핵심 컴포넌트 목록 + Props 정의

### 2.1 Layout Components

#### `AppLayout`
```typescript
interface AppLayoutProps {
  user: User;                           // 현재 사용자
  children: React.ReactNode;            // 페이지 컨텐츠
  currentProject?: { id: string; name: string };  // 현재 프로젝트 (선택적)
  showRoleToggle?: boolean;             // 역할 토글 표시 여부 (개발용)
  onRoleChange?: (role: UserRole) => void;  // 역할 변경 핸들러
}
```

#### `Sidebar`
```typescript
interface SidebarProps {
  userRole: UserRole;                   // 사용자 역할
  isOpen: boolean;                      // 열림/닫힘 상태 (모바일)
  onClose: () => void;                  // 닫기 핸들러
}
```

#### `Topbar`
```typescript
interface TopbarProps {
  user: User;                           // 현재 사용자
  currentProject?: { id: string; name: string };  // 현재 프로젝트
  onMenuClick: () => void;              // 메뉴 버튼 클릭 (모바일)
  onLogout: () => void;                 // 로그아웃 핸들러
}
```

### 2.2 Status & Action Components

#### `StatusBadge`
```typescript
interface StatusBadgeProps {
  status: VersionStatus;                // draft/review/approved/published
  className?: string;                   // 추가 스타일
}
```

#### `DownloadButton`
```typescript
interface DownloadButtonProps {
  status: VersionStatus;                // 버전 상태
  userRole: UserRole;                   // 사용자 역할
  fileName?: string;                    // 파일명
  fileUrl?: string;                     // 파일 URL
  className?: string;                   // 추가 스타일
}

// 동작 로직:
// - 고객(Client): status === 'published'만 활성화
// - 직원(Staff): 모든 상태에서 활성화
// - 비활성 시: 버튼 비활성 + "승인 완료 후 다운로드 가능" 문구
```

### 2.3 Dev Tools

#### `RoleToggle`
```typescript
interface RoleToggleProps {
  currentRole: UserRole;                // 현재 역할
  onRoleChange: (role: UserRole) => void;  // 역할 변경 핸들러
}

// 제공 역할:
// - staff_admin: 관리자 (StaffAdmin)
// - staff_member: 직원 (StaffMember)
// - client_admin: 고객 (Client)
```

---

## 📄 3. 각 페이지별 TSX 코드 (핵심 5개 페이지)

### 3.1 로그인 페이지 (`/login`)

**파일**: `app/login/page.tsx`

**주요 기능**:
- 이메일/비밀번호 입력 폼
- **발급형 계정 안내** (회원가입 링크 없음)
- Mock 로그인 → `/app/projects` 리다이렉트

**SSOT 하드룰 반영**:
- ✅ "관리자 발급 계정으로 로그인하세요" 안내 문구
- ✅ 셀프 회원가입 링크/버튼 없음

---

### 3.2 프로젝트 목록 (`/app/projects`)

**파일**: `app/app/projects/page.tsx`

**주요 기능**:
- 프로젝트 목록 그리드 표시
- StaffAdmin만 "새 프로젝트" 버튼 표시
- 프로젝트 클릭 → 프로젝트 허브로 이동

**SSOT 하드룰 반영**:
- ✅ 고객(Client)은 자기 회사 프로젝트만 표시 (테넌시 필터링)
- ✅ 직원(Staff)은 모든 프로젝트 접근

---

### 3.3 프로젝트 허브 (`/app/projects/[id]`)

**파일**: `app/app/projects/[id]/page.tsx`

**주요 기능**:
- 프로젝트 산출물 목록 (keyword/ads/market/brand_identity)
- 각 산출물의 버전 목록 (v1, v2, ...)
- 상태별 다운로드 버튼 (`DownloadButton` 컴포넌트 사용)
- StaffAdmin만 "공개하기" 버튼 표시 (approved → published 전환)

**SSOT 하드룰 반영**:
- ✅ 고객: published 상태만 다운로드 가능
- ✅ StaffAdmin만 published 전환 UI 노출 (StaffMember는 미노출)
- ✅ 고객: internal visibility 산출물 필터링 (시장조사 등)

**핵심 코드**:
```typescript
// 다운로드 버튼 (published-only for Client)
<DownloadButton
  status={version.status}
  userRole={currentUser.role}
  fileName={version.fileName}
  fileUrl={version.fileUrl}
/>

// Publish 버튼 (StaffAdmin only)
{isStaffAdmin && version.status === 'approved' && (
  <button onClick={() => alert('published 전환')}>
    공개하기
  </button>
)}
```

---

### 3.4 키워드 분석 (`/app/tools/keyword`)

**파일**: `app/app/tools/keyword/page.tsx`

**주요 기능**:
- **좌측 패널**: Excel/JSON 업로드 (최대 10MB)
- **우측 패널**: 분석 결과 (요약 + 표 미리보기 + 피드백 + 다운로드)
- 필수/선택 컬럼 안내
- Mock 데이터로 결과 표시

**SSOT 하드룰 반영**:
- ✅ **필수 컬럼**: 키워드
- ✅ **선택 컬럼**: 검색량, 상품수, 카테고리, 광고비
- ✅ "선택 컬럼이 없어도 분석 가능" 안내 문구
- ❌ "검색량 필수" 문구 사용 금지

**핵심 코드**:
```typescript
<div className="bg-gray-50 border border-gray-200 rounded-md p-4">
  <p className="text-xs font-medium text-gray-900 mb-2">
    필수/선택 컬럼 안내
  </p>
  <div className="space-y-1 text-xs text-gray-600">
    <p>• <strong>필수:</strong> 키워드</p>
    <p>• <strong>선택:</strong> 검색량, 상품수, 카테고리, 광고비</p>
    <p className="text-gray-500 mt-2">
      ※ 선택 컬럼이 없어도 분석 가능합니다
    </p>
  </div>
</div>
```

---

### 3.5 광고 보조 (`/app/tools/ads`)

**파일**: `app/app/tools/ads/page.tsx`

**주요 기능**:
- **좌측 패널**: 캠페인 정보 입력 (캠페인명/타겟 고객/제품 특징)
- **생성량 프리셋**: 10개 / 20개 (기본값 20, 전체 항목 적용)
- **우측 패널**: 생성 결과 (헤드라인/본문/후킹/CTA/소재)
- 항목별 선택/보류/제외 상태 표시

**SSOT 하드룰 반영**:
- ✅ 프리셋 10/20 (전체 생성량에 적용)
- ✅ "선택한 개수만큼 헤드라인, 본문, 후킹, CTA, 소재가 생성됩니다" 안내 문구

**핵심 코드**:
```typescript
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    생성량 (전체 항목에 적용)
  </label>
  <div className="flex gap-3">
    <button
      type="button"
      onClick={() => setGenerationCount(10)}
      className={generationCount === 10 ? 'active' : ''}
    >
      10개
    </button>
    <button
      type="button"
      onClick={() => setGenerationCount(20)}
      className={generationCount === 20 ? 'active' : ''}
    >
      20개 (기본)
    </button>
  </div>
  <p className="text-xs text-gray-500 mt-2">
    선택한 개수만큼 헤드라인, 본문, 후킹, CTA, 소재가 생성됩니다
  </p>
</div>
```

---

## 🎨 4. 스타일 토큰 (컬러/타이포/간격)

### 4.1 컬러 팔레트

| 토큰 | 값 | 용도 |
|------|-----|------|
| `primary` | `#2563EB` | 메인 액션 버튼, 링크, 아이콘 |
| `primary-hover` | `#1D4ED8` | 호버 상태 |
| `background` | `#FFFFFF` | 기본 배경 (화이트) |
| `foreground` | `#1F2937` | 기본 텍스트 (다크그레이) |
| `muted` | `#F3F4F6` | 비활성 배경, 카드 배경 |
| `border` | `#E5E7EB` | 테두리 |

**상태 색상**:
- `draft`: 회색 (#6B7280)
- `review`: 노란색 (#F59E0B)
- `approved`: 초록색 (#10B981)
- `published`: 파란색 (#2563EB)

### 4.2 타이포그래피

| 요소 | 크기 | 굵기 | 용도 |
|------|------|------|------|
| H1 | `2xl` (24px) | `bold` | 페이지 제목 |
| H2 | `xl` (20px) | `semibold` | 섹션 제목 |
| H3 | `lg` (18px) | `semibold` | 카드 제목 |
| Body | `sm` (14px) | `normal` | 본문 텍스트 |
| Caption | `xs` (12px) | `normal` | 보조 텍스트 |

### 4.3 간격 (Spacing)

- 컴포넌트 간격: `gap-4` (1rem / 16px)
- 섹션 간격: `gap-6` (1.5rem / 24px)
- 카드 패딩: `p-5` or `p-6` (1.25rem or 1.5rem)
- 버튼 패딩: `px-4 py-2` (16px / 8px)

---

## ✅ 5. SSOT 하드룰 UI 반영 체크 (최종 확인)

### ✅ 1. published-only 다운로드 OK
- **구현**: `components/download-button.tsx`
- **로직**: `isClient ? status === 'published' : true`
- **UI**: 비활성 시 "승인 완료 후 다운로드 가능합니다" 문구 표시
- **테스트**: Client 역할로 approved 상태 → 다운로드 버튼 비활성 확인

### ✅ 2. publish UI StaffAdmin만 노출 OK
- **구현**: `app/app/projects/[id]/page.tsx`
- **로직**: `isStaffAdmin && version.status === 'approved'`
- **UI**: StaffMember는 published 전환 버튼 자체가 렌더링 안 됨 (비활성 X, 미노출 O)
- **테스트**: StaffMember 역할로 approved 상태 → "공개하기" 버튼 없음 확인

### ✅ 3. 필수 컬럼 문구 OK
- **구현**: `app/app/tools/keyword/page.tsx`
- **필수**: 키워드
- **선택**: 검색량, 상품수, 카테고리, 광고비
- **안내 문구**: "선택 컬럼이 없어도 분석 가능합니다"
- **주의**: "검색량 필수" 문구 사용하지 않음

### ✅ 4. 프리셋 10/20 (전체 적용) OK
- **구현**: `app/app/tools/ads/page.tsx`
- **프리셋**: 10개 / 20개 (기본값 20)
- **적용**: 전체 생성량 (헤드라인/본문/후킹/CTA/소재)
- **안내 문구**: "선택한 개수만큼 헤드라인, 본문, 후킹, CTA, 소재가 생성됩니다"

### ✅ 5. Seat 5 하드 제한 OK
- **구현**: `app/app/admin/companies/[id]/page.tsx`
- **로직**: `canAddUser = userCount < 5`
- **UI**: 5명 이상이면 "사용자 발급" 버튼 비활성 + 입력 필드 disabled
- **안내 문구**: 
  - 상단 경고: "MVP 하드 제한으로 고객사당 최대 5명까지만 사용자를 발급할 수 있습니다"
  - 버튼 하단: "최대 5명 제한에 도달했습니다"

---

## 🚀 6. 다음 단계 (STEP3-B, 3-C)

### STEP3-B: 백엔드/API 연동
- [ ] Supabase Auth + RLS 설정
- [ ] PostgreSQL 테이블 생성 (users/projects/deliverables/versions/assets)
- [ ] API Routes 구현 (`/api/*`)
- [ ] 파일 업로드/다운로드 (Supabase Storage)
- [ ] Job Runner (비동기 처리: ExcelJS, PDF 생성)
- [ ] OpenAI API 연동 (키워드 분류/광고 생성)

### STEP3-C: 배포 및 최적화
- [ ] Vercel 배포
- [ ] 환경 변수 설정 (DB_URL, OPENAI_KEY, etc.)
- [ ] 성능 최적화 (이미지/폰트/번들 크기)
- [ ] E2E 테스트 (Playwright)

---

## 📋 7. 제출 체크리스트

- [x] 폴더 구조 제안 (Next.js App Router 기반)
- [x] 핵심 컴포넌트 목록 + props 정의
- [x] 핵심 페이지 5개 TSX 코드 (login/projects/projectDetail/keyword/ads)
- [x] 추가 페이지 4개 TSX 코드 (market/brand-identity/admin/companies/user-management)
- [x] 스타일 토큰 표 (컬러/타이포/간격)
- [x] SSOT 하드룰 UI 반영 체크 (5개 항목)
- [x] README.md 작성 (프로젝트 문서)
- [x] Git 저장소 초기화 + 커밋
- [x] .gitignore 파일 생성

---

**제출일**: 2024-03-04  
**제출자**: Claude (STEP3-A UI 구현 담당)  
**기준 문서**: `brution_ssot_v1_1.md`  
**상태**: ✅ 완료 (백엔드 미구현, UI 프로토타입만)
