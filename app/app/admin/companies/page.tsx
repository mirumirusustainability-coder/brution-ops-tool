'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, ShieldAlert, Users, Download, UserPlus } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { ToastContainer } from '@/components/toast';
import { createBrowserClient } from '@supabase/ssr';
import { useToast } from '@/hooks/use-toast';
import { StepProgress } from '@/components/step-progress';
import { STEP_LABELS } from '@/lib/constants';
import { User } from '@/types';

type ApiCompany = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  latest_project?: {
    id: string;
    name: string | null;
    step: number | null;
    status?: 'active' | 'completed' | 'paused' | null;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
  client_admin_name?: string | null;
};

type StaffUser = {
  user_id: string;
  email: string;
  name: string | null;
  phone?: string | null;
  job_title?: string | null;
  avatar_url?: string | null;
  role: 'staff_admin' | 'staff_member';
  status: 'active' | 'inactive';
};

const mapUser = (me: any): User => ({
  id: me.userId,
  email: me.email,
  name: me.name ?? me.email,
  role: me.role,
  companyId: me.companyId ?? '',
  mustChangePassword: me.mustChangePassword,
  status: me.status,
});

export default function CompaniesAdminPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffJobTitle, setStaffJobTitle] = useState('');
  const [staffRole, setStaffRole] = useState<'staff_admin' | 'staff_member'>('staff_member');
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [issuedStaffCredentials, setIssuedStaffCredentials] = useState<{ email: string; password: string } | null>(null);
  const [staffCopyStatus, setStaffCopyStatus] = useState(false);
  const [staffEditingId, setStaffEditingId] = useState<string | null>(null);
  const [staffEditName, setStaffEditName] = useState('');
  const [staffEditPhone, setStaffEditPhone] = useState('');
  const [staffEditJobTitle, setStaffEditJobTitle] = useState('');
  const [staffEditRole, setStaffEditRole] = useState<'staff_admin' | 'staff_member'>('staff_member');
  const [staffUpdating, setStaffUpdating] = useState<Record<string, boolean>>({});
  const [staffDeleting, setStaffDeleting] = useState<Record<string, boolean>>({});
  const [staffDeleteTarget, setStaffDeleteTarget] = useState<StaffUser | null>(null);
  const [staffDeleteInput, setStaffDeleteInput] = useState('');
  const [staffAvatarUploading, setStaffAvatarUploading] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newBizNo, setNewBizNo] = useState('');
  const [newRepresentativeName, setNewRepresentativeName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContractStatus, setNewContractStatus] = useState('');
  const [newStarterPackage, setNewStarterPackage] = useState('');
  const [newContractStart, setNewContractStart] = useState('');
  const [newContractEnd, setNewContractEnd] = useState('');
  const [newTotalAmount, setNewTotalAmount] = useState('');
  const [newLeadSource, setNewLeadSource] = useState('');
  const [newFirstContact, setNewFirstContact] = useState('');
  const [newTargetLaunch, setNewTargetLaunch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'paused'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadCompanies = async () => {
    const response = await fetch('/api/admin/companies', { cache: 'no-store' });
    if (response.status === 401) {
      router.replace('/login');
      return;
    }
    if (response.status === 403) {
      setError('접근 권한이 없습니다');
      return;
    }
    if (!response.ok) {
      setError('고객사 목록을 불러올 수 없습니다');
      return;
    }
    const data = await response.json();
    setCompanies(Array.isArray(data?.companies) ? data.companies : []);
  };

  const loadStaff = async () => {
    setStaffLoading(true);
    setStaffError(null);
    const response = await fetch('/api/admin/staff', { cache: 'no-store' });
    if (response.status === 401) {
      router.replace('/login');
      setStaffLoading(false);
      return;
    }
    if (response.status === 403) {
      setStaffError('접근 권한이 없습니다');
      setStaffLoading(false);
      return;
    }
    if (!response.ok) {
      setStaffError('직원 목록을 불러올 수 없습니다');
      setStaffLoading(false);
      return;
    }
    const data = await response.json();
    setStaffUsers(Array.isArray(data?.staff) ? data.staff : []);
    setStaffLoading(false);
  };

  const handleCopyStaffCredentials = async (emailValue: string, passwordValue: string) => {
    try {
      await navigator.clipboard.writeText(`이메일: ${emailValue}\n임시 비밀번호: ${passwordValue}`);
      setStaffCopyStatus(true);
      setTimeout(() => setStaffCopyStatus(false), 2000);
    } catch {
      showToast('복사에 실패했습니다', 'error');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/companies/export');
      if (response.status === 401) {
        router.replace('/login');
        return;
      }
      if (!response.ok) {
        setError('엑셀 내보내기에 실패했습니다');
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'brution-companies.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStaffAdmin) {
      showToast('접근 권한이 없습니다', 'error');
      return;
    }
    if (!staffName.trim() || !staffEmail.trim()) {
      setStaffError('이름과 이메일을 입력해 주세요');
      return;
    }
    if (staffUsers.length >= 30) {
      setStaffError('최대 인원에 도달했습니다');
      return;
    }
    setStaffSubmitting(true);
    setStaffError(null);
    setIssuedStaffCredentials(null);

    const response = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: staffEmail.trim(),
        name: staffName.trim(),
        phone: staffPhone.trim() || null,
        job_title: staffJobTitle.trim() || null,
        role: staffRole,
      }),
    });

    if (response.status === 401) {
      router.replace('/login');
      return;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.error ?? '직원 발급에 실패했습니다';
      setStaffError(message);
      showToast(message, 'error');
      setStaffSubmitting(false);
      return;
    }

    const tempPassword = data?.tempPassword ?? null;
    if (tempPassword) {
      setIssuedStaffCredentials({ email: staffEmail.trim(), password: tempPassword });
      setStaffCopyStatus(false);
    }
    setStaffName('');
    setStaffEmail('');
    setStaffPhone('');
    setStaffJobTitle('');
    setStaffRole('staff_member');
    setStaffSubmitting(false);
    showToast('직원이 발급되었습니다', 'success');
    await loadStaff();
  };

  const handleStaffEditStart = (staff: StaffUser) => {
    setStaffEditingId(staff.user_id);
    setStaffEditName(staff.name ?? '');
    setStaffEditPhone(staff.phone ?? '');
    setStaffEditJobTitle(staff.job_title ?? '');
    setStaffEditRole(staff.role);
  };

  const handleStaffEditCancel = () => {
    setStaffEditingId(null);
    setStaffEditName('');
    setStaffEditPhone('');
    setStaffEditJobTitle('');
    setStaffEditRole('staff_member');
  };

  const handleStaffSave = async (userId: string) => {
    setStaffUpdating((prev) => ({ ...prev, [userId]: true }));
    const response = await fetch(`/api/admin/staff/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: staffEditName.trim(),
        phone: staffEditPhone.trim() || null,
        job_title: staffEditJobTitle.trim() || null,
        role: staffEditRole,
      }),
    });

    if (response.status === 401) {
      router.replace('/login');
      return;
    }

    if (!response.ok) {
      showToast('수정에 실패했습니다', 'error');
      setStaffUpdating((prev) => ({ ...prev, [userId]: false }));
      return;
    }

    await loadStaff();
    setStaffUpdating((prev) => ({ ...prev, [userId]: false }));
    setStaffEditingId(null);
    showToast('수정되었습니다', 'success');
  };

  const handleStaffAvatarUpload = async (staff: StaffUser, file: File) => {
    if (!isStaffAdmin) {
      showToast('접근 권한이 없습니다', 'error');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('jpeg/png/webp 파일만 업로드할 수 있습니다', 'error');
      return;
    }

    setStaffAvatarUploading((prev) => ({ ...prev, [staff.user_id]: true }));

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `avatars/${staff.user_id}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        showToast('프로필 이미지 업로드에 실패했습니다', 'error');
        setStaffAvatarUploading((prev) => ({ ...prev, [staff.user_id]: false }));
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) {
        showToast('이미지 URL을 생성하지 못했습니다', 'error');
        setStaffAvatarUploading((prev) => ({ ...prev, [staff.user_id]: false }));
        return;
      }

      const response = await fetch(`/api/admin/staff/${staff.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: publicUrl }),
      });

      if (!response.ok) {
        showToast('프로필 이미지 저장에 실패했습니다', 'error');
        setStaffAvatarUploading((prev) => ({ ...prev, [staff.user_id]: false }));
        return;
      }

      await loadStaff();
      showToast('프로필 이미지가 업데이트되었습니다', 'success');
    } catch {
      showToast('프로필 이미지 업로드에 실패했습니다', 'error');
    } finally {
      setStaffAvatarUploading((prev) => ({ ...prev, [staff.user_id]: false }));
    }
  };

  const handleDeleteStaff = async () => {
    if (!staffDeleteTarget) return;
    if (staffDeleteInput !== '삭제') return;
    const userId = staffDeleteTarget.user_id;

    setStaffDeleting((prev) => ({ ...prev, [userId]: true }));
    try {
      const response = await fetch(`/api/admin/staff/${userId}`, { method: 'DELETE' });
      if (response.status === 401) {
        router.replace('/login');
        return;
      }
      if (!response.ok) {
        showToast('직원 삭제에 실패했습니다', 'error');
        return;
      }
      await loadStaff();
      setStaffEditingId(null);
      setStaffDeleteTarget(null);
      setStaffDeleteInput('');
      showToast('삭제되었습니다', 'success');
    } finally {
      setStaffDeleting((prev) => ({ ...prev, [userId]: false }));
    }
  };

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
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
          name: session.user.user_metadata?.name ?? null,
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

      await loadCompanies();
      await loadStaff();

      if (active) {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [router]);

  // SSOT 하드룰: StaffAdmin만 접근 가능
  const isStaffAdmin = currentUser?.role === 'staff_admin';
  const isStaffMember = currentUser?.role === 'staff_member';
  const isStaff = isStaffAdmin || isStaffMember;
  const staffCount = staffUsers.length;
  const canAddStaff = staffCount < 30;

  const statusCounts = companies.reduce(
    (acc, company) => {
      const status = company.latest_project?.status ?? null;
      acc.all += 1;
      if (status === 'active') acc.active += 1;
      if (status === 'completed') acc.completed += 1;
      if (status === 'paused') acc.paused += 1;
      return acc;
    },
    { all: 0, active: 0, completed: 0, paused: 0 }
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredCompanies = companies.filter((company) => {
    const matchesStatus = statusFilter === 'all' || company.latest_project?.status === statusFilter;
    const matchesSearch = !normalizedSearch || company.name.toLowerCase().includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });

  const statusBadgeStyles: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-600',
    completed: 'bg-blue-50 text-blue-600',
    paused: 'bg-gray-100 text-gray-600',
  };

  const contractStatusOptions = ['상담중', '계약완료', '진행중', '완료', '보류'];

  if (loading && !currentUser) {
    return <div className="p-6 text-sm text-gray-500">로딩 중...</div>;
  }

  if (!currentUser) {
    return <div className="p-6 text-sm text-gray-500">사용자 정보를 확인할 수 없습니다.</div>;
  }

  if (!isStaff) {
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
              고객사 관리는 관리자(StaffAdmin)만 접근 가능합니다.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      user={currentUser}
    >
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">고객사 관리</h1>
            <p className="text-sm text-gray-600 mt-1">
              고객사를 등록하고 사용자를 발급합니다
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? '내보내는 중...' : '엑셀 내보내기'}
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              새 고객사 추가
            </button>
          </div>
        </div>

        {/* 브루션 팀 카드 */}
        <div className="mb-6 bg-slate-900/5 border border-slate-200 rounded-xl p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">브루션 팀</h2>
              <p className="text-sm text-slate-600">내부 스태프 관리</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-700">{staffCount} / 30명</span>
              {isStaffAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setShowStaffModal(true);
                    setStaffError(null);
                    setIssuedStaffCredentials(null);
                  }}
                  disabled={!canAddStaff}
                  className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  직원 추가
                </button>
              )}
            </div>
          </div>

          {staffError && <p className="mt-3 text-sm text-red-600">{staffError}</p>}
          {staffLoading ? (
            <p className="mt-4 text-sm text-slate-600">직원 목록을 불러오는 중...</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {staffUsers.length === 0 ? (
                <div className="col-span-full text-sm text-slate-500">등록된 직원이 없습니다</div>
              ) : (
                staffUsers.map((staff) => {
                  const isEditing = staffEditingId === staff.user_id;
                  const displayName = staff.name ?? staff.email;
                  const initial = (displayName ?? '').trim().charAt(0) || '-';
                  const avatarUrl = staff.avatar_url ?? null;
                  const avatarInputId = `staff-avatar-${staff.user_id}`;

                  return (
                    <div
                      key={staff.user_id}
                      onClick={() => {
                        if (isStaffAdmin && !isEditing) {
                          handleStaffEditStart(staff);
                        }
                      }}
                      className={`bg-white border border-gray-200 rounded-2xl p-4 transition-shadow relative ${
                        isEditing
                          ? 'ring-2 ring-blue-400'
                          : isStaffAdmin
                            ? 'cursor-pointer hover:shadow-md hover:border-blue-200'
                            : ''
                      }`}
                    >
                      {isEditing && isStaffAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStaffDeleteTarget(staff);
                            setStaffDeleteInput('');
                          }}
                          disabled={staffDeleting[staff.user_id]}
                          className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-sm"
                        >
                          ✕
                        </button>
                      )}
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (staffAvatarUploading[staff.user_id]) return;
                                const input = document.getElementById(avatarInputId) as HTMLInputElement | null;
                                input?.click();
                              }}
                              className="w-10 h-10 rounded-full overflow-hidden border border-gray-200"
                            >
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={`${displayName} avatar`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="w-full h-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                                  {initial}
                                </span>
                              )}
                            </button>
                            <div className="text-xs text-gray-500">
                              <p>프로필 이미지</p>
                              <p className="text-gray-400">jpeg/png/webp</p>
                            </div>
                            <input
                              id={avatarInputId}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                handleStaffAvatarUpload(staff, file);
                                e.currentTarget.value = '';
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">이름</label>
                            <input
                              type="text"
                              value={staffEditName}
                              onChange={(e) => setStaffEditName(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">부서/직급</label>
                            <input
                              type="text"
                              value={staffEditJobTitle}
                              onChange={(e) => setStaffEditJobTitle(e.target.value)}
                              placeholder="예: 개발팀 · 팀장, 디자인팀 · 담당자"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">연락처</label>
                            <input
                              type="text"
                              value={staffEditPhone}
                              onChange={(e) => setStaffEditPhone(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">권한</label>
                            <select
                              value={staffEditRole}
                              onChange={(e) => setStaffEditRole(e.target.value as 'staff_admin' | 'staff_member')}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                            >
                              <option value="staff_admin">ADMIN</option>
                              <option value="staff_member">MEMBER</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">이메일</label>
                            <p className="text-sm text-gray-700">{staff.email}</p>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStaffEditCancel();
                              }}
                              className="px-3 py-2 text-sm border border-gray-300 rounded-md"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStaffSave(staff.user_id);
                              }}
                              disabled={staffUpdating[staff.user_id]}
                              className="px-3 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50"
                            >
                              저장
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={`${displayName} avatar`}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                                  {initial}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{staff.name ?? staff.email}</p>
                                {staff.job_title ? (
                                  <p className="text-sm text-gray-500 truncate">{staff.job_title}</p>
                                ) : null}
                                <p className="text-xs text-slate-500 mt-1 truncate">{staff.email}</p>
                                <p className="text-xs text-slate-500 truncate">{staff.phone ?? '-'}</p>
                              </div>
                            </div>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${
                                staff.role === 'staff_admin' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {staff.role === 'staff_admin' ? 'ADMIN' : 'MEMBER'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
          {isStaffAdmin && !canAddStaff && (
            <p className="mt-3 text-xs text-red-600">최대 인원에 도달했습니다</p>
          )}
        </div>

        {showStaffModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">직원 추가</h3>
                  <p className="text-sm text-gray-600">내부 스태프 계정을 발급합니다.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleCreateStaff}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                    <input
                      type="text"
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                    <input
                      type="email"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">연락처 (선택)</label>
                    <input
                      type="text"
                      value={staffPhone}
                      onChange={(e) => setStaffPhone(e.target.value)}
                      placeholder="010-0000-0000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">부서/직급 (선택)</label>
                    <input
                      type="text"
                      value={staffJobTitle}
                      onChange={(e) => setStaffJobTitle(e.target.value)}
                      placeholder="예: 개발팀 · 팀장, 디자인팀 · 담당자"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">권한</label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as 'staff_admin' | 'staff_member')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="staff_admin">ADMIN</option>
                    <option value="staff_member">MEMBER</option>
                  </select>
                </div>

                {issuedStaffCredentials && (
                  <div className="border border-green-200 bg-green-50 rounded-md p-4 text-sm text-green-800">
                    <p className="font-semibold mb-2">✅ 직원 발급 완료</p>
                    <p>이메일: {issuedStaffCredentials.email}</p>
                    <p>임시 PW: {issuedStaffCredentials.password}</p>
                    <button
                      type="button"
                      onClick={() => handleCopyStaffCredentials(issuedStaffCredentials.email, issuedStaffCredentials.password)}
                      className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-sm border border-green-300 rounded-md text-green-800 hover:bg-green-100"
                    >
                      {staffCopyStatus ? '✅ 복사됨' : '📋 ID/PW 복사하기'}
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStaffModal(false)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={staffSubmitting || !canAddStaff}
                    className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50"
                  >
                    {staffSubmitting ? '발급 중...' : '직원 발급'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCreateForm && (
          <div className="mb-6 bg-white border border-border rounded-lg p-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const trimmedName = newCompanyName.trim();
                if (!trimmedName) {
                  setError('고객사명을 입력하세요');
                  return;
                }

                const metadata: Record<string, any> = {};
                if (newBizNo.trim()) metadata.biz_no = newBizNo.trim();
                if (newRepresentativeName.trim()) metadata.representative_name = newRepresentativeName.trim();
                if (newAddress.trim()) metadata.address = newAddress.trim();
                if (newPhone.trim()) metadata.phone = newPhone.trim();
                if (newContactEmail.trim()) metadata.contact_email = newContactEmail.trim();
                if (newContractStatus) metadata.contract_status = newContractStatus;
                if (newStarterPackage.trim()) metadata.starter_package = newStarterPackage.trim();
                if (newContractStart) metadata.contract_start = newContractStart;
                if (newContractEnd) metadata.contract_end = newContractEnd;
                if (newTotalAmount) metadata.total_amount = Number(newTotalAmount);
                if (newLeadSource.trim()) metadata.lead_source = newLeadSource.trim();
                if (newFirstContact) metadata.first_contact = newFirstContact;
                if (newTargetLaunch) metadata.target_launch = newTargetLaunch;

                setIsCreating(true);
                setError(null);
                const response = await fetch('/api/admin/companies', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: trimmedName,
                    metadata: Object.keys(metadata).length ? metadata : null,
                  }),
                });
                if (response.status === 401) {
                  router.replace('/login');
                  return;
                }
                if (response.status === 403) {
                  setError('접근 권한이 없습니다');
                  setIsCreating(false);
                  return;
                }
                if (!response.ok) {
                  setError('고객사 생성에 실패했습니다');
                  setIsCreating(false);
                  return;
                }
                setNewCompanyName('');
                setNewBizNo('');
                setNewRepresentativeName('');
                setNewAddress('');
                setNewPhone('');
                setNewContactEmail('');
                setNewContractStatus('');
                setNewStarterPackage('');
                setNewContractStart('');
                setNewContractEnd('');
                setNewTotalAmount('');
                setNewLeadSource('');
                setNewFirstContact('');
                setNewTargetLaunch('');
                setShowCreateForm(false);
                setIsCreating(false);
                showToast('고객사가 추가되었습니다', 'success');
                await loadCompanies();
              }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">기본 정보</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">회사명 *</label>
                    <input
                      type="text"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="고객사명 입력"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">사업자번호</label>
                    <input
                      type="text"
                      value={newBizNo}
                      onChange={(e) => setNewBizNo(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">대표자명</label>
                    <input
                      type="text"
                      value={newRepresentativeName}
                      onChange={(e) => setNewRepresentativeName(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">주소</label>
                    <input
                      type="text"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">연락처</label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">이메일</label>
                    <input
                      type="email"
                      value={newContactEmail}
                      onChange={(e) => setNewContactEmail(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">계약 정보</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">계약 상태</label>
                    <select
                      value={newContractStatus}
                      onChange={(e) => setNewContractStatus(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">선택</option>
                      {contractStatusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">스타터 패키지</label>
                    <input
                      type="text"
                      value={newStarterPackage}
                      onChange={(e) => setNewStarterPackage(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">계약 시작일</label>
                    <input
                      type="date"
                      value={newContractStart}
                      onChange={(e) => setNewContractStart(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">계약 종료일</label>
                    <input
                      type="date"
                      value={newContractEnd}
                      onChange={(e) => setNewContractEnd(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">총 계약금액</label>
                    <input
                      type="number"
                      value={newTotalAmount}
                      onChange={(e) => setNewTotalAmount(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">영업 정보</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">유입 경로</label>
                    <input
                      type="text"
                      value={newLeadSource}
                      onChange={(e) => setNewLeadSource(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">첫 컨택일</label>
                    <input
                      type="date"
                      value={newFirstContact}
                      onChange={(e) => setNewFirstContact(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">목표 출시일</label>
                    <input
                      type="date"
                      value={newTargetLaunch}
                      onChange={(e) => setNewTargetLaunch(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewCompanyName('');
                    setNewBizNo('');
                    setNewRepresentativeName('');
                    setNewAddress('');
                    setNewPhone('');
                    setNewContactEmail('');
                    setNewContractStatus('');
                    setNewStarterPackage('');
                    setNewContractStart('');
                    setNewContractEnd('');
                    setNewTotalAmount('');
                    setNewLeadSource('');
                    setNewFirstContact('');
                    setNewTargetLaunch('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50"
                >
                  {isCreating ? '생성 중...' : '생성'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading && (
          <div className="text-sm text-gray-500 mb-4">고객사 목록을 불러오는 중...</div>
        )}
        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          {(
            [
              { key: 'all', label: '전체', count: statusCounts.all },
              { key: 'active', label: '진행중', count: statusCounts.active },
              { key: 'completed', label: '완료', count: statusCounts.completed },
              { key: 'paused', label: '일시정지', count: statusCounts.paused },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                statusFilter === tab.key
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label} {tab.count}
            </button>
          ))}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="고객사 검색..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        {/* Companies List */}
        {filteredCompanies.length === 0 && !loading ? (
          <div className="text-sm text-gray-500">검색 결과가 없습니다</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredCompanies.map((company) => {
              const latestProject = company.latest_project ?? null;
              const statusValue = latestProject?.status ?? null;
              const statusStyle = statusValue ? statusBadgeStyles[statusValue] : '';
              const stepValue = typeof latestProject?.step === 'number' ? latestProject.step : null;
              const stepLabel = stepValue !== null ? STEP_LABELS[stepValue] : null;
              const managerName = company.client_admin_name ?? '-';

              return (
              <div
                key={company.id}
                onClick={() => router.push(`/app/admin/companies/${company.id}`)}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-blue-200 transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-md">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{company.name}</h3>
                        {statusValue && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle}`}>
                            {statusValue === 'active' ? '진행중' : statusValue === 'completed' ? '완료' : '일시정지'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">담당자: {managerName}</p>
                    </div>
                  </div>
                </div>

                {stepValue !== null && stepLabel ? (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium text-gray-700">
                      STEP {stepValue} · {stepLabel}
                    </div>
                    <StepProgress currentStep={stepValue} readonly />
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>최대 5명</span>
                  </div>
                  <span>마지막 수정일: {new Date(company.updated_at).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
            );
          })}
          </div>
        )}

        {/* Seat 5 하드 제한 안내 */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            <strong>MVP 하드 제한:</strong> 고객사당 최대 5명까지 사용자를 발급할 수 있습니다.
          </p>
        </div>
      </div>

      {staffDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">정말 삭제하시겠습니까?</h3>
            <p className="text-sm text-gray-600 mb-4">
              {(staffDeleteTarget.name ?? staffDeleteTarget.email)} 계정이 영구 삭제됩니다.
            </p>
            <input
              type="text"
              value={staffDeleteInput}
              onChange={(event) => setStaffDeleteInput(event.target.value)}
              placeholder="삭제 를 입력해주세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setStaffDeleteTarget(null);
                  setStaffDeleteInput('');
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteStaff}
                disabled={
                  staffDeleteInput !== '삭제' ||
                  staffDeleting[staffDeleteTarget.user_id]
                }
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md disabled:opacity-50"
              >
                {staffDeleting[staffDeleteTarget.user_id] ? '삭제 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </AppLayout>
  );
}
