'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Breadcrumb } from '@/components/breadcrumb';
import { ToastContainer } from '@/components/toast';
import { useToast } from '@/hooks/use-toast';
import { OverviewTab } from './OverviewTab';
import { UsersTab } from './UsersTab';
import { ContractsTab } from './ContractsTab';
import { NotesTab } from './NotesTab';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import type { ApiCompany, ApiProject, ApiUser, CompanyMetadata } from './types';
import type { User as AppUser } from '@/types';

type TabKey = 'overview' | 'users' | 'contracts' | 'notes';

type CompanyDetailClientProps = {
  currentUser: AppUser;
  company: ApiCompany;
  projects: ApiProject[];
  users: ApiUser[];
  error?: string | null;
};

export function CompanyDetailClient({
  currentUser,
  company,
  projects,
  users,
  error,
}: CompanyDetailClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showCompanyDeleteModal, setShowCompanyDeleteModal] = useState(false);

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
        onUpdate={handleCompanyUpdate}
      />
    );
  })();

  const pageContent = (
    <div className="max-w-4xl">
      <Breadcrumb
        items={[
          { label: '브루션 관리자', href: '/app/admin' },
          { label: '고객사 관리', href: '/app/admin/companies' },
          { label: company.name },
        ]}
      />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{company.name}</h1>
          <p className="text-sm text-gray-600">
            {`사용자를 발급하고 관리합니다 (${activeUserCount}/5명)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowCompanyDeleteModal(true)} className="px-4 py-2 rounded-md border border-red-300 text-red-600 hover:bg-red-50">
            고객사 삭제
          </button>
        </div>
      </div>

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

      {tabContent}
      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
    </div>
  );

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
