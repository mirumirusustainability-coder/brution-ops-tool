'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import {
  Search,
  Loader2,
  Download,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { User, UserRole } from '@/types';

const getAccessToken = async () => {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

type NaverProduct = {
  rank: number;
  productName: string;
  brand: string;
  maker: string;
  category: string;
  mallName: string;
  price: number | null;
  productType: string;
  link: string;
};

type NaverVolume = {
  keyword: string;
  monthlyPcCount: number;
  monthlyMobileCount: number;
  monthlyTotalCount: number;
  competition: string;
};

const CONSENT_KEY = 'brution_naver_consent_v1';

export default function NaverDataPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [consented, setConsented] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  const [keyword, setKeyword] = useState('');
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);
  const [products, setProducts] = useState<NaverProduct[]>([]);
  const [volume, setVolume] = useState<NaverVolume | null>(null);
  const [volumeError, setVolumeError] = useState<string | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      setLoading(true);
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

      if (active) {
        setCurrentUser(user);
        setConsented(localStorage.getItem(`${CONSENT_KEY}:${user.id}`) === 'true');
        setLoading(false);
      }
    };

    loadUser();
    return () => {
      active = false;
    };
  }, [router]);

  const handleConsent = () => {
    if (!consentChecked || !currentUser) return;
    localStorage.setItem(`${CONSENT_KEY}:${currentUser.id}`, 'true');
    setConsented(true);
  };

  const handleCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (collecting) return;

    setCollecting(true);
    setCollectError(null);
    setVolumeError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch('/api/tools/naver', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword, consent: true }),
      });

      const data = await response.json();
      if (!response.ok) {
        setCollectError(data.error ?? '데이터 수집 중 오류가 발생했습니다.');
        return;
      }

      setProducts(data.products);
      setVolume(data.volume);
      setVolumeError(data.volumeError ?? null);
      setHasResult(true);
    } catch {
      setCollectError('요청에 실패했습니다. 네트워크를 확인해주세요.');
    } finally {
      setCollecting(false);
    }
  };

  const handleExport = async () => {
    if (exporting || products.length === 0) return;
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
        body: JSON.stringify({ tool: 'naver', rows: products }),
      });
      if (!response.ok) {
        setCollectError('엑셀 파일 생성에 실패했습니다.');
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `네이버_${keyword}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
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

  // 동의 게이트
  if (!consented) {
    return (
      <AppLayout user={currentUser}>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">네이버 데이터 수집</h1>

          <div className="bg-white border border-border rounded-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">데이터 수집 동의</h2>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <p>
                본 기능은 <strong>네이버 공식 API</strong>(쇼핑 검색 API, 검색광고 API)를 통해
                공개된 상품 정보와 검색량 데이터를 조회합니다.
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-2 text-xs text-gray-600">
                <p className="font-medium text-gray-900 text-sm">수집·이용 내용</p>
                <p>• 수집 항목: 입력한 키워드, 해당 키워드의 공개 상품 목록(상품명·브랜드·카테고리·가격·판매처), 월간 검색량</p>
                <p>• 이용 목적: 키워드/상품명 최적화 및 시장 분석 컨설팅</p>
                <p>• 데이터 출처: 네이버 공식 Open API (약관 허용 범위 내)</p>
                <p>• 동의 이력은 감사 로그에 기록되며, 동의는 언제든 브라우저에서 철회할 수 있습니다.</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-xs text-amber-800">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    본 서비스는 비공식 크롤링이나 자동 우회 수집을 사용하지 않으며, 네이버가 공식
                    제공하는 API의 허용 범위 내에서만 데이터를 조회합니다.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-primary"
                />
                <span className="text-sm text-gray-900">
                  위 데이터 수집·이용 내용을 확인했으며 이에 동의합니다.
                </span>
              </label>
            </div>

            <button
              onClick={handleConsent}
              disabled={!consentChecked}
              className="mt-6 w-full bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              동의하고 시작하기
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={currentUser}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">네이버 데이터 수집</h1>
            <p className="text-sm text-gray-500 mt-1">
              네이버 공식 API로 키워드의 상위 상품과 검색량을 조회합니다
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem(`${CONSENT_KEY}:${currentUser.id}`);
              setConsented(false);
              setConsentChecked(false);
            }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            동의 철회
          </button>
        </div>

        <form onSubmit={handleCollect} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="조회할 키워드를 입력하세요 (예: 스팀청소기)"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <button
              type="submit"
              disabled={collecting}
              className="px-6 bg-primary text-white rounded-md font-medium hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              {collecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              조회
            </button>
          </div>
          {collectError && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
              {collectError}
            </div>
          )}
        </form>

        {!hasResult ? (
          <div className="bg-white border border-border rounded-lg p-12 text-center text-gray-400">
            <ShoppingCartIcon />
            <p className="text-sm mt-3">키워드를 입력하면 네이버 쇼핑 상위 상품과 검색량이 표시됩니다</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Volume */}
            {volume ? (
              <div className="bg-white border border-border rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-gray-900">
                    "{volume.keyword}" 월간 검색량
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">총 검색량</p>
                    <p className="text-lg font-bold text-gray-900">
                      {volume.monthlyTotalCount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">PC</p>
                    <p className="text-lg font-semibold text-gray-700">
                      {volume.monthlyPcCount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">모바일</p>
                    <p className="text-lg font-semibold text-gray-700">
                      {volume.monthlyMobileCount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">경쟁 정도</p>
                    <p className="text-lg font-semibold text-gray-700">{volume.competition}</p>
                  </div>
                </div>
              </div>
            ) : volumeError ? (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
                {volumeError}
              </div>
            ) : null}

            {/* Products */}
            <div className="bg-white border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  상위 상품 {products.length}개
                </h2>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary border border-primary/30 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-60"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  엑셀 다운로드
                </button>
              </div>

              <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-700 w-12">NO</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">상품명</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">브랜드</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">판매처</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-700">최저가</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((p) => (
                      <tr key={p.rank} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{p.rank}</td>
                        <td className="px-3 py-2 text-gray-900">
                          {p.productName}
                          {p.category && (
                            <span className="block text-[11px] text-gray-400 mt-0.5">
                              {p.category}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{p.brand || '-'}</td>
                        <td className="px-3 py-2 text-gray-600">{p.mallName || '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          {p.price ? `${p.price.toLocaleString()}원` : '-'}
                        </td>
                        <td className="px-3 py-2">
                          {p.link && (
                            <a
                              href={p.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-primary"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function ShoppingCartIcon() {
  return (
    <svg
      className="w-12 h-12 mx-auto text-gray-300"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 3h1.386c.51 0 .955.343 1.087.836l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
      />
    </svg>
  );
}
