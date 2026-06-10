'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, AlertCircle, Copy, Check, Loader2, Download, ThumbsUp, ThumbsDown } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { createBrowserClient } from '@supabase/ssr';
import { User, UserRole } from '@/types';

const getAccessToken = async () => {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

type Strategy = 'order_fixed' | 'weight_based' | 'position_aware';

type NameCandidate = {
  id: string;
  title: string;
  strategy: Strategy;
  score: number;
  reason: string;
};

const STRATEGY_META: Record<Strategy, { label: string; description: string; badgeClass: string }> = {
  order_fixed: {
    label: '순서고정형',
    description: '메인 키워드 어순 유지 + 전진 배치 (검색 정확도 우선)',
    badgeClass: 'bg-blue-100 text-blue-700',
  },
  weight_based: {
    label: '가중치형',
    description: '핵심 토큰을 앞 1/3에 집중 배치 (노출 가중치 우선)',
    badgeClass: 'bg-purple-100 text-purple-700',
  },
  position_aware: {
    label: '위치최적형',
    description: '앞·중간·뒤 균형 배치 (가독성·클릭률 우선)',
    badgeClass: 'bg-teal-100 text-teal-700',
  },
};

export default function NamingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const [candidates, setCandidates] = useState<NameCandidate[]>([]);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [mainKeyword, setMainKeyword] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [features, setFeatures] = useState('');
  const [differentiators, setDifferentiators] = useState('');
  const [target, setTarget] = useState('');
  const [forbiddenWords, setForbiddenWords] = useState('');
  const [requiredWords, setRequiredWords] = useState('');

  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [strategyFilter, setStrategyFilter] = useState<Strategy | 'all'>('all');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (generating) return;

    setGenerating(true);
    setGenerationError(null);
    setHasResult(false);
    setFeedback({});
    setStrategyFilter('all');

    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch('/api/tools/naming', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mainKeyword,
          brand,
          category,
          features,
          differentiators,
          target,
          forbiddenWords,
          requiredWords,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setGenerationError(data.error ?? '생성 중 오류가 발생했습니다.');
        return;
      }

      setCandidates(data.candidates);
      setHasResult(true);
    } catch {
      setGenerationError('생성 요청에 실패했습니다. 네트워크를 확인해주세요.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (candidate: NameCandidate) => {
    await navigator.clipboard.writeText(candidate.title);
    setCopiedId(candidate.id);
    setTimeout(() => setCopiedId((prev) => (prev === candidate.id ? null : prev)), 2000);
  };

  const handleFeedback = (id: string, value: 'up' | 'down') => {
    setFeedback((prev) => {
      const next = { ...prev };
      if (next[id] === value) {
        delete next[id];
      } else {
        next[id] = value;
      }
      return next;
    });
  };

  const handleExport = async () => {
    if (exporting || candidates.length === 0) return;
    setExporting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      const rows = candidates.map((c) => ({
        title: c.title,
        strategy: c.strategy,
        score: c.score,
        reason: c.reason,
        feedback: feedback[c.id] === 'up' ? '좋아요' : feedback[c.id] === 'down' ? '별로예요' : '',
      }));
      const response = await fetch('/api/tools/export', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tool: 'naming', rows }),
      });
      if (!response.ok) {
        setGenerationError('엑셀 파일 생성에 실패했습니다.');
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '상품명_후보.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const visibleCandidates =
    strategyFilter === 'all'
      ? candidates
      : candidates.filter((c) => c.strategy === strategyFilter);

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">상품명 생성</h1>
          <p className="text-sm text-gray-500 mt-1">
            네이버 쇼핑 SEO 전략 3종(순서고정·가중치·위치최적)으로 상품명 후보를 생성하고 점수로 비교합니다
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">입력 정보</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메인 키워드 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="예: 스팀청소기 (네이버에서 검색될 핵심 키워드)"
                  value={mainKeyword}
                  onChange={(e) => setMainKeyword(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    브랜드
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="예: 브루션"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    카테고리
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="예: 생활가전 > 청소기"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제품 기능 <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-20"
                  placeholder="예: 고온 스팀 살균, 물걸레 겸용, 저소음"
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  차별점 <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-20"
                  placeholder="예: 10초 예열, 분리형 물탱크"
                  value={differentiators}
                  onChange={(e) => setDifferentiators(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  타깃 고객 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="예: 30-40대 가정, 반려동물 가구"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    placeholder="예: 무선, 살균"
                    value={requiredWords}
                    onChange={(e) => setRequiredWords(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    생성 중... (최대 1분)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    전략별 후보 생성 (9개)
                  </>
                )}
              </button>

              {generationError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                  {generationError}
                </div>
              )}
            </form>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    네이버 쇼핑 SEO 규칙 자동 적용
                  </p>
                  <p className="text-xs text-blue-700">
                    50자 이내 · 모바일 노출(앞 25자)에 핵심 키워드 배치 · 키워드 중복/특수문자/과장 표현 제외 규칙이 자동으로 반영됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">생성 결과</h2>

            {!hasResult ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                {generating ? (
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
                    <p className="text-sm">전략별 상품명 후보를 생성하고 있습니다...</p>
                  </div>
                ) : (
                  <p className="text-sm">정보를 입력하고 후보 생성을 눌러주세요</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Strategy Filter */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setStrategyFilter('all')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      strategyFilter === 'all'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    전체 ({candidates.length})
                  </button>
                  {(Object.keys(STRATEGY_META) as Strategy[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStrategyFilter(s)}
                      title={STRATEGY_META[s].description}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        strategyFilter === s
                          ? 'bg-gray-900 text-white'
                          : STRATEGY_META[s].badgeClass + ' hover:opacity-80'
                      }`}
                    >
                      {STRATEGY_META[s].label} ({candidates.filter((c) => c.strategy === s).length})
                    </button>
                  ))}
                </div>

                {/* Candidates */}
                <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                  {visibleCandidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-gray-900 flex-1">
                          {candidate.title}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-base font-bold text-primary">
                            {candidate.score}
                          </span>
                          <span className="text-xs text-gray-400">점</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STRATEGY_META[candidate.strategy].badgeClass}`}
                        >
                          {STRATEGY_META[candidate.strategy].label}
                        </span>
                        <span
                          className={`text-xs ${
                            candidate.title.length > 50 ? 'text-red-600 font-semibold' : 'text-gray-500'
                          }`}
                        >
                          {candidate.title.length}자{candidate.title.length > 50 ? ' (50자 초과!)' : ''}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 mb-3">{candidate.reason}</p>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopy(candidate)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-primary hover:bg-blue-50 rounded transition-colors"
                        >
                          {copiedId === candidate.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-600" />
                              복사됨
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              복사
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleFeedback(candidate.id, 'up')}
                          className={`p-1.5 rounded transition-colors ${
                            feedback[candidate.id] === 'up'
                              ? 'text-green-600 bg-green-50'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title="좋아요"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleFeedback(candidate.id, 'down')}
                          className={`p-1.5 rounded transition-colors ${
                            feedback[candidate.id] === 'down'
                              ? 'text-red-600 bg-red-50'
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title="별로예요"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Export */}
                <div className="pt-3 border-t border-gray-200">
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary-hover transition-colors disabled:opacity-60"
                  >
                    {exporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    엑셀 다운로드 (피드백 포함)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
