'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, Plus, Clock } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { mockUsers, mockProjects } from '@/lib/mock-data';
import { UserRole } from '@/types';

export default function ProjectsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(mockUsers[0]);

  const handleRoleChange = (role: UserRole) => {
    const user = mockUsers.find((u) => u.role === role) || mockUsers[0];
    setCurrentUser(user);
  };

  // 고객은 자기 회사 프로젝트만 표시
  const filteredProjects = currentUser.role.startsWith('client')
    ? mockProjects.filter((p) => p.companyId === currentUser.companyId)
    : mockProjects;

  const canCreateProject = currentUser.role === 'staff_admin';

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
            <h1 className="text-2xl font-bold text-gray-900">프로젝트</h1>
            <p className="text-sm text-gray-600 mt-1">
              진행 중인 프로젝트를 관리하고 산출물을 확인하세요
            </p>
          </div>

          {canCreateProject && (
            <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-hover transition-colors">
              <Plus className="w-4 h-4" />
              새 프로젝트
            </button>
          )}
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 bg-muted rounded-lg">
            <Folder className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">등록된 프로젝트가 없습니다</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/app/projects/${project.id}`)}
                className="bg-white border border-border rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <Folder className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(project.updatedAt).toLocaleDateString('ko-KR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
