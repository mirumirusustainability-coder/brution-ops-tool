'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Breadcrumb } from '@/components/breadcrumb';
import { ToastContainer } from '@/components/toast';
import { useToast } from '@/hooks/use-toast';
import { OverviewTab } from './OverviewTab';
import { UsersTab } from './UsersTab';
import { ContractsTab } from './ContractsTab';
import { NotesTab } from './NotesTab';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import type { ApiCompany, ApiProject, ApiProjectWithDrops, ApiUser, CompanyMetadata } from './types';
import type { User as AppUser } from '@/types';

type TabKey = 'overview' | 'users' | 'contracts' | 'notes';

type CompanyDetailClientProps = {
  currentUser: AppUser;
  company: ApiCompany;
  projects: ApiProject[];
  users: ApiUser[];
  projectsWithDrops: ApiProjectWithDrops[];
  error?: string | null;
};

export function CompanyDetailClient({
  currentUser,
  company,
  projects,
  users,
  projectsWithDrops,
  error,
}: CompanyDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const presentationMode = searchParams.get('mode') === 'presentation';
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showCompanyDeleteModal, setShowCompanyDeleteModal] = useState(false);

  useEffect(() => {
    if (presentationMode) setActiveTab('overview');
  }, [presentationMode]);

  const refresh = async () => {
    router.refresh();
  };

  const handleCompanyUpdate = async (metadata: CompanyMetadata) => {
    const response = await fetch(`/api/admin/companies/${company.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata }),
    });
    if (response.status === 401) {
      router.replace('/login');
      return;
    }
    if (!response.ok) {
      showToast('프로필 저장에 실패했습니다', 'error');
      throw new Error('UPDATE_FAILED');
    }
    await refresh();
  };

  const handleDeleteCompany = async () => {
    try {
      const response = await fetch(`/api/admin/companies/${company.id}`, { method: 'DELETE' });
      if (response.status === 401) {
        router.replace('/login');
        return;
      }
      if (!response.ok) {
        showToast('고객사 삭제에 실패했습니다', 'error');
        return;
      }
      showToast('고객사가 삭제되었습니다', 'success');
      setShowCompanyDeleteModal(false);
      router.replace('/app/admin/companies');
    } catch {
      showToast('고객사 삭제에 실패했습니다', 'error');
    }
  };

  const latestProject = projects.length ? projects[0] : null;
  const statusLabels: Record<string, string> = { active: '진행중', completed: '완료', paused: '일시정지' };
  const latestStatusLabel = latestProject?.status ? statusLabels[latestProject.status] : null;
  const activeUserCount = users.filter((item) => item.status === 'active').length;
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: '현황' },
    { key: 'users', label: '팀 · 멤버' },
    { key: 'contracts', label: '계약 · 정산' },
    { key: 'notes', label: '히스토리' },
  ];

  const tabContent = (() => {
    if (activeTab === 'users') return <UsersTab company={company} users={users} onRefresh={refresh} />;
    if (activeTab === 'contracts') return <ContractsTab company={company} onUpdate={handleCompanyUpdate} />;
    if (activeTab === 'notes') return <NotesTab company={company} onUpdate={handleCompanyUpdate} />;
    return (
      <OverviewTab
        company={company}
        projects={projects}
        presentationMode={presentationMode}
        projectsWithDrops={projectsWithDrops}
        onUpdate={handleCompanyUpdate}
      />
    );
  })();

  const pageContent = (
    <div className="max-w-4xl">
      {presentationMode && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <div />
          <button
            type="button"
            onClick={() => router.replace(pathname)}
            className="px-3 py-1 text-sm rounded text-orange-700 underline underline-offset-2"
          >
            모드 종료
          </button>
        </div>
      )}
      {!presentationMode && (
        <Breadcrumb
          items={[
            { label: '브루션 관리자', href: '/app/admin' },
            { label: '고객사 관리', href: '/app/admin/companies' },
            { label: company.name },
          ]}
        />
      )}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{company.name}</h1>
          <p className="text-sm text-gray-600">
            {presentationMode
              ? latestStatusLabel
                ? `진행 상태: ${latestStatusLabel}`
                : '진행 중인 프로젝트 없음'
              : `사용자를 발급하고 관리합니다 (${activeUserCount}/5명)`}
          </p>
        </div>
        {!presentationMode && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowCompanyDeleteModal(true)} className="px-4 py-2 rounded-md border border-red-300 text-red-600 hover:bg-red-50">
              고객사 삭제
            </button>
            <button type="button" onClick={() => router.replace(`${pathname}?mode=presentation`)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">
              📊 상담 모드
            </button>
          </div>
        )}
      </div>

      {!presentationMode && (
        <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                activeTab === tab.key ? 'border-primary text-primary font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {presentationMode ? (
        <OverviewTab
          company={company}
          projects={projects}
          presentationMode
          projectsWithDrops={projectsWithDrops}
        />
      ) : (
        tabContent
      )}
      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
    </div>
  );

  if (presentationMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6">{pageContent}</div>
        <ToastContainer />
      </div>
    );
  }

  return (
    <AppLayout user={currentUser}>
      {pageContent}
      <DeleteConfirmModal
        isOpen={showCompanyDeleteModal}
        title="정말 삭제하시겠습니까?"
        description={`${company.name} 계정이 영구 삭제됩니다.`}
        onConfirm={handleDeleteCompany}
        onCancel={() => setShowCompanyDeleteModal(false)}
      />
      <ToastContainer />
    </AppLayout>
  );
}
