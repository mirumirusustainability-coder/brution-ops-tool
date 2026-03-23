'use client';

import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { mockUsers } from '@/lib/mock-data';

export default function MarketResearchPage() {
  const [currentUser, setCurrentUser] = useState(mockUsers[0]);

  // SSOT 하드룰: 고객(Client)은 시장조사 접근 불가
  const isClient = currentUser.role.startsWith('client');

  if (isClient) {
    return (
      <AppLayout user={currentUser}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-900 mb-2">
              접근 권한이 없습니다
            </h2>
            <p className="text-red-700">
              시장조사 리포트는 내부 직원만 접근 가능합니다.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isStaffAdmin = currentUser.role === 'staff_admin';

  return (
    <AppLayout user={currentUser}>
      <div className="max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">시장조사 리포트</h1>

        <div className="bg-white border border-border rounded-lg p-6">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-900">
                <strong>내부 전용:</strong> 시장조사 리포트 관리 기능입니다.
                Evidence 수집, AI 초안 생성, PDF 렌더링 후 승인 절차를 거쳐 고객에게 공개할 수 있습니다.
              </p>
            </div>

            {/* Mock UI for market research tool */}
            <div className="grid gap-4">
              <button className="w-full bg-primary text-white py-3 rounded-md hover:bg-primary-hover transition-colors">
                + 새 시장조사 리포트 생성
              </button>

              {!isStaffAdmin && (
                <p className="text-sm text-gray-500 text-center">
                  ※ published 전환은 관리자(StaffAdmin)만 가능합니다
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
