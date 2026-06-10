'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Loader2,
  Download,
  Copy,
  Check,
  AlertCircle,
  Upload,
  Tag,
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

const getAccessToken = async () => {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

type TopKeyword = {
  keyword: string;
  searchVolume: number;
  productCount: number;
  competition: number;
};

type ProductName = {
  title: string;
  usedKeywords: string[];
};

type EngineResult = {
  mainKeyword: string;
  categorySummary: string;
  tags: string[];
  top: TopKeyword[];
  productNames: ProductName[];
  stats: { totalRows: number; excluded: number; topCount: number };
};

export function ExcelMode() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [mainKeyword, setMainKeyword] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EngineResult | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (generating || !file) return;

    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('mainKeyword', mainKeyword);

      const response = await fetch('/api/tools/naming-excel', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
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

  const handleCopy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx((prev) => (prev === idx ? null : prev)), 2000);
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

  const competitionTone = (c: number) => {
    if (c < 1) return 'text-green-600 font-semibold';
    if (c < 5) return 'text-gray-700';
    return 'text-red-500';
  };

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-6">
      {/* Left: input */}
      <div className="bg-white border border-border rounded-lg p-6 h-fit">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">엑셀 업로드</h2>
        <p className="text-xs text-gray-500 mb-4">연관검색어 + 개발자코드 시트가 포함된 엑셀</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메인 키워드</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="비워두면 자동 선정"
              value={mainKeyword}
              onChange={(e) => setMainKeyword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              엑셀 파일 <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-5 text-center hover:border-primary transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-900">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  {file.name}
                </div>
              ) : (
                <div className="text-gray-500">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">클릭하여 엑셀 선택</p>
                  <p className="text-xs text-gray-400 mt-1">.xlsx / 최대 10MB</p>
                </div>
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={generating || !file}
            className="w-full bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                분석 중... (최대 1분)
              </>
            ) : (
              '상품명 생성'
            )}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>

        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-md p-4 space-y-2">
          <p className="text-xs font-medium text-gray-900">엑셀 시트 구성</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• <strong>연관검색어</strong>: 키워드 / 총 검색수 / 상품수</p>
            <p>• <strong>개발자코드</strong>: 카테고리 / 속성 / 태그 / 기존 상품명</p>
          </div>
          <p className="text-[11px] text-gray-400 pt-1">
            ※ 경쟁강도(상품수÷조회수)는 엑셀 원본 수치로 자동 재계산되며, 값이 누락된 행은 자동 제외됩니다.
          </p>
        </div>
      </div>

      {/* Right: result */}
      <div className="space-y-6">
        {!result ? (
          <div className="bg-white border border-border rounded-lg p-12 text-center text-gray-400 h-full flex items-center justify-center">
            {generating ? (
              <div>
                <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
                <p className="text-sm">연관검색어를 분석하고 상품명을 생성하고 있습니다...</p>
              </div>
            ) : (
              <p className="text-sm">엑셀을 업로드하면 공략 키워드와 추천 상품명이 표시됩니다</p>
            )}
          </div>
        ) : (
          <>
            {/* 상품 정보 요약 */}
            <div className="bg-white border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">📦 상품 정보 요약</h3>
                <span className="text-xs text-gray-400">
                  전체 {result.stats.totalRows}개 · 제외 {result.stats.excluded}개 · 공략 {result.stats.topCount}개
                </span>
              </div>
              {result.mainKeyword && (
                <p className="text-sm text-gray-700 mb-1">
                  메인키워드: <strong>{result.mainKeyword}</strong>
                </p>
              )}
              <p className="text-sm text-gray-600 mb-3">{result.categorySummary}</p>
              <div className="flex flex-wrap gap-1.5">
                {result.tags.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                  >
                    <Tag className="w-3 h-3" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* 공략 키워드 TOP15 */}
            <div className="bg-white border border-border rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                🎯 공략 키워드 TOP{result.top.length}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-700 w-10">#</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">키워드</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-700">조회수</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-700">상품수</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-700">경쟁강도</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.top.map((t, i) => (
                      <tr key={t.keyword} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 text-gray-900 font-medium">{t.keyword}</td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          {t.searchVolume.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          {t.productCount.toLocaleString()}
                        </td>
                        <td className={`px-3 py-2 text-right ${competitionTone(t.competition)}`}>
                          {t.competition}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                경쟁강도 = 상품수 ÷ 조회수 (낮을수록 공략 우선). 수치는 엑셀 원본 그대로입니다.
              </p>
            </div>

            {/* 추천 상품명 */}
            <div className="bg-white border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">🧠 추천 상품명 {result.productNames.length}개</h3>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary border border-primary/30 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-60"
                >
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  엑셀 다운로드
                </button>
              </div>

              <div className="space-y-3">
                {result.productNames.map((p, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-gray-900 flex-1">{p.title}</p>
                      <button
                        onClick={() => handleCopy(p.title, i)}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-primary"
                        title="복사"
                      >
                        {copiedIdx === i ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs ${
                          p.title.length > 50 ? 'text-red-600 font-semibold' : 'text-gray-500'
                        }`}
                      >
                        {p.title.length}자{p.title.length > 50 ? ' (50자 초과!)' : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {p.usedKeywords.map((k, ki) => (
                        <span
                          key={ki}
                          className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px]"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  추천 상품명은 공략 키워드 표에 존재하는 연관검색어 원문만으로 조합되었습니다. 표에 없는 키워드는
                  자동 제외됩니다.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
