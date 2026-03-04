'use client';

import { useState } from 'react';
import { Upload, FileSpreadsheet, FileJson, AlertCircle, ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { StatusBadge } from '@/components/status-badge';
import { DownloadButton } from '@/components/download-button';
import { mockUsers, mockKeywordData } from '@/lib/mock-data';
import { UserRole, KeywordData } from '@/types';

export default function KeywordAnalysisPage() {
  const [currentUser, setCurrentUser] = useState(mockUsers[0]);
  const [hasResult, setHasResult] = useState(false);
  const [results, setResults] = useState<KeywordData[]>([]);
  const [copied, setCopied] = useState(false);

  const handleRoleChange = (role: UserRole) => {
    const user = mockUsers.find((u) => u.role === role) || mockUsers[0];
    setCurrentUser(user);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Mock processing
    setTimeout(() => {
      setResults(mockKeywordData);
      setHasResult(true);
    }, 1500);
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const summary = {
    total: results.length,
    maintain: results.filter((r) => r.classification === '유지').length,
    exclude: results.filter((r) => r.classification === '제외').length,
    check: results.filter((r) => r.classification === '확인필요').length,
  };

  return (
    <AppLayout
      user={currentUser}
      showRoleToggle={true}
      onRoleChange={handleRoleChange}
    >
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
            </div>

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
                      키워드 목록 (상위 {Math.min(5, results.length)}개)
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

                  <div className="overflow-x-auto">
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
                        {results.slice(0, 5).map((item, idx) => (
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
                  <DownloadButton
                    status="approved"
                    userRole={currentUser.role}
                    fileName="키워드_분석_v1.xlsx"
                    fileUrl="/mock/keyword.xlsx"
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
