'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
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

export function ExcelMode() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [mainKeyword, setMainKeyword] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EngineResult | null>(null);
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
    <div className="grid lg:grid-cols-[380px_1fr] gap-6">
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
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>
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
          <ResultView result={result} exporting={exporting} onExport={handleExport} />
        )}
      </div>
    </div>
  );
}
