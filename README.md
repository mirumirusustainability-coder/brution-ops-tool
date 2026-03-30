# Brution 운영지원툴 (STEP4 - Supabase 백엔드/RLS)

## 프로젝트 개요
- **프로젝트명**: Brution 운영지원툴
- **목표**: 리포트 제작 시간 70% 단축, 고객 셀프서비스 제공, 내부 산출물 버전/승인/공개 체계화
- **기술 스택**: Next.js 15 (App Router) + TypeScript + TailwindCSS + Supabase(Auth/Postgres/Storage)
- **상태**: ✅ STEP4 백엔드/권한/DB 구현 + API 라우트 복구

## 완료된 기능
### ✅ 백엔드/권한
- Supabase Auth 기반 발급형 로그인(StaffAdmin만 사용자 생성)
- must_change_password 강제 변경 (middleware + `/force-password-change`)
- Seat 5 하드 제한(서버에서 active client 사용자 5명 초과 생성 차단)
- published-only 다운로드 서버 검증(테넌시 + published + deliverable 연결 필수)
- usage_monthly 월 사용량 제한(초과 시 429, StaffAdmin override 지원)
- 모든 핵심 이벤트 audit_logs 기록

### ✅ UI (STEP3-A)
- 프로젝트/산출물/다운로드/관리자 화면 등 UI 프로토타입 유지
- STEP 진행률 표시 및 프로젝트 상태/삭제 관리 UI 추가

## URL
- **Production**: (배포 전)
- **API 예시**: `/api/auth/me`, `/api/projects`, `/api/assets/{id}/download`

## 데이터 아키텍처
- **DB**: Supabase Postgres + RLS
- **마이그레이션**: `supabase/migrations/0001_init.sql`
- **주요 테이블**:
  - companies
  - profiles (role, status, must_change_password)
  - projects
  - deliverables (type, visibility)
  - deliverable_versions (status)
  - assets (deliverable_version_id nullable)
  - evidences (internal)
  - jobs
  - audit_logs
  - usage_monthly
- **스토리지**: Supabase Storage (signed URL로 다운로드)

## DB 변경 사항 (SQL)
```sql
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
CHECK (status IN ('active', 'completed', 'paused'));

ALTER TYPE version_status_enum ADD VALUE IF NOT EXISTS 'in_review';
ALTER TYPE version_status_enum ADD VALUE IF NOT EXISTS 'approved';
```

## 핵심 보안/하드룰
- Client 다운로드는 **published 상태만 허용**
- **StaffAdmin만 published 전환 가능**
- 고객 셀프 가입 없음(발급형)
- 고객사 사용자 **최대 5명** (서버 차단)
- 테넌시: 고객은 자기 회사 데이터만

## API 요약
### Auth
- `GET /api/auth/me`
- `POST /api/auth/password-change`

### Admin (StaffAdmin)
- `GET /api/admin/companies`
- `POST /api/admin/companies`
- `DELETE /api/admin/companies/{companyId}`
- `DELETE /api/admin/companies/{companyId}/users/{userId}`
- `POST /api/admin/companies/{companyId}/users` (Seat5 체크)
- `POST /api/admin/users/{userId}/reset-password`
- `PATCH /api/admin/users/{userId}` (inactive)
- `GET /api/admin/projects`
- `POST /api/admin/projects`
- `PATCH /api/admin/projects/{projectId}` (STEP/상태/고객사 업데이트)
- `DELETE /api/admin/projects/{projectId}`
- `POST /api/admin/assets` (파일 업로드)
- `DELETE /api/admin/assets/{assetId}`
- `PATCH /api/admin/deliverables/{deliverableId}`
- `DELETE /api/admin/deliverables/{deliverableId}`
- `PATCH /api/admin/deliverable-versions/{versionId}`
- `DELETE /api/admin/deliverable-versions/{versionId}`

### Projects / Versions
- `GET /api/projects`
- `POST /api/projects`
- `PATCH /api/deliverable-versions/{versionId}/status` (published는 StaffAdmin만)

### Assets
- `POST /api/projects/{projectId}/assets`
- `GET /api/assets/{assetId}/download` (테넌시 + published-only 검증)

### Usage
- `POST /api/usage/increment`

## 환경변수
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=brution-assets
SIGNED_URL_EXPIRES_IN=3600
USAGE_MONTHLY_LIMIT_KRW=200000
USAGE_MONTHLY_LIMIT_EXEC=200
```

## 사용자 가이드 (간단)
1. StaffAdmin이 고객사 생성 → 고객 사용자 발급(임시 비밀번호 제공)
2. 고객 첫 로그인 → 비밀번호 강제 변경
3. 프로젝트/산출물 작업 → StaffAdmin 승인/공개(published)
4. 고객은 published 상태만 다운로드 가능

## 로컬 테스트 시나리오 (필수 3계정)
- **StaffAdmin**: 회사 생성/사용자 발급/Publish 전환/다운로드
- **StaffMember**: 리뷰/승인까지 가능, published 전환 불가
- **Client**: 자기 회사 프로젝트만 접근, published 아닌 자산 다운로드 차단 확인

## API 테스트 (curl 예시)
```bash
# 세션 쿠키/토큰 포함
curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:3000/api/auth/me

curl -X POST http://localhost:3000/api/auth/password-change \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"NewPassword123!"}'

curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  http://localhost:3000/api/projects

curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  http://localhost:3000/api/projects/<PROJECT_ID>

curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  http://localhost:3000/api/assets/<ASSET_ID>/download
```

## 프로젝트 구조 (핵심)
```
webapp/
├── app/
│   ├── api/                          # App Router API
│   ├── force-password-change/        # must_change_password 강제 변경
│   └── app/                          # UI
├── lib/
│   └── supabase/
│       ├── server.ts                 # Supabase 서버 클라이언트
│       └── auth.ts                   # 인증/권한 헬퍼
├── supabase/
│   └── migrations/0001_init.sql
├── middleware.ts                     # must_change_password 강제 리다이렉트
└── README.md
```

## 미구현/차기 단계
- 키워드/광고/시장조사/브랜드아이덴티티 실제 처리 로직
- Evidence 자동 매핑(SSOT상 2차 이월)
- 외부 API 연동(네이버/쿠팡 등 2차 이월)

## 다음 권장 작업
- Supabase 프로젝트 생성 후 `0001_init.sql` 적용
- Storage 버킷 생성 및 정책 설정
- 프론트 로그인/세션 관리 Supabase 연동
- QA: published-only, 테넌시, Seat5, must_change_password 우회 검증

## 배포
- **플랫폼**: Cloudflare Pages
- **상태**: ❌ 미배포
- **마지막 업데이트**: 2026-03-30
