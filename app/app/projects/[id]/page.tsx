'use client';

import { useState, use } from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { StatusBadge } from '@/components/status-badge';
import { DownloadButton } from '@/components/download-button';
import { mockUsers, mockProjects, mockDeliverables, mockVersions } from '@/lib/mock-data';
import { UserRole, DeliverableType } from '@/types';

const deliverableLabels: Record<DeliverableType, string> = {
  keyword: '키워드 분석',
  ads: '광고 보조',
  market: '시장조사',
  brand_identity: '브랜드 아이덴티티',
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [currentUser, setCurrentUser] = useState(mockUsers[0]);

  const project = mockProjects.find((p) => p.id === resolvedParams.id);
  const projectDeliverables = mockDeliverables.filter(
    (d) => d.projectId === resolvedParams.id
  );

  const handleRoleChange = (role: UserRole) => {
    const user = mockUsers.find((u) => u.role === role) || mockUsers[0];
    setCurrentUser(user);
  };

  if (!project) {
    return (
      <AppLayout user={currentUser} onRoleChange={handleRoleChange}>
        <div className="text-center py-12">
          <p className="text-gray-600">프로젝트를 찾을 수 없습니다</p>
        </div>
      </AppLayout>
    );
  }

  // 고객은 internal 산출물 접근 불가
  const filteredDeliverables = currentUser.role.startsWith('client')
    ? projectDeliverables.filter((d) => d.visibility === 'client')
    : projectDeliverables;

  const isStaffAdmin = currentUser.role === 'staff_admin';

  return (
    <AppLayout
      user={currentUser}
      currentProject={{ id: project.id, name: project.name }}
      showRoleToggle={true}
      onRoleChange={handleRoleChange}
    >
      <div className="max-w-6xl">
        {/* Project Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-gray-600">{project.description}</p>
          )}
        </div>

        {/* Deliverables Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">산출물</h2>

          {filteredDeliverables.length === 0 ? (
            <div className="bg-muted rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">등록된 산출물이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDeliverables.map((deliverable) => {
                const versions = mockVersions.filter(
                  (v) => v.deliverableId === deliverable.id
                );
                const latestVersion = versions.sort((a, b) => b.versionNo - a.versionNo)[0];

                return (
                  <div
                    key={deliverable.id}
                    className="bg-white border border-border rounded-lg p-5"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-md">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {deliverableLabels[deliverable.type]}
                          </h3>
                          <p className="text-sm text-gray-500">
                            총 {versions.length}개 버전
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Versions */}
                    <div className="space-y-2">
                      {versions
                        .sort((a, b) => b.versionNo - a.versionNo)
                        .map((version) => (
                          <div
                            key={version.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-md"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <StatusBadge status={version.status} />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  v{version.versionNo}
                                </p>
                                {version.fileName && (
                                  <p className="text-xs text-gray-500">
                                    {version.fileName}
                                  </p>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(version.createdAt).toLocaleDateString('ko-KR')}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              {/* Download Button (SSOT 하드룰: published only for clients) */}
                              <DownloadButton
                                status={version.status}
                                userRole={currentUser.role}
                                fileName={version.fileName}
                                fileUrl={version.fileUrl}
                              />

                              {/* Publish Button (StaffAdmin only) */}
                              {isStaffAdmin && version.status === 'approved' && (
                                <button
                                  onClick={() => {
                                    alert(`v${version.versionNo}을(를) published 상태로 전환합니다`);
                                  }}
                                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                                >
                                  공개하기
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
