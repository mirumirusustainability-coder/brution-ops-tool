'use client';

import { useState, use } from 'react';
import { UserPlus, ShieldAlert, Mail, User, AlertCircle } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { mockUsers, mockCompanies } from '@/lib/mock-data';
import { UserRole } from '@/types';

export default function CompanyUsersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [currentUser, setCurrentUser] = useState(mockUsers[0]);
  const [userCount, setUserCount] = useState(3); // Mock current user count

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
              사용자 발급은 관리자(StaffAdmin)만 가능합니다.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const company = mockCompanies.find((c) => c.id === resolvedParams.id);

  if (!company) {
    return (
      <AppLayout user={currentUser} onRoleChange={handleRoleChange}>
        <div className="text-center py-12">
          <p className="text-gray-600">고객사를 찾을 수 없습니다</p>
        </div>
      </AppLayout>
    );
  }

  // SSOT 하드룰: Seat 5 하드 제한
  const canAddUser = userCount < 5;

  return (
    <AppLayout
      user={currentUser}
      showRoleToggle={true}
      onRoleChange={handleRoleChange}
    >
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {company.name} - 사용자 관리
          </h1>
          <p className="text-sm text-gray-600">
            사용자를 발급하고 관리합니다 ({userCount}/5명)
          </p>
        </div>

        {/* Seat 제한 경고 */}
        {!canAddUser && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-md p-4">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900 mb-1">
                  최대 사용자 수 도달
                </p>
                <p className="text-xs text-red-700">
                  MVP 하드 제한으로 고객사당 최대 5명까지만 사용자를 발급할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add User Form */}
        <div className="bg-white border border-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            새 사용자 발급
          </h2>

          <form className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    disabled={!canAddUser}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="홍길동"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    disabled={!canAddUser}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="user@company.com"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                권한
              </label>
              <select
                disabled={!canAddUser}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="client_admin">고객 관리자</option>
                <option value="client_member">고객 일반</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!canAddUser}
              className="w-full bg-primary text-white py-2.5 rounded-md font-medium hover:bg-primary-hover transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              사용자 발급 (임시 비밀번호 자동 생성)
            </button>

            {!canAddUser && (
              <p className="text-sm text-red-600 text-center">
                최대 5명 제한에 도달했습니다. 새 사용자를 추가하려면 기존 사용자를 비활성화하세요.
              </p>
            )}
          </form>
        </div>

        {/* Current Users List */}
        <div className="bg-white border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            현재 사용자 목록
          </h2>

          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-muted rounded-md"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      사용자 {i}
                    </p>
                    <p className="text-xs text-gray-500">user{i}@company.com</p>
                  </div>
                </div>

                <button className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors">
                  비활성화
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
