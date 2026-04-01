'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { createBrowserClient } from '@supabase/ssr';
import { User, UserRole } from '@/types';

export default function MarketResearchPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
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

      const me = await meResponse.json();
      const user: User = {
        id: me?.userId ?? '',
        email: me?.email ?? '',
        name: me?.name ?? me?.email ?? '',
        role: (me?.role ?? 'staff') as UserRole,
        companyId: me?.companyId ?? '',
        mustChangePassword: me?.mustChangePassword ?? false,
        status: (me?.status ?? 'active') as 'active' | 'inactive',
      };

      if (user.role !== 'staff_admin') {
        router.replace('/app/projects');
        return;
      }

      if (active) {
        setCurrentUser(user);
        setLoading(false);
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, [router]);

  if (loading && !currentUser) {
    return <div className="p-6 text-sm text-gray-500">로딩 중...</div>;
  }

  if (error && !currentUser) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  if (!currentUser) {
    return <div className="p-6 text-sm text-gray-500">사용자 정보를 확인할 수 없습니다.</div>;
  }

  const isStaffAdmin = currentUser.role === 'staff_admin';

  return (
    <AppLayout user={currentUser}>
      <div className="max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">시장조사 리포트</h1>

        <div className="bg-white border border-border rounded-lg p-6">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-900">
                <strong>내부 전용:</strong> 시장조사 리포트 관리 기능입니다.
                Evidence 수집, AI 초안 생성, PDF 렌더링 후 승인 절차를 거쳐 고객에게 공개할 수 있습니다.
              </p>
            </div>

            <div className="grid gap-4">
              <button className="w-full bg-primary text-white py-3 rounded-md hover:bg-primary-hover transition-colors">
                + 새 시장조사 리포트 생성
              </button>

              {!isStaffAdmin && (
                <p className="text-sm text-gray-500 text-center">
                  ※ published 전환은 관리자(StaffAdmin)만 가능합니다
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
