'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Sparkles, ShoppingCart } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { createBrowserClient } from '@supabase/ssr';
import { User, UserRole } from '@/types';
import { ExcelMode } from './_components/ExcelMode';
import { SimpleMode } from './_components/SimpleMode';
import { NaverMode } from './_components/NaverMode';

type Mode = 'naver' | 'excel' | 'simple';

export default function NamingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('naver');

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

  return (
    <AppLayout user={currentUser}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">상품명 생성</h1>
          <p className="text-sm text-gray-500 mt-1">
            연관검색어·개발자코드 기반 정밀 분석 또는 간편 입력으로 네이버 SEO 상품명을 생성합니다
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setMode('naver')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'naver' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            네이버 연동 (키워드만)
          </button>
          <button
            onClick={() => setMode('excel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'excel' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            정밀 생성 (엑셀)
          </button>
          <button
            onClick={() => setMode('simple')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'simple' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            간편 생성 (텍스트)
          </button>
        </div>

        {mode === 'naver' ? (
          <NaverMode userId={currentUser.id} />
        ) : mode === 'excel' ? (
          <ExcelMode />
        ) : (
          <SimpleMode />
        )}
      </div>
    </AppLayout>
  );
}
