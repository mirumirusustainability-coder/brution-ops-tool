'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { createBrowserClient } from '@supabase/ssr';
import { User, UserRole } from '@/types';

export default function BrandIdentityPage() {
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          브랜드 아이덴티티
        </h1>

        <div className="bg-white border border-border rounded-lg p-6">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-900">
                <strong>내부 전용:</strong> 브랜드 아이덴티티 PDF 업로드, 버전 관리, 승인 후 고객 공개 기능입니다.
                최대 30MB까지 업로드 가능합니다.
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                브랜드 아이덴티티 PDF 업로드
              </p>
              <p className="text-xs text-gray-500 mb-4">최대 30MB</p>
              <label className="inline-block bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-hover cursor-pointer transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                />
                파일 선택
              </label>
            </div>

            {!isStaffAdmin && (
              <p className="text-sm text-gray-500 text-center">
                ※ published 전환은 관리자(StaffAdmin)만 가능합니다
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
