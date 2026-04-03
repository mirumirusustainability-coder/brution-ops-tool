'use client';

import { useEffect, useState, use } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { UserPlus, ShieldAlert, Mail, User, AlertCircle, Pencil, Trash2, Presentation } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { StepProgress } from '@/components/step-progress';
import { STEP_LABELS } from '@/lib/constants';
import { Breadcrumb } from '@/components/breadcrumb';
import { ToastContainer } from '@/components/toast';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserRole, User as AppUser } from '@/types';

type ApiUser = {
  user_id: string;
  email: string;
  name: string | null;
  role: UserRole;
  phone?: string | null;
  job_title?: string | null;
  avatar_url?: string | null;
  business_card_url?: string | null;
  company_id: string | null;
  status: 'active' | 'inactive';
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};

type CompanyMetadata = {
  biz_no?: string | null;
  address?: string | null;
  phone?: string | null;
  representative_name?: string | null;
  contact_email?: string | null;
  contract_status?: '계약전' | '진행중' | '완료' | string | null;
  starter_package?: boolean | null;
  total_amount?: number | string | null;
  deposit_paid?: boolean | null;
  balance_paid?: boolean | null;
  contract_start?: string | null;
  contract_end?: string | null;
  lead_source?: '지인소개' | 'SNS' | '광고' | '콜드아웃리치' | '기타' | string | null;
  first_contact?: string | null;
  target_launch?: string | null;
  interest_category?: string[] | null;
  interest_category_other?: string | null;
  current_channel?: string[] | null;
  current_channel_other?: string | null;
  target_channel?: string[] | null;
  target_channel_other?: string | null;
  est_order_qty?: string | null;
  pain_point?: string | null;
  client_tier?: '일반' | 'VIP' | '파트너' | string | null;
  internal_notes?: string | null;
  last_contact?: string | null;
};

type ApiCompany = {
  id: string;
  name: string;
  metadata?: CompanyMetadata | null;
  created_at: string;
  updated_at: string;
};

type ApiProject = {
  id: string;
  name: string | null;
  description?: string | null;
  step?: number | null;
  status?: 'active' | 'completed' | 'paused' | null;
  created_at: string;
  updated_at: string;
};

const mapUser = (me: any): AppUser => ({
  id: me.userId,
  email: me.email,
  name: me.email,
  role: me.role,
  companyId: me.companyId ?? '',
  mustChangePassword: me.mustChangePassword,
  status: me.status,
});

const contractStatusOptions = ['계약전', '진행중', '완료'];
const leadSourceOptions = ['지인소개', 'SNS', '광고', '콜드아웃리치', '기타'];
const interestCategoryOptions = [
  '뷰티',
  '식품/음료',
  '유아/베이비',
  '패션',
  '반려동물',
  '가전/디지털',
  '생활/주방',
  '인테리어/가구',
  '기타',
];
const channelOptions = [
  '네이버',
  '쿠팡',
  '오픈마켓 (G마켓/옥션/11번가)',
  '공동구매 (SNS)',
  '오프라인 매장',
  '해외 쇼핑몰',
  '기타',
];
const clientTierOptions = ['일반', 'VIP', '파트너'];

const emptyValue = <p className="text-sm text-gray-400 italic">-</p>;
const renderTextValue = (value?: string | null) =>
  value ? <p className="text-sm text-gray-900">{value}</p> : emptyValue;
const renderAmountValue = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') {
    return emptyValue;
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return emptyValue;
  }
  return <p className="text-sm text-gray-900">₩{numeric.toLocaleString('ko-KR')}</p>;
};
const renderArrayValue = (value?: string[] | null) =>
  Array.isArray(value) && value.length > 0
    ? renderTextValue(value.join(', '))
    : emptyValue;

const formatArrayWithOther = (value?: string[] | null, other?: string | null) => {
  const items = Array.isArray(value) ? value : [];
  if (!items.length) return [];
  return items.map((item) => (item === '기타' && other ? `기타(${other})` : item));
};

const renderTagList = (items: string[]) => {
  if (!items.length) return emptyValue;
  const pageContent = (
    <>
      {presentationMode && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <span>📊 상담 모드 · 민감 정보가 숨겨져 있습니다</span>
          <button
            type="button"
            onClick={() => router.replace(pathname)}
            className="text-orange-700 underline underline-offset-2"
          >
            모드 종료
          </button>
        </div>
      )}
      {!presentationMode && (
        <Breadcrumb
          items={[
            { label: '브루션 관리자', href: '/app/admin' },
            { label: '고객사 관리', href: '/app/admin/companies' },
            { label: company.name },
          ]}
        />
      )}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
            {latestStatusLabel && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${latestStatusStyle}`}>
                {latestStatusLabel}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {presentationMode
              ? latestStatusLabel
                ? `진행 상태: ${latestStatusLabel}`
                : '진행 중인 프로젝트 없음'
              : `사용자 ${activeUserCount}/5명`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!presentationMode && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (isProfileEditing) {
                    setIsEditingProfile(false);
                    setProfileDraft(profileData);
                    setProfileError(null);
                  } else {
                    setIsEditingProfile(true);
                    setProfileDraft(profileData);
                    setProfileError(null);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Pencil className="w-4 h-4" />
                {isProfileEditing ? '편집 종료' : '편집'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCompanyDeleteModal(true);
                  setCompanyDeleteInput('');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
            </>
          )}
          {!presentationMode && (
            <button
              type="button"
              onClick={() => router.replace(`${pathname}?mode=presentation`)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Presentation className="w-4 h-4" />
              상담 모드
            </button>
          )}
        </div>
      </div>

      {profileError && <div className="text-sm text-red-600 mb-4">{profileError}</div>}

      {!presentationMode && (
        <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          {(
            [
              { key: 'overview', label: 'Overview' },
              { key: 'users', label: `Users (${users.length})` },
              { key: 'contract', label: 'Contracts·Billing' },
              { key: 'notes', label: 'Notes' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!presentationMode && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">사업자번호</label>
                  {isProfileEditing ? (
                    <input
                      type="text"
                      value={profileDraft.biz_no ?? ''}
                      onChange={(e) => updateProfileField('biz_no', e.target.value)}
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    renderTextValue(profile.biz_no)
                  )}
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">주소</label>
                {isProfileEditing ? (
                  <input
                    type="text"
                    value={profileDraft.address ?? ''}
                    onChange={(e) => updateProfileField('address', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  renderTextValue(profile.address)
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">대표자명</label>
                {isProfileEditing ? (
                  <input
                    type="text"
                    value={profileDraft.representative_name ?? ''}
                    onChange={(e) => updateProfileField('representative_name', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  renderTextValue(profile.representative_name)
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">대표 연락처</label>
                {isProfileEditing ? (
                  <input
                    type="text"
                    value={profileDraft.phone ?? ''}
                    onChange={(e) => updateProfileField('phone', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  renderTextValue(profile.phone)
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">담당자 이메일</label>
                {isProfileEditing ? (
                  <input
                    type="email"
                    value={profileDraft.contact_email ?? ''}
                    onChange={(e) => updateProfileField('contact_email', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  renderTextValue(profile.contact_email)
                )}
              </div>
            </div>
          </div>

          {latestProjectStep !== null && latestStepLabel ? (
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">STEP 진행도</h3>
                <span className="text-xs text-gray-500">STEP {latestProjectStep} · {latestStepLabel}</span>
              </div>
              <StepProgress currentStep={latestProjectStep} readonly />
            </div>
          ) : null}

          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">현재 프로젝트</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-24">프로젝트</span>
                {latestProject?.name ? (
                  <span className="font-medium text-gray-900">{latestProject.name}</span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-24">진행 상태</span>
                {latestStatusLabel ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${latestStatusStyle}`}>
                    {latestStatusLabel}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>
              {latestProject?.description && (
                <p className="text-sm text-gray-600">{latestProject.description}</p>
              )}
            </div>
          </div>

          {!presentationMode && (
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">리드 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Lead Source</label>
                  {isProfileEditing ? (
                    <select
                      value={profileDraft.lead_source ?? ''}
                      onChange={(e) => updateProfileField('lead_source', e.target.value)}
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">선택</option>
                      {leadSourceOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    renderTextValue(profile.lead_source)
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">첫 상담일</label>
                  {isProfileEditing ? (
                    <input
                      type="date"
                      value={profileDraft.first_contact ?? ''}
                      onChange={(e) => updateProfileField('first_contact', e.target.value)}
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    renderTextValue(profile.first_contact)
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">목표 런칭 시기</label>
                  {isProfileEditing ? (
                    <input
                      type="date"
                      value={profileDraft.target_launch ?? ''}
                      onChange={(e) => updateProfileField('target_launch', e.target.value)}
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    renderTextValue(profile.target_launch)
                  )}
                </div>
              </div>
            </div>
          )}

          {isProfileEditing && (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(false);
                  setProfileDraft(profileData);
                  setProfileError(null);
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50"
              >
                {profileSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}
        </div>
      )}

      {!presentationMode && activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Users</h2>
              <p className="text-sm text-gray-600">현재 {activeUserCount}명 / 5명</p>
            </div>
            <button
              type="button"
              onClick={() => setShowUserForm((prev) => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover"
            >
              <UserPlus className="w-4 h-4" />
              새 사용자 추가
            </button>
          </div>

          {!canAddUser && (
            <div className="bg-red-50 border-2 border-red-200 rounded-md p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-900 mb-1">최대 사용자 수 도달</p>
                  <p className="text-xs text-red-700">
                    MVP 하드 제한으로 고객사당 최대 5명까지만 사용자를 발급할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {showUserForm && (
            <div className="bg-white border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">새 사용자 발급</h3>
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!canAddUser) {
                    setFormError('최대 5명 제한에 도달했습니다.');
                    return;
                  }
                  setFormError(null);
                  setIssuedCredentials(null);
                  setSubmitting(true);

                  const response = await fetch(`/api/admin/companies/${resolvedParams.id}/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, name, phone, job_title: jobTitle, role: 'client_admin' }),
                  });

                  if (response.status === 401) {
                    router.replace('/login');
                    return;
                  }

                  const data = await response.json().catch(() => null);

                  if (!response.ok) {
                    const message = data?.error ?? '사용자 발급에 실패했습니다.';
                    setFormError(message);
                    showToast(message, 'error');
                    setSubmitting(false);
                    return;
                  }

                  const issuedPassword = data?.tempPassword ?? null;
                  if (issuedPassword) {
                    setIssuedCredentials({ email, password: issuedPassword });
                    setCreateCopyStatus(false);
                  }
                  setName('');
                  setEmail('');
                  setPhone('');
                  setJobTitle('');
                  setSubmitting(false);
                  showToast('사용자가 발급되었습니다.', 'success');
                  await loadUsers();
                }}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!canAddUser || submitting}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="홍길동"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={!canAddUser || submitting}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="user@company.com"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">연락처 (선택)</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!canAddUser || submitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="010-0000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">직급 (선택)</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      disabled={!canAddUser || submitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="예: 대표, 팀장, 담당자"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!canAddUser || submitting}
                  className="w-full bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary-hover transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {submitting ? '발급 중...' : '사용자 발급 (임시 비밀번호 자동 생성)'}
                </button>

                {issuedCredentials && (
                  <div className="border border-green-200 bg-green-50 rounded-md p-4 text-sm text-green-800">
                    <p className="font-semibold mb-2">✅ 사용자 발급 완료</p>
                    <div className="space-y-1 text-sm">
                      <p>이메일: {issuedCredentials.email}</p>
                      <p>임시 PW: {issuedCredentials.password}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyCredentials(
                          issuedCredentials.email,
                          issuedCredentials.password,
                          'create'
                        )
                      }
                      className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-sm border border-green-300 rounded-md text-green-800 hover:bg-green-100"
                    >
                      {createCopyStatus ? '✅ 복사됨' : '📋 ID/PW 복사하기'}
                    </button>
                  </div>
                )}

                {formError && <p className="text-sm text-red-600 text-center">{formError}</p>}

                {!canAddUser && (
                  <p className="text-sm text-red-600 text-center">
                    최대 5명 제한에 도달했습니다. 새 사용자를 추가하려면 기존 사용자를 비활성화하세요.
                  </p>
                )}
              </form>
            </div>
          )}

          {loading && <div className="text-sm text-gray-500">사용자 목록을 불러오는 중...</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="grid gap-4 md:grid-cols-2">
            {users.length === 0 ? (
              <div className="text-sm text-gray-500">등록된 사용자가 없습니다</div>
            ) : (
              users.map((item) => {
                const isEditing = userEditingId === item.user_id;
                const tempPasswordValue = userTempPasswords[item.user_id];
                const businessCardUrl = item.business_card_url ?? null;
                const businessCardInputId = `business-card-${item.user_id}`;
                const avatarInputId = `user-avatar-${item.user_id}`;
                const isBusinessCardImage = !!businessCardUrl && /\.(png|jpe?g|webp)(\?|$)/i.test(businessCardUrl);
                const displayName = item.name ?? item.email;
                const initial = displayName.trim().charAt(0) || '-';
                const avatarUrl = item.avatar_url ?? null;

                return (
                  <div
                    key={item.user_id}
                    onClick={() => {
                      if (!isEditing) {
                        handleUserEditStart(item);
                      }
                    }}
                    className={`bg-white border border-gray-200 rounded-xl p-4 transition-shadow relative ${
                      isEditing ? 'ring-2 ring-blue-400' : 'cursor-pointer hover:shadow-sm'
                    }`}
                  >
                    {isEditing && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenUserDeleteModal(item);
                        }}
                        className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-sm"
                      >
                        ✕
                      </button>
                    )}
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (userAvatarUploading[item.user_id]) return;
                              const input = document.getElementById(avatarInputId) as HTMLInputElement | null;
                              input?.click();
                            }}
                            className="w-12 h-12 rounded-full overflow-hidden border border-gray-200"
                          >
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="w-full h-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">{initial}</span>
                            )}
                          </button>
                          <div className="text-xs text-gray-500">
                            <p>프로필 이미지</p>
                            {avatarUrl && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (!window.confirm('프로필 이미지를 삭제하시겠습니까?')) return;
                                  handleUserAvatarDelete(item);
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                          <input
                            id={avatarInputId}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              handleUserAvatarUpload(item, file);
                              e.currentTarget.value = '';
                            }}
                          />
                        </div>
                        <div className="grid gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">이름</label>
                            <input
                              type="text"
                              value={userEditName}
                              onChange={(e) => setUserEditName(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">부서/직급</label>
                            <input
                              type="text"
                              value={userEditJobTitle}
                              onChange={(e) => setUserEditJobTitle(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">연락처</label>
                            <input
                              type="text"
                              value={userEditPhone}
                              onChange={(e) => setUserEditPhone(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">권한</label>
                            <select
                              value={userEditRole}
                              onChange={(e) => setUserEditRole(e.target.value as 'client_admin' | 'client_member')}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                            >
                              <option value="client_admin">ADMIN</option>
                              <option value="client_member">MEMBER</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">이메일</label>
                            <input
                              type="email"
                              value={item.email}
                              readOnly
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-2">명함</label>
                          <div className="flex flex-wrap items-center gap-3">
                            {businessCardUrl ? (
                              <>
                                {isBusinessCardImage ? (
                                  <button
                                    type="button"
                                    onClick={() => window.open(businessCardUrl, '_blank')}
                                    className="border border-gray-200 rounded-md overflow-hidden"
                                  >
                                    <img src={businessCardUrl} alt="business card" className="w-16 h-16 object-cover" />
                                  </button>
                                ) : (
                                  <a
                                    href={businessCardUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-600 underline"
                                  >
                                    PDF 보기
                                  </a>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-gray-400">명함 없음</span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById(businessCardInputId) as HTMLInputElement | null;
                                input?.click();
                              }}
                              disabled={businessCardUploading[item.user_id]}
                              className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-white disabled:opacity-50"
                            >
                              {businessCardUploading[item.user_id] ? '업로드 중...' : businessCardUrl ? '🔄 교체' : '📎 업로드'}
                            </button>
                            {businessCardUrl && (
                              <button
                                type="button"
                                onClick={() => handleOpenBusinessCardDeleteModal(item)}
                                className="text-xs text-red-500 hover:text-red-700"
                              >
                                삭제
                              </button>
                            )}
                            <input
                              id={businessCardInputId}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                handleBusinessCardUpload(item, file);
                                e.currentTarget.value = '';
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleResetPassword(item.user_id);
                            }}
                            disabled={resetLoading[item.user_id]}
                            className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-white disabled:opacity-50"
                          >
                            {resetLoading[item.user_id] ? '재발급 중...' : '비밀번호 재발급'}
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleUserEditCancel();
                              }}
                              className="px-3 py-2 text-sm border border-gray-300 rounded-md"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleUserSave(item.user_id);
                              }}
                              disabled={userUpdating[item.user_id]}
                              className="px-3 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50"
                            >
                              저장
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">{initial}</div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                              {item.job_title && <p className="text-sm text-gray-500 truncate">{item.job_title}</p>}
                              <p className="text-xs text-gray-500 truncate">{item.email}</p>
                              <p className="text-xs text-gray-500 truncate">{item.phone ?? '-'}</p>
                            </div>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                              item.role === 'client_admin' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {item.role === 'client_admin' ? 'ADMIN' : 'MEMBER'}
                          </span>
                        </div>
                        <div>
                          {businessCardUrl ? (
                            isBusinessCardImage ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  window.open(businessCardUrl, '_blank');
                                }}
                                className="border border-gray-200 rounded-md overflow-hidden"
                              >
                                <img src={businessCardUrl} alt="business card" className="w-16 h-16 object-cover" />
                              </button>
                            ) : (
                              <a
                                href={businessCardUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 underline"
                              >
                                PDF 보기
                              </a>
                            )
                          ) : (
                            <span className="text-xs text-gray-400">명함 없음</span>
                          )}
                        </div>
                      </div>
                    )}

                    {tempPasswordValue && (
                      <div className="mt-3 border border-green-200 bg-green-50 rounded-md p-4 text-sm text-green-800">
                        <p className="font-semibold mb-2">✅ 사용자 재발급 완료</p>
                        <div className="space-y-1 text-sm">
                          <p>이메일: {item.email}</p>
                          <p>임시 PW: {tempPasswordValue}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials(item.email, tempPasswordValue, item.user_id)}
                          className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-sm border border-green-300 rounded-md text-green-800 hover:bg-green-100"
                        >
                          {copyStatusByUser[item.user_id] ? '✅ 복사됨' : '📋 ID/PW 복사하기'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {!presentationMode && activeTab === 'contract' && (
        <div className="space-y-6">
          <div
            className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm"
            onClick={() => {
              if (!isProfileEditing) {
                setIsEditingProfile(true);
                setProfileDraft(profileData);
                setProfileError(null);
              }
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">계약 · 정산</h3>
              {!isProfileEditing && <span className="text-xs text-gray-500">클릭하여 편집</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">계약 상태</label>
                {isProfileEditing ? (
                  <select
                    value={profileDraft.contract_status ?? ''}
                    onChange={(e) => updateProfileField('contract_status', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">선택</option>
                    {contractStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-1">{renderBadgeValue(profile.contract_status ?? null, contractStatusStyles)}</div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">스타터 패키지</label>
                {isProfileEditing ? (
                  <label className="inline-flex items-center gap-3 mt-1">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={Boolean(profileDraft.starter_package)}
                      onChange={(e) => updateProfileField('starter_package', e.target.checked)}
                    />
                    <div className="w-10 h-6 bg-gray-200 peer-checked:bg-primary rounded-full relative transition-colors">
                      <span className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                    </div>
                    <span className="text-sm text-gray-600">{profileDraft.starter_package ? 'ON' : 'OFF'}</span>
                  </label>
                ) : (
                  <div className="mt-1">{renderBooleanBadge(profile.starter_package)}</div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">계약 시작일</label>
                {isProfileEditing ? (
                  <input
                    type="date"
                    value={profileDraft.contract_start ?? ''}
                    onChange={(e) => updateProfileField('contract_start', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  renderTextValue(profile.contract_start)
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">계약 종료일</label>
                {isProfileEditing ? (
                  <input
                    type="date"
                    value={profileDraft.contract_end ?? ''}
                    onChange={(e) => updateProfileField('contract_end', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  renderTextValue(profile.contract_end)
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">결제 현황</h3>
              <span className="text-xs text-gray-500">{paymentProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${paymentProgress}%` }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">프로젝트 전체 금액 (원)</label>
                {isProfileEditing ? (
                  <input
                    type="number"
                    value={profileDraft.total_amount ?? ''}
                    onChange={(e) => updateProfileField('total_amount', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  renderAmountValue(profile.total_amount)
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">예상 발주 수량</label>
                {isProfileEditing ? (
                  <input
                    type="text"
                    value={profileDraft.est_order_qty ?? ''}
                    onChange={(e) => updateProfileField('est_order_qty', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  renderTextValue(profile.est_order_qty)
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">계약금 30% 입금</p>
                {isProfileEditing ? (
                  <label className="inline-flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={Boolean(profileDraft.deposit_paid)}
                      onChange={(e) => updateProfileField('deposit_paid', e.target.checked)}
                    />
                    <div className="w-10 h-6 bg-gray-200 peer-checked:bg-primary rounded-full relative transition-colors">
                      <span className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                    </div>
                    <span className="text-sm text-gray-600">{profileDraft.deposit_paid ? 'ON' : 'OFF'}</span>
                  </label>
                ) : (
                  <div>{renderBooleanBadge(profile.deposit_paid)}</div>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">잔금 70% 입금</p>
                {isProfileEditing ? (
                  <label className="inline-flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={Boolean(profileDraft.balance_paid)}
                      onChange={(e) => updateProfileField('balance_paid', e.target.checked)}
                    />
                    <div className="w-10 h-6 bg-gray-200 peer-checked:bg-primary rounded-full relative transition-colors">
                      <span className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                    </div>
                    <span className="text-sm text-gray-600">{profileDraft.balance_paid ? 'ON' : 'OFF'}</span>
                  </label>
                ) : (
                  <div>{renderBooleanBadge(profile.balance_paid)}</div>
                )}
              </div>
            </div>
          </div>

          {isProfileEditing && (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(false);
                  setProfileDraft(profileData);
                  setProfileError(null);
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50"
              >
                {profileSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}
        </div>
      )}

      {!presentationMode && activeTab === 'notes' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">관심 카테고리</label>
                {isProfileEditing ? (
                  <div className="flex flex-wrap gap-3 mt-1">
                    {interestCategoryOptions.map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={interestCategories.includes(option)}
                          onChange={() => toggleProfileArrayValue('interest_category', option)}
                          className="accent-primary"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                ) : (
                  renderTagList(interestCategoryDisplay)
                )}
                {isProfileEditing && interestCategories.includes('기타') && (
                  <input
                    type="text"
                    value={profileDraft.interest_category_other ?? ''}
                    onChange={(e) => updateProfileField('interest_category_other', e.target.value)}
                    placeholder="직접 입력"
                    className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">현재 채널</label>
                {isProfileEditing ? (
                  <div className="flex flex-wrap gap-3 mt-1">
                    {channelOptions.map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={currentChannels.includes(option)}
                          onChange={() => toggleProfileArrayValue('current_channel', option)}
                          className="accent-primary"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                ) : (
                  renderTagList(currentChannelDisplay)
                )}
                {isProfileEditing && currentChannels.includes('기타') && (
                  <input
                    type="text"
                    value={profileDraft.current_channel_other ?? ''}
                    onChange={(e) => updateProfileField('current_channel_other', e.target.value)}
                    placeholder="직접 입력"
                    className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">목표 채널</label>
                {isProfileEditing ? (
                  <div className="flex flex-wrap gap-3 mt-1">
                    {channelOptions.map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={targetChannels.includes(option)}
                          onChange={() => toggleProfileArrayValue('target_channel', option)}
                          className="accent-primary"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                ) : (
                  renderTagList(targetChannelDisplay)
                )}
                {isProfileEditing && targetChannels.includes('기타') && (
                  <input
                    type="text"
                    value={profileDraft.target_channel_other ?? ''}
                    onChange={(e) => updateProfileField('target_channel_other', e.target.value)}
                    placeholder="직접 입력"
                    className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Pain Point</label>
                {isProfileEditing ? (
                  <textarea
                    value={profileDraft.pain_point ?? ''}
                    onChange={(e) => updateProfileField('pain_point', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
                  />
                ) : (
                  renderTextValue(profile.pain_point)
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Client Tier</label>
                {isProfileEditing ? (
                  <select
                    value={profileDraft.client_tier ?? ''}
                    onChange={(e) => updateProfileField('client_tier', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">선택</option>
                    {clientTierOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-1">{renderBadgeValue(profile.client_tier ?? null, clientTierStyles)}</div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">마지막 컨택일</label>
                {isProfileEditing ? (
                  <input
                    type="date"
                    value={profileDraft.last_contact ?? ''}
                    onChange={(e) => updateProfileField('last_contact', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  renderTextValue(profile.last_contact)
                )}
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Internal Notes</label>
                {isProfileEditing ? (
                  <textarea
                    value={profileDraft.internal_notes ?? ''}
                    onChange={(e) => updateProfileField('internal_notes', e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
                  />
                ) : (
                  renderTextValue(profile.internal_notes)
                )}
              </div>
            </div>
          </div>

          {isProfileEditing && (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(false);
                  setProfileDraft(profileData);
                  setProfileError(null);
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50"
              >
                {profileSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (presentationMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6">{pageContent}</div>
        <ToastContainer />
      </div>
    );
  }

  return (
    <AppLayout user={currentUser}>
      <div className="max-w-5xl">{pageContent}</div>

      {showCompanyDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">고객사를 삭제하시겠습니까?</h3>
            <p className="text-sm text-gray-600 mb-4">
              {company.name}의 모든 데이터가 삭제됩니다. 되돌릴 수 없습니다.
            </p>
            <input
              type="text"
              value={companyDeleteInput}
              onChange={(event) => setCompanyDeleteInput(event.target.value)}
              placeholder="삭제 를 입력해주세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCompanyDeleteModal(false);
                  setCompanyDeleteInput('');
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteCompany}
                disabled={companyDeleteInput !== '삭제' || deleteLoading}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md disabled:opacity-50"
              >
                {deleteLoading ? '삭제 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {userDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">사용자를 삭제하시겠습니까?</h3>
            <p className="text-sm text-gray-600 mb-4">
              {userDeleteTarget.name ?? userDeleteTarget.email} 사용자를 삭제합니다. 되돌릴 수 없습니다.
            </p>
            <input
              type="text"
              value={userDeleteInput}
              onChange={(event) => setUserDeleteInput(event.target.value)}
              placeholder="삭제 를 입력해주세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setUserDeleteTarget(null);
                  setUserDeleteInput('');
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmUserDelete}
                disabled={userDeleteInput !== '삭제' || removeLoading[userDeleteTarget.user_id]}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md disabled:opacity-50"
              >
                {removeLoading[userDeleteTarget.user_id] ? '삭제 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {businessCardDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">명함을 삭제하시겠습니까?</h3>
            <p className="text-sm text-gray-600 mb-4">
              {businessCardDeleteTarget.name ?? businessCardDeleteTarget.email} 명함을 삭제합니다.
            </p>
            <input
              type="text"
              value={businessCardDeleteInput}
              onChange={(event) => setBusinessCardDeleteInput(event.target.value)}
              placeholder="삭제 를 입력해주세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setBusinessCardDeleteTarget(null);
                  setBusinessCardDeleteInput('');
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmBusinessCardDelete}
                disabled={businessCardDeleteInput !== '삭제'}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md disabled:opacity-50"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </AppLayout>
  );
}
