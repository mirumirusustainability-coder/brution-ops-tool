'use client';

import { useState } from 'react';
import { Upload, ShieldAlert } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { mockUsers } from '@/lib/mock-data';
import { UserRole } from '@/types';

export default function BrandIdentityPage() {
  const [currentUser, setCurrentUser] = useState(mockUsers[0]);

  const handleRoleChange = (role: UserRole) => {
    const user = mockUsers.find((u) => u.role === role) || mockUsers[0];
    setCurrentUser(user);
  };

  // SSOT 하드룰: 고객(Client)은 브랜드 아이덴티티 편집 접근 불가
  const isClient = currentUser.role.startsWith('client');

  if (isClient) {
    return (
      <AppLayout
        user={currentUser}
        showRoleToggle={true}
        onRoleChange={handleRoleChange}
      >
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-900 mb-2">
              접근 권한이 없습니다
            </h2>
            <p className="text-red-700">
              브랜드 아이덴티티 관리는 내부 직원만 접근 가능합니다.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isStaffAdmin = currentUser.role === 'staff_admin';

  return (
    <AppLayout
      user={currentUser}
      showRoleToggle={true}
      onRoleChange={handleRoleChange}
    >
      <div className="max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          브랜드 아이덴티티
        </h1>

        <div className="bg-white border border-border rounded-lg p-6">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-900">
                <strong>내부 전용:</strong> 브랜드 아이덴티티 PDF 업로드, 버전 관리, 승인 후 고객 공개 기능입니다.
                최대 30MB까지 업로드 가능합니다.
              </p>
            </div>

            {/* Upload Section */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                브랜드 아이덴티티 PDF 업로드
              </p>
              <p className="text-xs text-gray-500 mb-4">최대 30MB</p>
              <label className="inline-block bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-hover cursor-pointer transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                />
                파일 선택
              </label>
            </div>

            {!isStaffAdmin && (
              <p className="text-sm text-gray-500 text-center">
                ※ published 전환은 관리자(StaffAdmin)만 가능합니다
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
