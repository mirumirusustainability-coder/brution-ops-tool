'use client';

import { useState } from 'react';
import { Loader2, Download, Copy, Check, AlertCircle, Tag } from 'lucide-react';

export type TopKeyword = {
  keyword: string;
  searchVolume: number;
  productCount: number;
  competition: number;
};

export type ProductName = {
  title: string;
  usedKeywords: string[];
};

export type EngineResult = {
  mainKeyword: string;
  categorySummary: string;
  tags: string[];
  top: TopKeyword[];
  productNames: ProductName[];
  stats: { totalRows: number; excluded: number; topCount: number };
  sourceCount?: number;
};

const competitionTone = (c: number) => {
  if (c < 1) return 'text-green-600 font-semibold';
  if (c < 5) return 'text-gray-700';
  return 'text-red-500';
};

export function ResultView({
  result,
  exporting,
  onExport,
}: {
  result: EngineResult;
  exporting: boolean;
  onExport: () => void;
}) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx((prev) => (prev === idx ? null : prev)), 2000);
  };

  return (
    <>
      {/* 상품 정보 요약 */}
      <div className="bg-white border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">📦 상품 정보 요약</h3>
          <span className="text-xs text-gray-400">
            {result.sourceCount !== undefined
              ? `네이버 수집 ${result.sourceCount}개 · `
              : ''}
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
                  <td className="px-3 py-2 text-right text-gray-600">{t.searchVolume.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{t.productCount.toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right ${competitionTone(t.competition)}`}>{t.competition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          경쟁강도 = 상품수 ÷ 조회수 (낮을수록 공략 우선). 수치는 원본 그대로입니다.
        </p>
      </div>

      {/* 추천 상품명 */}
      <div className="bg-white border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            🧠 추천 상품명 {result.productNames.length}개
          </h3>
          <button
            onClick={onExport}
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
                  <span key={ki} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px]">
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
            추천 상품명은 공략 키워드 표에 존재하는 원문 키워드만으로 조합되었습니다. 표에 없는 키워드는 자동
            제외됩니다.
          </p>
        </div>
      </div>
    </>
  );
}
