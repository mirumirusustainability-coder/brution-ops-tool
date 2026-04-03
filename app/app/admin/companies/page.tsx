'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, ShieldAlert, Users, Download, UserPlus } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { ToastContainer } from '@/components/toast';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types';

type ApiCompany = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type StaffUser = {
  user_id: string;
  email: string;
  name: string | null;
  phone?: string | null;
  job_title?: string | null;
  role: 'staff_admin' | 'staff_member';
  status: 'active' | 'inactive';
};

const mapUser = (me: any): User => ({
  id: me.userId,
  email: me.email,
  name: me.email,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const handleDeleteStaff = async (userId: string) => {
    const confirmed = window.confirm('정말 삭제하시겠습니까?');
    if (!confirmed) return;
    setStaffDeleting((prev) => ({ ...prev, [userId]: true }));
    const response = await fetch(`/api/admin/staff/${userId}`, { method: 'DELETE' });
    if (response.status === 401) {
      router.replace('/login');
      return;
    }
    if (!response.ok) {
      showToast('직원 삭제에 실패했습니다', 'error');
      setStaffDeleting((prev) => ({ ...prev, [userId]: false }));
      return;
    }
    await loadStaff();
    setStaffDeleting((prev) => ({ ...prev, [userId]: false }));
    setStaffEditingId(null);
    showToast('삭제되었습니다', 'success');
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
                      {isStaffAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStaff(staff.user_id);
                          }}
                          disabled={staffDeleting[staff.user_id]}
                          className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-sm"
                        >
                          ✕
                        </button>
                      )}
                      {isEditing ? (
                        <div className="space-y-3">
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
                          <div className={`flex items-start justify-between gap-2 ${isStaffAdmin ? 'pr-6' : ''}`}>
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                                {initial}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {staff.name
                                    ? `${staff.name}${staff.job_title ? ` · ${staff.job_title}` : ''}`
                                    : staff.email}
                                </p>
                                <p className="text-xs text-slate-500">{staff.email}</p>
                              </div>
                            </div>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                staff.role === 'staff_admin' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {staff.role === 'staff_admin' ? 'ADMIN' : 'MEMBER'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">{staff.phone ?? '-'}</p>
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
          <div className="mb-6 bg-white border border-border rounded-lg p-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCompanyName.trim()) {
                  setError('고객사명을 입력하세요');
                  return;
                }
                setIsCreating(true);
                setError(null);
                const response = await fetch('/api/admin/companies', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: newCompanyName.trim() }),
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
                setShowCreateForm(false);
                setIsCreating(false);
                await loadCompanies();
              }}
              className="flex flex-col gap-3 md:flex-row md:items-center"
            >
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="고객사명 입력"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50"
                >
                  {isCreating ? '생성 중...' : '생성'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewCompanyName('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {loading && (
          <div className="text-sm text-gray-500 mb-4">고객사 목록을 불러오는 중...</div>
        )}
        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

        {/* Companies List */}
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map((company) => (
            <div
              key={company.id}
              onClick={() => router.push(`/app/admin/companies/${company.id}`)}
              className="bg-white border border-border rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {company.name}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>최대 5명</span>
                    </div>
                    <span className="text-xs">
                      {new Date(company.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Seat 5 하드 제한 안내 */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            <strong>MVP 하드 제한:</strong> 고객사당 최대 5명까지 사용자를 발급할 수 있습니다.
          </p>
        </div>
      </div>
      <ToastContainer />
    </AppLayout>
  );
}
