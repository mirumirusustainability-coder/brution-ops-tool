'use client';

import { useState } from 'react';
import { Sparkles, ThumbsUp, ThumbsDown, Copy } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { DownloadButton } from '@/components/download-button';
import { mockUsers, mockAdResults } from '@/lib/mock-data';
import { AdResultItem } from '@/types';

export default function AdsPage() {
  const [currentUser, setCurrentUser] = useState(mockUsers[0]);
  const [generationCount, setGenerationCount] = useState<10 | 20>(20);
  const [hasResult, setHasResult] = useState(false);
  const [results, setResults] = useState<AdResultItem[]>([]);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock generation
    setTimeout(() => {
      setResults(mockAdResults);
      setHasResult(true);
    }, 2000);
  };

  const groupedResults = {
    headline: results.filter((r) => r.type === 'headline'),
    body: results.filter((r) => r.type === 'body'),
    hook: results.filter((r) => r.type === 'hook'),
    cta: results.filter((r) => r.type === 'cta'),
    creative: results.filter((r) => r.type === 'creative'),
  };

  return (
    <AppLayout user={currentUser}>
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
                className="w-full bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                생성하기
              </button>
            </form>
          </div>

          {/* Right Panel: Results */}
          <div className="bg-white border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              생성 결과
            </h2>

            {!hasResult ? (
              <div className="flex items-center justify-center h-96 text-gray-400">
                <p className="text-sm">정보를 입력하고 생성 버튼을 눌러주세요</p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                {/* Headline */}
                <ResultSection
                  title="헤드라인"
                  items={groupedResults.headline}
                />

                {/* Body */}
                <ResultSection
                  title="본문"
                  items={groupedResults.body}
                />

                {/* Hook */}
                <ResultSection
                  title="후킹 메시지"
                  items={groupedResults.hook}
                />

                {/* CTA */}
                <ResultSection
                  title="행동 유도 (CTA)"
                  items={groupedResults.cta}
                />

                {/* Creative */}
                <ResultSection
                  title="소재 아이디어"
                  items={groupedResults.creative}
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

                  <DownloadButton
                    status="approved"
                    userRole={currentUser.role}
                    assetId="asset-ads-tool-v1"
                    fileName="광고_문구_v1.xlsx"
                    className="w-full"
                  />
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
}: {
  title: string;
  items: AdResultItem[];
}) {
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
              <button className="p-1 text-gray-400 hover:text-primary">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  item.status === '선택'
                    ? 'bg-green-100 text-green-700'
                    : item.status === '보류'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {item.status}
              </span>
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
