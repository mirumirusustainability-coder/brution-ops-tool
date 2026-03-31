'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, ShieldAlert, Mail, User, AlertCircle } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
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
  company_id: string | null;
  status: 'active' | 'inactive';
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};

type ApiCompany = {
  id: string;
  name: string;
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

export default function CompanyUsersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [company, setCompany] = useState<ApiCompany | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [userTempPasswords, setUserTempPasswords] = useState<Record<string, string>>({});
  const [resetLoading, setResetLoading] = useState<Record<string, boolean>>({});
  const [removeLoading, setRemoveLoading] = useState<Record<string, boolean>>({});
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'client_admin' | 'client_member'>('client_member');
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

      const companiesResponse = await fetch('/api/admin/companies', { cache: 'no-store' });
      if (companiesResponse.status === 401) {
        router.replace('/login');
        return;
      }
      if (!companiesResponse.ok) {
        if (active) {
          setError('고객사 정보를 불러올 수 없습니다');
          setLoading(false);
        }
        return;
      }
      const companiesData = await companiesResponse.json();
      const companyList = Array.isArray(companiesData?.companies) ? companiesData.companies : [];
      const foundCompany = companyList.find((item: ApiCompany) => item.id === resolvedParams.id) || null;

      if (active) {
        setCompany(foundCompany);
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
        showToast('임시 비밀번호가 발급되었습니다', 'success');
      }
    } finally {
      setResetLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleRemoveUser = async (userId: string, nameLabel: string) => {
    const confirmed = window.confirm(`정말 ${nameLabel}을 제거하시겠습니까?`);
    if (!confirmed) return;

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
    } finally {
      setRemoveLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleDeleteCompany = async () => {
    if (!company) return;
    const confirmed = window.confirm(
      `정말 ${company.name}을 삭제하시겠습니까? 모든 데이터가 삭제됩니다.`
    );
    if (!confirmed) return;

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
      router.replace('/app/admin/companies');
    } finally {
      setDeleteLoading(false);
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

  return (
    <AppLayout
      user={currentUser}
    >
      <div className="max-w-4xl">
        <Breadcrumb
          items={[
            { label: '브루션 관리자', href: '/app/admin' },
            { label: '고객사 관리', href: '/app/admin/companies' },
            { label: company.name },
          ]}
        />
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {company.name} - 사용자 관리
            </h1>
            <p className="text-sm text-gray-600">
              사용자를 발급하고 관리합니다 ({activeUserCount}/5명)
            </p>
          </div>
          <button
            type="button"
            onClick={handleDeleteCompany}
            disabled={deleteLoading}
            className="px-4 py-2 rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleteLoading ? '삭제 중...' : '고객사 삭제'}
          </button>
        </div>

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
              setTempPassword(null);
              setSubmitting(true);

              const response = await fetch(`/api/admin/companies/${resolvedParams.id}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, role }),
              });

              if (response.status === 401) {
                router.replace('/login');
                return;
              }

              const data = await response.json().catch(() => null);

              if (response.status === 400) {
                if (data?.error === 'SEAT_LIMIT_REACHED') {
                  setFormError('최대 5명 제한에 도달했습니다.');
                  showToast('최대 5명 제한에 도달했습니다.', 'error');
                } else {
                  setFormError('입력값을 확인해주세요.');
                  showToast('입력값을 확인해주세요.', 'error');
                }
                setSubmitting(false);
                return;
              }

              if (response.status === 403) {
                setFormError('접근 권한이 없습니다.');
                showToast('접근 권한이 없습니다.', 'error');
                setSubmitting(false);
                return;
              }

              if (!response.ok) {
                setFormError('사용자 발급에 실패했습니다.');
                showToast('사용자 발급에 실패했습니다.', 'error');
                setSubmitting(false);
                return;
              }

              setTempPassword(data?.tempPassword ?? null);
              setName('');
              setEmail('');
              setRole('client_member');
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                권한
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'client_admin' | 'client_member')}
                disabled={!canAddUser || submitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="client_admin">고객 관리자</option>
                <option value="client_member">고객 일반</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!canAddUser || submitting}
              className="w-full bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary-hover transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {submitting ? '발급 중...' : '사용자 발급 (임시 비밀번호 자동 생성)'}
            </button>

            {tempPassword && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
                임시 비밀번호: {tempPassword} — 복사 후 고객에게 전달하세요
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
              users.map((item) => (
                <div key={item.user_id} className="bg-muted rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.name ?? '이름 없음'}
                        </p>
                        <p className="text-xs text-gray-500">{item.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{item.role}</span>
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
                        onClick={() => handleRemoveUser(item.user_id, item.name ?? item.email)}
                        disabled={removeLoading[item.user_id]}
                        className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
                      >
                        {removeLoading[item.user_id] ? '제거 중...' : '제거'}
                      </button>
                    </div>
                  </div>

                  {userTempPasswords[item.user_id] && (
                    <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
                      임시 비밀번호: {userTempPasswords[item.user_id]} — 복사 후 고객에게 전달하세요
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <ToastContainer />
    </AppLayout>
  );
}
