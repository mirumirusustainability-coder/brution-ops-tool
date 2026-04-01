'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, AlertCircle, Copy, Check, PenTool } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { createBrowserClient } from '@supabase/ssr';
import { User, UserRole } from '@/types';

const mockNamingResults = [
  '브루션 에어쿨 프라임',
  '에어슬림 쿨핏',
  '쿨에센스 플러스',
  '브리즈팝 라이트',
  '쿨베이스 프로',
  '에어컴포트 미니',
  '썸머핏 쿨링',
  '클린브리즈 맥스',
];

export default function NamingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const [features, setFeatures] = useState('');
  const [differentiators, setDifferentiators] = useState('');
  const [target, setTarget] = useState('');
  const [forbiddenWords, setForbiddenWords] = useState('');
  const [requiredWords, setRequiredWords] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasResult(false);

    setTimeout(() => {
      setResults(mockNamingResults);
      setHasResult(true);
    }, 800);
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">상품명 생성</h1>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">입력 정보</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제품 기능
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-20"
                  placeholder="예: 에너지 효율 1등급, 스마트 온도 조절, 저소음"
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  차별점
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-20"
                  placeholder="예: 10분 내 급속 냉방, 자동 필터 청소"
                  value={differentiators}
                  onChange={(e) => setDifferentiators(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  타깃 고객
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="예: 30-40대 가정, 1인 가구"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  금지어
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="예: 할인, 최저가"
                  value={forbiddenWords}
                  onChange={(e) => setForbiddenWords(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  필수어
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="예: 쿨, 에어"
                  value={requiredWords}
                  onChange={(e) => setRequiredWords(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                후보 생성
              </button>
            </form>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    입력 가이드
                  </p>
                  <p className="text-xs text-blue-700">
                    제품 기능과 차별점을 구체적으로 작성할수록 후보 정확도가 높아집니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">생성 결과</h2>

            {!hasResult ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <p className="text-sm">정보를 입력하고 후보 생성을 눌러주세요</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    후보 {results.length}개
                  </p>
                  <button
                    onClick={handleCopy}
                    className="text-xs text-primary hover:text-primary-hover flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        복사됨
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        복사
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-2">
                  {results.map((name, index) => (
                    <div
                      key={`${name}-${index}`}
                      className="flex items-center justify-between p-3 bg-muted rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <PenTool className="w-4 h-4 text-primary" />
                        <span className="text-sm text-gray-900">{name}</span>
                      </div>
                      <span className="text-xs text-gray-500">후보 {index + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
