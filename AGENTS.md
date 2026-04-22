# 브루션 ops-tool AGENTS.md

> AI 코딩 에이전트가 작업 시 반드시 읽어야 할 업무 지침서.
> 작업 시작 전 이 파일을 먼저 확인하고 모든 규칙을 준수한다.

---

## 프로젝트 개요

- 프로젝트명: brution-ops-tool
- 스택: Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase
- 목적: 브루션 내부 운영툴 + 고객사 포털
- 설계 문서: brution_design_v3.md 참고

---

## 절대 하면 안됨 (NEVER)

- window.confirm 사용 금지 → "삭제" 타이핑 확인 모달로 대체
- DB 컬럼명/변수명 변경 금지 (UI 텍스트만 변경 가능)
- 환경변수 값 하드코딩 금지
- 민감정보(토큰/비밀번호/API키) 로그 출력 금지
- cookies()/headers() await 없이 사용 금지 (Next.js 15)
- 브루션 UUID '00000000-0000-0000-0000-000000000001' 고객사 목록 포함 금지
- 작업 완료 선언 후 push 없이 종료 금지

---

## 개발 규칙 (ALWAYS)

- 삭제 확인: DeleteConfirmModal 또는 "삭제" 타이핑 확인 모달
- 토스트 알림: showToast(message, 'success'|'error'|'info')
- 인증: createServerClient + cookies() SSR 방식
- 어드민 권한 체크: isStaffAdmin() 함수
- 클라이언트 Supabase: createBrowserClient
- cookies()/headers(): 반드시 await 처리

---

## AI 모델 규칙 (Advisor Strategy)

- 실행 주체: Claude Sonnet 4.6
- 어드바이저: Claude Opus 4.7 (복잡한 판단 필요시만, max_uses: 3)
- 단순 처리: Claude Haiku

---

## 테스트 & CI 게이트

작업 완료 전 반드시 확인:
- npx tsc --noEmit (TypeScript 에러 0개)
- npm run build 통과 필수

---

## 커밋 규칙

- feat: 새 기능
- fix: 버그 수정
- refactor: 리팩토링
- style: UI/스타일만 변경
- docs: 문서 수정

커밋 후 반드시 push까지 완료.
push 실패 시 git pull --rebase origin main 후 재시도.

---

## 주요 상수

- 브루션 UUID: '00000000-0000-0000-0000-000000000001'
- STEP: 0=스타터패키지 / 1=브랜드기획 / 2=디자인·인증 / 3=생산·납품 / 4=출시

---

## 모델 전략 (작업별 권장 모델)

### 모델 변경 방법
/model claude-opus-4-7
/model claude-sonnet-4-6
/model claude-haiku-4-5-20251001

### 상황별 권장 모델

Opus 4.7 — 설계/판단
- 전체 아키텍처 설계
- 복잡한 버그 원인 분석
- DB 스키마 설계
- 새로운 기능 전체 구조 설계
- 새 페이지/컴포넌트 전면 개편

Sonnet 4.6 — 일반 구현
- 기존 컴포넌트 수정/개선
- API 라우트 수정
- UI 스타일 수정
- 원인 파악된 버그 수정
- 타입 추가

Haiku — 단순 반복
- 파일 내용 확인/출력
- 단순 텍스트 변경
- git 명령어 실행
- 파일 구조 파악

---

## 작업 인수인계 (컨텍스트 유지)

새 세션 시작 시 반드시 아래 파일 먼저 읽을 것:
1. AGENTS.md (이 파일)
2. brution_design_v3.md (전체 설계 기준)

작업 완료 후 반드시 기록:
- 커밋 해시
- 변경된 파일 목록
- 다음 작업 예정 내용

현재 진행 상황:
- Phase A 진행 중
- 완료: AGENTS.md 생성(a149a0f), 대시보드 개편(132e636)
- 진행 중: 대시보드 UX 개선
- 다음: 오른쪽 패널 강화, 간트차트 3트랙

주요 파일 경로:
- 대시보드: app/app/admin/page.tsx
- 대시보드 API: app/api/admin/dashboard/route.ts
- 고객사 상세: app/app/admin/companies/[id]/_components/CompanyDetailClient.tsx
- 프로젝트 상세: app/app/admin/projects/[id]/page.tsx
- 고객사 API: app/api/admin/companies/[id]/route.ts

---

## 참고 문서

- 설계 문서 v3: brution_design_v3.md (전체 설계 기준 — 항상 최신 버전 참조)
- AGENTS.md: 이 파일 (AI 코딩 에이전트 업무 지침)

작업 시작 전 반드시 brution_design_v3.md를 읽고 현재 Phase와 다음 작업을 확인할 것.
