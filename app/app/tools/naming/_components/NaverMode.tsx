'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { ResultView, EngineResult } from './ResultView';

const getAccessToken = async () => {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

const CONSENT_KEY = 'brution_naver_consent_v1';

export function NaverMode({ userId }: { userId: string }) {
  const router = useRouter();
  const [mainKeyword, setMainKeyword] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EngineResult | null>(null);
  const [exporting, setExporting] = useState(false);

  const hasConsent = () =>
    typeof window !== 'undefined' && localStorage.getItem(`${CONSENT_KEY}:${userId}`) === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (generating || !mainKeyword.trim()) return;

    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      // 네이버 데이터 수집 동의(네이버 데이터 메뉴와 동일 동의) 자동 기록
      if (!hasConsent()) {
        localStorage.setItem(`${CONSENT_KEY}:${userId}`, 'true');
      }

      const response = await fetch('/api/tools/naming-naver', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mainKeyword: mainKeyword.trim(), consent: true }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? '상품명 생성 중 오류가 발생했습니다.');
        return;
      }
      setResult(data);
    } catch {
      setError('생성 요청에 실패했습니다. 네트워크를 확인해주세요.');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    if (exporting || !result) return;
    setExporting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      const response = await fetch('/api/tools/export', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'naming-excel',
          payload: {
            mainKeyword: result.mainKeyword,
            categorySummary: result.categorySummary,
            tags: result.tags,
            top: result.top,
            productNames: result.productNames,
          },
        }),
      });
      if (!response.ok) {
        setError('엑셀 파일 생성에 실패했습니다.');
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `상품명_${result.mainKeyword || '결과'}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">네이버 키워드 자동 분석</h2>
        <p className="text-xs text-gray-500 mb-4">
          엑셀 없이 키워드만 입력하면 네이버 공식 API로 연관검색어·검색량·상품수를 수집해 상품명을 생성합니다
        </p>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              type="text"
              value={mainKeyword}
              onChange={(e) => setMainKeyword(e.target.value)}
              placeholder="메인 키워드 입력 (예: 스팀청소기)"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <button
              type="submit"
              disabled={generating}
              className="px-6 bg-primary text-white rounded-md font-medium hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              상품명 생성
            </button>
          </div>
          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>

        <div className="mt-4 flex gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-3">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
          <p>
            네이버 공식 API(쇼핑 검색 + 검색광고)만 사용하며, 수집 이력은 감사 로그에 기록됩니다. 검색광고
            API에서 연관 키워드 최대 25개를 가져와 각각의 상품수를 조회한 뒤 분석합니다.
          </p>
        </div>
      </div>

      {generating && (
        <div className="bg-white border border-border rounded-lg p-12 text-center text-gray-400">
          <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
          <p className="text-sm">네이버에서 연관검색어와 상품수를 수집하고 상품명을 생성하고 있습니다...</p>
          <p className="text-xs text-gray-400 mt-1">키워드 수집·분석에 최대 1~2분 걸릴 수 있어요</p>
        </div>
      )}

      {result && !generating && (
        <ResultView result={result} exporting={exporting} onExport={handleExport} />
      )}

      {!result && !generating && (
        <div className="flex gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            네이버 검색광고 API의 연관 키워드는 메인 키워드 기준으로 자동 확장됩니다. 더 정밀한 통제가 필요하면
            &lsquo;정밀 생성 (엑셀)&rsquo; 탭에서 직접 가공한 연관검색어 시트를 업로드하세요.
          </p>
        </div>
      )}
    </div>
  );
}
