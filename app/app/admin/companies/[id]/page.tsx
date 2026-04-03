'use client';

import { useEffect, useState, use } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { UserPlus, ShieldAlert, Mail, User, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
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
  company_id: string;
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

const renderBooleanBadge = (value?: boolean | null) => {
  if (value === null || value === undefined) return emptyValue;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        value ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
      }`}
    >
      {value ? '✅ 완료' : '❌ 미완료'}
    </span>
  );
};

const contractStatusStyles: Record<string, string> = {
  계약전: 'bg-gray-100 text-gray-600',
  진행중: 'bg-blue-50 text-blue-600',
  완료: 'bg-green-50 text-green-600',
};
const clientTierStyles: Record<string, string> = {
  일반: 'bg-gray-100 text-gray-600',
  VIP: 'bg-yellow-50 text-yellow-700',
  파트너: 'bg-purple-50 text-purple-700',
};
const renderBadgeValue = (value?: string | null, styleMap?: Record<string, string>) => {
  if (!value) return emptyValue;
  const styles = styleMap?.[value] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles}`}>
      {value}
    </span>
  );
};

export default function CompanyUsersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const presentationMode = searchParams.get('mode') === 'presentation';
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  useEffect(() => {
    if (presentationMode) {
      setIsEditingProfile(false);
      setProfileDraft(profileData);
      setProfileError(null);
    }
  }, [presentationMode, profileData]);
  const [company, setCompany] = useState<ApiCompany | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [userTempPasswords, setUserTempPasswords] = useState<Record<string, string>>({});
  const [resetLoading, setResetLoading] = useState<Record<string, boolean>>({});
  const [removeLoading, setRemoveLoading] = useState<Record<string, boolean>>({});
  const [businessCardUploading, setBusinessCardUploading] = useState<Record<string, boolean>>({});
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showCompanyDeleteModal, setShowCompanyDeleteModal] = useState(false);
  const [companyDeleteInput, setCompanyDeleteInput] = useState('');
  const [userDeleteTarget, setUserDeleteTarget] = useState<ApiUser | null>(null);
  const [userDeleteInput, setUserDeleteInput] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [profileData, setProfileData] = useState<CompanyMetadata>({});
  const [profileDraft, setProfileDraft] = useState<CompanyMetadata>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [issuedCredentials, setIssuedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [createCopyStatus, setCreateCopyStatus] = useState(false);
  const [copyStatusByUser, setCopyStatusByUser] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState({
    contract: false,
    sales: false,
    business: false,
    internal: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    const response = await fetch(`/api/admin/companies/${resolvedParams.id}/users`, {
      cache: 'no-store',
    });
    if (response.status === 401) {
      router.replace('/login');
      return;
    }
    if (response.status === 403) {
      setError('접근 권한이 없습니다');
      return;
    }
    if (!response.ok) {
      setError('사용자 목록을 불러올 수 없습니다');
      return;
    }
    const data = await response.json();
    setUsers(Array.isArray(data?.users) ? data.users : []);
  };

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      const sessionRole = session.user.user_metadata?.role ?? null;
      let me: any = null;

      if (sessionRole) {
        me = {
          userId: session.user.id,
          email: session.user.email ?? '',
          role: sessionRole,
          companyId: session.user.user_metadata?.company_id ?? null,
          mustChangePassword: false,
          status: 'active',
        };
      } else {
        const meResponse = await fetch('/api/auth/me', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (meResponse.status === 401) {
          router.replace('/login');
          return;
        }
        if (!meResponse.ok) {
          if (active) {
            setError('사용자 정보를 불러올 수 없습니다');
            setLoading(false);
          }
          return;
        }
        me = await meResponse.json();
      }

      const user = mapUser(me);

      if (active) {
        setCurrentUser(user);
      }

      if (user.role !== 'staff_admin') {
        if (active) {
          setLoading(false);
        }
        return;
      }

      const companyResponse = await fetch(`/api/admin/companies/${resolvedParams.id}`, {
        cache: 'no-store',
      });
      if (companyResponse.status === 401) {
        router.replace('/login');
        return;
      }
      if (!companyResponse.ok) {
        if (active) {
          setError('고객사 정보를 불러올 수 없습니다');
          setLoading(false);
        }
        return;
      }
      const companyData = await companyResponse.json().catch(() => null);
      const foundCompany = companyData?.company ?? null;

      if (active) {
        setCompany(foundCompany);
        const nextMetadata = (foundCompany?.metadata ?? {}) as CompanyMetadata;
        setProfileData(nextMetadata);
        setProfileDraft(nextMetadata);
        setProjects(Array.isArray(companyData?.projects) ? companyData.projects : []);
      }

      if (!foundCompany) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      await loadUsers();

      if (active) {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [resolvedParams.id, router]);

  const handleResetPassword = async (userId: string) => {
    setResetLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const response = await fetch(
        `/api/admin/companies/${resolvedParams.id}/users/${userId}/reset-password`,
        { method: 'POST' }
      );

      if (response.status === 401) {
        router.replace('/login');
        return;
      }

      if (!response.ok) {
        showToast('임시 비밀번호 발급에 실패했습니다', 'error');
        return;
      }

      const data = await response.json().catch(() => null);
      const newPassword = data?.tempPassword;
      if (newPassword) {
        setUserTempPasswords((prev) => ({ ...prev, [userId]: newPassword }));
        setCopyStatusByUser((prev) => ({ ...prev, [userId]: false }));
        showToast('임시 비밀번호가 발급되었습니다', 'success');
      }
    } finally {
      setResetLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleRemoveUser = (user: ApiUser) => {
    setUserDeleteTarget(user);
    setUserDeleteInput('');
  };

  const handleConfirmUserDelete = async () => {
    if (!userDeleteTarget) return;
    if (userDeleteInput !== '삭제') return;
    const userId = userDeleteTarget.user_id;

    setRemoveLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      const response = await fetch(`/api/admin/companies/${resolvedParams.id}/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.status === 401) {
        router.replace('/login');
        return;
      }

      if (!response.ok) {
        showToast('사용자 제거에 실패했습니다', 'error');
        return;
      }

      await loadUsers();
      showToast('사용자가 제거되었습니다', 'success');
      setUserDeleteTarget(null);
      setUserDeleteInput('');
    } finally {
      setRemoveLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleBusinessCardUpload = async (user: ApiUser, file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      showToast('jpeg/png/webp/pdf 파일만 업로드할 수 있습니다', 'error');
      return;
    }

    setBusinessCardUploading((prev) => ({ ...prev, [user.user_id]: true }));

    try {
      const supabase = createClient();
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${resolvedParams.id}/${user.user_id}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('business-cards')
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        showToast('명함 업로드에 실패했습니다', 'error');
        setBusinessCardUploading((prev) => ({ ...prev, [user.user_id]: false }));
        return;
      }

      const { data } = supabase.storage.from('business-cards').getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) {
        showToast('명함 URL 생성에 실패했습니다', 'error');
        setBusinessCardUploading((prev) => ({ ...prev, [user.user_id]: false }));
        return;
      }

      const response = await fetch(`/api/admin/companies/${resolvedParams.id}/users/${user.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_card_url: publicUrl }),
      });

      if (!response.ok) {
        showToast('명함 저장에 실패했습니다', 'error');
        setBusinessCardUploading((prev) => ({ ...prev, [user.user_id]: false }));
        return;
      }

      await loadUsers();
      showToast('명함이 업로드되었습니다', 'success');
    } catch {
      showToast('명함 업로드에 실패했습니다', 'error');
    } finally {
      setBusinessCardUploading((prev) => ({ ...prev, [user.user_id]: false }));
    }
  };

  const handleDeleteCompany = async () => {
    if (!company) return;
    if (companyDeleteInput !== '삭제') return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/admin/companies/${resolvedParams.id}`, {
        method: 'DELETE',
      });

      if (response.status === 401) {
        router.replace('/login');
        return;
      }

      if (!response.ok) {
        setError('고객사 삭제에 실패했습니다');
        showToast('고객사 삭제에 실패했습니다', 'error');
        return;
      }

      showToast('고객사가 삭제되었습니다', 'success');
      setShowCompanyDeleteModal(false);
      setCompanyDeleteInput('');
      router.replace('/app/admin/companies');
    } finally {
      setDeleteLoading(false);
    }
  };

  const updateProfileField = (key: keyof CompanyMetadata, value: CompanyMetadata[keyof CompanyMetadata]) => {
    setProfileDraft((prev) => ({ ...prev, [key]: value }));
  };

  const toggleProfileArrayValue = (key: keyof CompanyMetadata, value: string) => {
    setProfileDraft((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const exists = current.includes(value);
      const next = exists ? current.filter((item) => item !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileError(null);
    try {
      const response = await fetch(`/api/admin/companies/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: profileDraft }),
      });

      if (response.status === 401) {
        router.replace('/login');
        return;
      }

      if (!response.ok) {
        setProfileError('프로필 저장에 실패했습니다');
        showToast('프로필 저장에 실패했습니다', 'error');
        return;
      }

      const data = await response.json().catch(() => null);
      const nextMetadata = (data?.company?.metadata ?? profileDraft) as CompanyMetadata;
      setProfileData(nextMetadata);
      setProfileDraft(nextMetadata);
      setIsEditingProfile(false);
      showToast('프로필이 저장되었습니다', 'success');
    } finally {
      setProfileSaving(false);
    }
  };

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyCredentials = async (emailValue: string, passwordValue: string, key: string) => {
    try {
      await navigator.clipboard.writeText(`이메일: ${emailValue}\n임시 비밀번호: ${passwordValue}`);
      if (key === 'create') {
        setCreateCopyStatus(true);
        setTimeout(() => setCreateCopyStatus(false), 2000);
      } else {
        setCopyStatusByUser((prev) => ({ ...prev, [key]: true }));
        setTimeout(() => setCopyStatusByUser((prev) => ({ ...prev, [key]: false })), 2000);
      }
    } catch {
      showToast('복사에 실패했습니다', 'error');
    }
  };

  // SSOT 하드룰: StaffAdmin만 접근 가능
  const isStaffAdmin = currentUser?.role === 'staff_admin';

  if (loading && !currentUser) {
    return <div className="p-6 text-sm text-gray-500">로딩 중...</div>;
  }

  if (!currentUser) {
    return <div className="p-6 text-sm text-gray-500">사용자 정보를 확인할 수 없습니다.</div>;
  }

  if (!isStaffAdmin) {
    return (
      <AppLayout
        user={currentUser}
      >
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-900 mb-2">
              접근 권한이 없습니다
            </h2>
            <p className="text-red-700">
              사용자 발급은 관리자(StaffAdmin)만 가능합니다.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!company) {
    return (
      <AppLayout user={currentUser}>
        <div className="text-center py-12">
          <p className="text-gray-600">고객사를 찾을 수 없습니다</p>
        </div>
      </AppLayout>
    );
  }

  const activeUserCount = users.filter((item) => item.status === 'active').length;

  // SSOT 하드룰: Seat 5 하드 제한
  const canAddUser = activeUserCount < 5;
  const profile = isEditingProfile ? profileDraft : profileData;
  const interestCategories = Array.isArray(profile.interest_category) ? profile.interest_category : [];
  const currentChannels = Array.isArray(profile.current_channel) ? profile.current_channel : [];
  const targetChannels = Array.isArray(profile.target_channel) ? profile.target_channel : [];
  const interestCategoryDisplay = formatArrayWithOther(interestCategories, profile.interest_category_other ?? null);
  const currentChannelDisplay = formatArrayWithOther(currentChannels, profile.current_channel_other ?? null);
  const targetChannelDisplay = formatArrayWithOther(targetChannels, profile.target_channel_other ?? null);
  const latestProject = projects.length > 0 ? projects[0] : null;
  const latestProjectStep = typeof latestProject?.step === 'number' ? latestProject.step : null;
  const latestStepLabel = latestProjectStep !== null ? STEP_LABELS[latestProjectStep] : null;
  const statusLabels: Record<string, string> = {
    active: '진행중',
    completed: '완료',
    paused: '일시정지',
  };
  const latestStatusLabel = latestProject?.status ? statusLabels[latestProject.status] : null;

  const pageContent = (
      <div className="max-w-4xl">
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
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {company.name}{!presentationMode && ' - 사용자 관리'}
            </h1>
            <p className="text-sm text-gray-600">
              {presentationMode
                ? latestStatusLabel
                  ? `진행 상태: ${latestStatusLabel}`
                  : '진행 중인 프로젝트 없음'
                : `사용자를 발급하고 관리합니다 (${activeUserCount}/5명)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!presentationMode && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowCompanyDeleteModal(true);
                    setCompanyDeleteInput('');
                  }}
                  disabled={deleteLoading}
                  className="px-4 py-2 rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deleteLoading ? '삭제 중...' : '고객사 삭제'}
                </button>
                <button
                  type="button"
                  onClick={() => router.replace(`${pathname}?mode=presentation`)}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  📊 상담 모드
                </button>
              </>
            )}
          </div>
        </div>

        {presentationMode && (
          <div className="mb-6 grid gap-4">
            {latestProjectStep !== null && latestStepLabel && (
              <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">STEP 진행도</h3>
                  <span className="text-xs text-gray-500">
                    STEP {latestProjectStep} · {latestStepLabel}
                  </span>
                </div>
                <StepProgress currentStep={latestProjectStep} readonly />
              </div>
            )}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">진행중인 프로젝트</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-24">프로젝트</span>
                  <span className="font-medium text-gray-900">{latestProject?.name ?? '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-24">진행 상태</span>
                  <span className="text-gray-700">{latestStatusLabel ?? '-'}</span>
                </div>
                {latestProject?.description && (
                  <p className="text-sm text-gray-600">{latestProject.description}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 고객사 프로필 */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">고객사 프로필</h2>
            {!presentationMode && !isEditingProfile && (
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(true);
                  setProfileDraft(profileData);
                  setProfileError(null);
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                프로필 수정
              </button>
            )}
          </div>

          {profileError && <p className="text-sm text-red-600 mb-3">{profileError}</p>}

          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">기본 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">사업자번호</label>
                  {isEditingProfile ? (
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
                {!presentationMode && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">주소</label>
                    {isEditingProfile ? (
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
                )}
                {!presentationMode && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">대표 연락처</label>
                    {isEditingProfile ? (
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
                )}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">대표자 이름</label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profileDraft.representative_name ?? ''}
                      onChange={(e) => updateProfileField('representative_name', e.target.value)}
                      placeholder="홍길동"
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    renderTextValue(profile.representative_name)
                  )}
                </div>
                {!presentationMode && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">담당자 이메일</label>
                    {isEditingProfile ? (
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
                )}
              </div>
            </div>

            {!presentationMode && (
              <>
                <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection('contract')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 uppercase tracking-wide pb-2 border-b border-gray-100"
              >
                <span>계약 & 정산</span>
                {openSections.contract ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <div
                className={`${
                  openSections.contract
                    ? 'max-h-[9999px] opacity-100 overflow-hidden transition-all duration-300 ease-in-out'
                    : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">계약 상태</label>
                    {isEditingProfile ? (
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
                      <div className="mt-1">
                        {renderBadgeValue(profile.contract_status ?? null, contractStatusStyles)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">스타터 패키지</p>
                    {isEditingProfile ? (
                      <label className="inline-flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={Boolean(profileDraft.starter_package)}
                          onChange={(e) => updateProfileField('starter_package', e.target.checked)}
                        />
                        <div className="w-10 h-6 bg-gray-200 peer-checked:bg-primary rounded-full relative transition-colors">
                          <span className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                        </div>
                        <span className="text-sm text-gray-600">
                          {profileDraft.starter_package ? 'ON' : 'OFF'}
                        </span>
                      </label>
                    ) : (
                      <div>{renderBooleanBadge(profile.starter_package)}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">프로젝트 전체 금액 (원)</label>
                    {isEditingProfile ? (
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
                    {isEditingProfile ? (
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
                    {isEditingProfile ? (
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
                        <span className="text-sm text-gray-600">
                          {profileDraft.deposit_paid ? 'ON' : 'OFF'}
                        </span>
                      </label>
                    ) : (
                      <div>{renderBooleanBadge(profile.deposit_paid)}</div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">잔금 70% 입금</p>
                    {isEditingProfile ? (
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
                        <span className="text-sm text-gray-600">
                          {profileDraft.balance_paid ? 'ON' : 'OFF'}
                        </span>
                      </label>
                    ) : (
                      <div>{renderBooleanBadge(profile.balance_paid)}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">계약 시작일</label>
                    {isEditingProfile ? (
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
                    {isEditingProfile ? (
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
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection('sales')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 uppercase tracking-wide pb-2 border-b border-gray-100"
              >
                <span>영업 & 유입</span>
                {openSections.sales ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <div
                className={`${
                  openSections.sales
                    ? 'max-h-[9999px] opacity-100 overflow-hidden transition-all duration-300 ease-in-out'
                    : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Lead Source</label>
                    {isEditingProfile ? (
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
                      renderTextValue(profile.lead_source ?? null)
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">첫 상담일</label>
                    {isEditingProfile ? (
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
                    {isEditingProfile ? (
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
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection('business')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 uppercase tracking-wide pb-2 border-b border-gray-100"
              >
                <span>상품 & 비즈니스</span>
                {openSections.business ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <div
                className={`${
                  openSections.business
                    ? 'max-h-[9999px] opacity-100 overflow-hidden transition-all duration-300 ease-in-out'
                    : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">관심 카테고리</label>
                    {isEditingProfile ? (
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
                      renderArrayValue(interestCategoryDisplay)
                    )}
                    {isEditingProfile && interestCategories.includes('기타') && (
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
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">현재 운영 카테고리</label>
                    {isEditingProfile ? (
                      <div className="flex flex-wrap gap-3 mt-1">
                        {interestCategoryOptions.map((option) => (
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
                      renderArrayValue(currentChannelDisplay)
                    )}
                    {isEditingProfile && currentChannels.includes('기타') && (
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
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">목표 판매 채널</label>
                    {isEditingProfile ? (
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
                      renderArrayValue(targetChannelDisplay)
                    )}
                    {isEditingProfile && targetChannels.includes('기타') && (
                      <input
                        type="text"
                        value={profileDraft.target_channel_other ?? ''}
                        onChange={(e) => updateProfileField('target_channel_other', e.target.value)}
                        placeholder="직접 입력"
                        className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Pain Point</label>
                    {isEditingProfile ? (
                      <textarea
                        value={profileDraft.pain_point ?? ''}
                        onChange={(e) => updateProfileField('pain_point', e.target.value)}
                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
                      />
                    ) : (
                      renderTextValue(profile.pain_point)
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <button
                type="button"
                onClick={() => toggleSection('internal')}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 uppercase tracking-wide pb-2 border-b border-gray-100"
              >
                <span>내부 관리 (어드민 전용)</span>
                {openSections.internal ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <div
                className={`${
                  openSections.internal
                    ? 'max-h-[9999px] opacity-100 overflow-hidden transition-all duration-300 ease-in-out'
                    : 'max-h-0 opacity-0 overflow-hidden'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Client Tier</label>
                    {isEditingProfile ? (
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
                      <div className="mt-1">
                        {renderBadgeValue(profile.client_tier ?? null, clientTierStyles)}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">마지막 컨택일</label>
                    {isEditingProfile ? (
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
                    {isEditingProfile ? (
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
            </div>
          </div>

          {isEditingProfile && (
            <div className="flex justify-end gap-2 mt-6">
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
        </>
      )}
        </div>

        {!presentationMode && (
          <>
            {/* Seat 제한 경고 */}
            {!canAddUser && (
              <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-md p-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-900 mb-1">
                      최대 사용자 수 도달
                    </p>
                    <p className="text-xs text-red-700">
                      MVP 하드 제한으로 고객사당 최대 5명까지만 사용자를 발급할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Add User Form */}
            <div className="bg-white border border-border rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                새 사용자 발급
              </h2>

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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  연락처 (선택)
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  직급 (선택)
                </label>
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

        {loading && (
          <div className="text-sm text-gray-500 mb-4">사용자 목록을 불러오는 중...</div>
        )}
        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

        {/* Current Users List */}
        <div className="bg-white border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            현재 사용자 목록
          </h2>

          <div className="space-y-2">
            {users.length === 0 ? (
              <div className="text-sm text-gray-500">등록된 사용자가 없습니다</div>
            ) : (
              users.map((item) => {
                const tempPasswordValue = userTempPasswords[item.user_id];
                const businessCardUrl = item.business_card_url ?? null;
                const businessCardInputId = `business-card-${item.user_id}`;
                const isBusinessCardImage = !!businessCardUrl && /\.(png|jpe?g|webp)(\?|$)/i.test(businessCardUrl);

                return (
                  <div key={item.user_id} className="bg-muted rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.name ? `${item.name}${item.job_title ? ` · ${item.job_title}` : ''}` : '이름 없음'}
                          </p>
                          <p className="text-xs text-gray-500">{item.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleResetPassword(item.user_id)}
                          disabled={resetLoading[item.user_id]}
                          className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-white disabled:opacity-50"
                        >
                          {resetLoading[item.user_id] ? '재발급 중...' : '재발급'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(item)}
                          disabled={removeLoading[item.user_id]}
                          className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
                        >
                          {removeLoading[item.user_id] ? '제거 중...' : '제거'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      {businessCardUrl ? (
                        <div className="flex items-center gap-3">
                          {isBusinessCardImage ? (
                            <button
                              type="button"
                              onClick={() => window.open(businessCardUrl, '_blank')}
                              className="border border-gray-200 rounded-md overflow-hidden"
                            >
                              <img
                                src={businessCardUrl}
                                alt="business card"
                                className="w-16 h-16 object-cover"
                              />
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
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById(businessCardInputId) as HTMLInputElement | null;
                              input?.click();
                            }}
                            disabled={businessCardUploading[item.user_id]}
                            className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-white disabled:opacity-50"
                          >
                            {businessCardUploading[item.user_id] ? '업로드 중...' : '🔄 교체'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById(businessCardInputId) as HTMLInputElement | null;
                            input?.click();
                          }}
                          disabled={businessCardUploading[item.user_id]}
                          className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-white disabled:opacity-50"
                        >
                          {businessCardUploading[item.user_id] ? '업로드 중...' : '📎 명함 업로드'}
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
      </>
    )}
      </div>
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
      {pageContent}

      {showCompanyDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">정말 삭제하시겠습니까?</h3>
            <p className="text-sm text-gray-600 mb-4">
              {company.name} 계정이 영구 삭제됩니다.
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">정말 삭제하시겠습니까?</h3>
            <p className="text-sm text-gray-600 mb-4">
              {(userDeleteTarget.name ?? userDeleteTarget.email)} 계정이 영구 삭제됩니다.
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
                disabled={
                  userDeleteInput !== '삭제' ||
                  removeLoading[userDeleteTarget.user_id]
                }
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md disabled:opacity-50"
              >
                {removeLoading[userDeleteTarget.user_id] ? '삭제 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </AppLayout>
  );
}
