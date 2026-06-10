'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Sparkles, ThumbsUp, ThumbsDown, Copy, Check, Loader2, Download } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { AdResultItem, User, UserRole } from '@/types';

const getAccessToken = async () => {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

const STATUS_CYCLE: Record<AdResultItem['status'], AdResultItem['status']> = {
  보류: '선택',
  선택: '제외',
  제외: '보류',
};

export default function AdsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generationCount, setGenerationCount] = useState<10 | 20>(20);
  const [hasResult, setHasResult] = useState(false);
  const [results, setResults] = useState<AdResultItem[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [productFeatures, setProductFeatures] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (generating) return;

    setGenerating(true);
    setGenerationError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch('/api/tools/ads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignName,
          targetAudience,
          productFeatures,
          count: generationCount,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setGenerationError(data.error ?? '생성 중 오류가 발생했습니다.');
        return;
      }

      setResults(data.items);
      setHasResult(true);
    } catch {
      setGenerationError('생성 요청에 실패했습니다. 네트워크를 확인해주세요.');
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusToggle = (id: string) => {
    setResults((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: STATUS_CYCLE[item.status] } : item
      )
    );
  };

  const handleExport = async () => {
    if (exporting || results.length === 0) return;
    setExporting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      const response = await fetch('/api/tools/export', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tool: 'ads', rows: results }),
      });
      if (!response.ok) {
        setGenerationError('엑셀 파일 생성에 실패했습니다.');
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '광고_문구.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
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
        if (active) {
          setError('로그인이 필요합니다');
          setLoading(false);
        }
        return;
      }

      const sessionRole = session.user.user_metadata?.role ?? null;
      let me: {
        userId: string;
        email: string;
        role: string | null;
        companyId: string | null;
        mustChangePassword: boolean;
        status: string;
      } | null = null;

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
          if (active) {
            setError('로그인이 필요합니다');
            setLoading(false);
          }
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

      const user: User = {
        id: me?.userId ?? '',
        email: me?.email ?? '',
        name: me?.email ?? '',
        role: (me?.role ?? 'staff') as UserRole,
        companyId: me?.companyId ?? '',
        mustChangePassword: me?.mustChangePassword ?? false,
        status: (me?.status ?? 'active') as 'active' | 'inactive',
      };

      if (active) {
        setCurrentUser(user);
        setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [router]);

  const groupedResults = {
    headline: results.filter((r) => r.type === 'headline'),
    body: results.filter((r) => r.type === 'body'),
    hook: results.filter((r) => r.type === 'hook'),
    cta: results.filter((r) => r.type === 'cta'),
    creative: results.filter((r) => r.type === 'creative'),
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
    <AppLayout user={currentUser!}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">광고 보조</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Panel: Input Form */}
          <div className="bg-white border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              캠페인 정보 입력
            </h2>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  캠페인명
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="예: 여름 시즌 에어컨 특가"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  타겟 고객
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-20"
                  placeholder="예: 30-40대 여성, 에너지 절약에 관심 있는 소비자"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제품 특징
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-20"
                  placeholder="예: 에너지 효율 1등급, 스마트 온도 조절, 조용한 작동"
                  value={productFeatures}
                  onChange={(e) => setProductFeatures(e.target.value)}
                  required
                />
              </div>

              {/* 생성량 프리셋 (SSOT 하드룰: 10/20, 전체 적용) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  생성량 (전체 항목에 적용)
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setGenerationCount(10)}
                    className={`flex-1 py-2 px-4 rounded-md border-2 transition-colors ${
                      generationCount === 10
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    10개
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenerationCount(20)}
                    className={`flex-1 py-2 px-4 rounded-md border-2 transition-colors ${
                      generationCount === 20
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    20개 (기본)
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  선택한 개수만큼 헤드라인, 본문, 후킹, CTA, 소재가 생성됩니다
                </p>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    생성 중... (최대 1~2분)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    생성하기
                  </>
                )}
              </button>

              {generationError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                  {generationError}
                </div>
              )}
            </form>
          </div>

          {/* Right Panel: Results */}
          <div className="bg-white border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              생성 결과
            </h2>

            {!hasResult ? (
              <div className="flex items-center justify-center h-96 text-gray-400">
                {generating ? (
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
                    <p className="text-sm">광고 문구를 생성하고 있습니다...</p>
                  </div>
                ) : (
                  <p className="text-sm">정보를 입력하고 생성 버튼을 눌러주세요</p>
                )}
              </div>
            ) : (
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                <p className="text-xs text-gray-500">
                  상태 뱃지를 클릭하면 보류 → 선택 → 제외 순서로 변경됩니다
                </p>

                {/* Headline */}
                <ResultSection
                  title="헤드라인"
                  items={groupedResults.headline}
                  onStatusToggle={handleStatusToggle}
                />

                {/* Body */}
                <ResultSection
                  title="본문"
                  items={groupedResults.body}
                  onStatusToggle={handleStatusToggle}
                />

                {/* Hook */}
                <ResultSection
                  title="후킹 메시지"
                  items={groupedResults.hook}
                  onStatusToggle={handleStatusToggle}
                />

                {/* CTA */}
                <ResultSection
                  title="행동 유도 (CTA)"
                  items={groupedResults.cta}
                  onStatusToggle={handleStatusToggle}
                />

                {/* Creative */}
                <ResultSection
                  title="소재 아이디어"
                  items={groupedResults.creative}
                  onStatusToggle={handleStatusToggle}
                />

                {/* Feedback & Download */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors">
                      <ThumbsUp className="w-4 h-4" />
                      유용해요
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                      <ThumbsDown className="w-4 h-4" />
                      별로예요
                    </button>
                  </div>

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
                    엑셀 다운로드
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

function ResultSection({
  title,
  items,
  onStatusToggle,
}: {
  title: string;
  items: AdResultItem[];
  onStatusToggle: (id: string) => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleItemCopy = async (item: AdResultItem) => {
    await navigator.clipboard.writeText(item.content);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId((prev) => (prev === item.id ? null : prev)), 2000);
  };

  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-3 bg-muted rounded-md hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-900 flex-1">{item.content}</p>
              <button
                onClick={() => handleItemCopy(item)}
                className="p-1 text-gray-400 hover:text-primary"
                title="복사"
              >
                {copiedId === item.id ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => onStatusToggle(item.id)}
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                  item.status === '선택'
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : item.status === '보류'
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {item.status}
              </button>
              {item.customerNote && (
                <span className="text-xs text-gray-500">
                  메모: {item.customerNote}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
