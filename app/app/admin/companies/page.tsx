'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, ShieldAlert, Users } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/types';

type ApiCompany = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
        showRoleToggle={false}
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
      showRoleToggle={false}
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

          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 고객사 추가
          </button>
        </div>

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
    </AppLayout>
  );
}
