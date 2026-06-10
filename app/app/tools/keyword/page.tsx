'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Upload, FileSpreadsheet, FileJson, AlertCircle, ThumbsUp, ThumbsDown, Copy, Check, Loader2, Download } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { KeywordData, User, UserRole } from '@/types';

const getAccessToken = async () => {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

export default function KeywordAnalysisPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const [results, setResults] = useState<KeywordData[]>([]);
  const [copied, setCopied] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [truncatedInfo, setTruncatedInfo] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || analyzing) return;

    setAnalyzing(true);
    setAnalysisError(null);
    setTruncatedInfo(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/tools/keyword', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        setAnalysisError(data.error ?? '분석 중 오류가 발생했습니다.');
        return;
      }

      setResults(data.results);
      setHasResult(true);
      if (data.truncated) {
        setTruncatedInfo(
          `업로드된 ${data.totalUploaded}개 중 상위 ${data.analyzed}개만 분석되었습니다.`
        );
      }
    } catch {
      setAnalysisError('분석 요청에 실패했습니다. 네트워크를 확인해주세요.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopy = async () => {
    const tsv = [
      ['키워드', '검색량', '상품수', '카테고리', '분류', '메모'].join('\t'),
      ...results.map((r) =>
        [r.keyword, r.searchVolume ?? '', r.productCount ?? '', r.category ?? '', r.classification, r.customerNote ?? ''].join('\t')
      ),
    ].join('\n');
    await navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        body: JSON.stringify({ tool: 'keyword', rows: results }),
      });
      if (!response.ok) {
        setAnalysisError('엑셀 파일 생성에 실패했습니다.');
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '키워드_분석.xlsx';
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

  const summary = {
    total: results.length,
    maintain: results.filter((r) => r.classification === '유지').length,
    exclude: results.filter((r) => r.classification === '제외').length,
    check: results.filter((r) => r.classification === '확인필요').length,
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">키워드 분석</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Panel: Upload */}
          <div className="bg-white border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              파일 업로드
            </h2>

            {/* Upload Box */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
              {analyzing ? (
                <>
                  <Loader2 className="w-12 h-12 text-primary mx-auto mb-3 animate-spin" />
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    키워드를 분석하고 있습니다...
                  </p>
                  <p className="text-xs text-gray-500">
                    키워드 수에 따라 최대 1~2분 정도 걸릴 수 있어요
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Excel 또는 JSON 파일을 업로드하세요
                  </p>
                  <p className="text-xs text-gray-500 mb-4">최대 10MB</p>
                  <label className="inline-block bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-hover cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    파일 선택
                  </label>
                </>
              )}
            </div>

            {analysisError && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                {analysisError}
              </div>
            )}

            {/* File Format Info */}
            <div className="mt-6 space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      지원 형식
                    </p>
                    <div className="flex items-center gap-2 text-xs text-blue-700 mb-1">
                      <FileSpreadsheet className="w-4 h-4" />
                      Excel (.xlsx, .xls)
                    </div>
                    <div className="flex items-center gap-2 text-xs text-blue-700">
                      <FileJson className="w-4 h-4" />
                      JSON (.json)
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <p className="text-xs font-medium text-gray-900 mb-2">
                  필수/선택 컬럼 안내
                </p>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>• <strong>필수:</strong> 키워드</p>
                  <p>• <strong>선택:</strong> 검색량, 상품수, 카테고리, 광고비</p>
                  <p className="text-gray-500 mt-2">
                    ※ 선택 컬럼이 없어도 분석 가능합니다
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Results */}
          <div className="bg-white border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              분석 결과
            </h2>

            {!hasResult ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <p className="text-sm">파일을 업로드하면 결과가 표시됩니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {truncatedInfo && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-800">
                    {truncatedInfo}
                  </div>
                )}

                {/* Summary */}
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">요약</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">총 키워드:</span>
                      <span className="font-semibold ml-2">{summary.total}개</span>
                    </div>
                    <div>
                      <span className="text-gray-600">유지:</span>
                      <span className="font-semibold ml-2 text-green-600">
                        {summary.maintain}개
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">제외:</span>
                      <span className="font-semibold ml-2 text-red-600">
                        {summary.exclude}개
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">확인필요:</span>
                      <span className="font-semibold ml-2 text-yellow-600">
                        {summary.check}개
                      </span>
                    </div>
                  </div>
                </div>

                {/* Results Table Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      키워드 목록 ({results.length}개)
                    </h3>
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

                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-700">
                            키워드
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-gray-700">
                            검색량
                          </th>
                          <th className="text-center px-3 py-2 font-medium text-gray-700">
                            분류
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {results.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-900">
                              {item.keyword}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {item.searchVolume?.toLocaleString() || '-'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                  item.classification === '유지'
                                    ? 'bg-green-100 text-green-700'
                                    : item.classification === '제외'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {item.classification}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Feedback Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors">
                    <ThumbsUp className="w-4 h-4" />
                    유용해요
                  </button>
                  <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                    <ThumbsDown className="w-4 h-4" />
                    별로예요
                  </button>
                </div>

                {/* Download Section */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">
                    완성된 엑셀 파일을 다운로드하세요
                  </p>
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
