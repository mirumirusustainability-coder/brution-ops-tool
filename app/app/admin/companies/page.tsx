'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, ShieldAlert, Users } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { mockUsers, mockCompanies } from '@/lib/mock-data';
import { UserRole } from '@/types';

export default function CompaniesAdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(mockUsers[0]);

  const handleRoleChange = (role: UserRole) => {
    const user = mockUsers.find((u) => u.role === role) || mockUsers[0];
    setCurrentUser(user);
  };

  // SSOT 하드룰: StaffAdmin만 접근 가능
  const isStaffAdmin = currentUser.role === 'staff_admin';

  if (!isStaffAdmin) {
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
              고객사 관리는 관리자(StaffAdmin)만 접근 가능합니다.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      user={currentUser}
      showRoleToggle={true}
      onRoleChange={handleRoleChange}
    >
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">고객사 관리</h1>
            <p className="text-sm text-gray-600 mt-1">
              고객사를 등록하고 사용자를 발급합니다
            </p>
          </div>

          <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-hover transition-colors">
            <Plus className="w-4 h-4" />
            새 고객사 추가
          </button>
        </div>

        {/* Companies List */}
        <div className="grid gap-4 md:grid-cols-2">
          {mockCompanies.map((company) => (
            <div
              key={company.id}
              onClick={() => router.push(`/app/admin/companies/${company.id}`)}
              className="bg-white border border-border rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {company.name}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>최대 {company.maxUsers}명</span>
                    </div>
                    <span className="text-xs">
                      {new Date(company.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Seat 5 하드 제한 안내 */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            <strong>MVP 하드 제한:</strong> 고객사당 최대 5명까지 사용자를 발급할 수 있습니다.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
