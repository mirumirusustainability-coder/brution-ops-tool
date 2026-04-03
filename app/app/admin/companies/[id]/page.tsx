'use client';
import { useEffect, useState, use } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Breadcrumb } from '@/components/breadcrumb';
import { ToastContainer } from '@/components/toast';
import { useToast } from '@/hooks/use-toast';
import { isStaffAdmin } from '@/lib/supabase/auth';
import { OverviewTab } from './_components/OverviewTab';
import { UsersTab } from './_components/UsersTab';
import { ContractsTab } from './_components/ContractsTab';
import { NotesTab } from './_components/NotesTab';
import { DeleteConfirmModal } from './_components/DeleteConfirmModal';
import { useCompanyDetail } from './_components/useCompanyDetail';

type PageProps = { params: Promise<{ id: string }> };

type TabKey = 'overview' | 'users' | 'contracts' | 'notes';

export default function CompanyUsersPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const presentationMode = searchParams.get('mode') === 'presentation';
  const { currentUser, company, projects, users, loading, error, refreshUsers, updateCompany, deleteCompany } =
    useCompanyDetail(resolvedParams.id);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showCompanyDeleteModal, setShowCompanyDeleteModal] = useState(false);

  useEffect(() => {
    if (presentationMode) setActiveTab('overview');
  }, [presentationMode]);

  const handleDeleteCompany = async () => {
    if (!company) return;
    try {
      await deleteCompany();
      showToast('고객사가 삭제되었습니다', 'success');
      setShowCompanyDeleteModal(false);
      router.replace('/app/admin/companies');
    } catch {
      showToast('고객사 삭제에 실패했습니다', 'error');
    }
  };

  if (loading && !currentUser) return <div className="p-6 text-sm text-gray-500">로딩 중...</div>;
  if (!currentUser) return <div className="p-6 text-sm text-gray-500">사용자 정보를 확인할 수 없습니다.</div>;
  if (!isStaffAdmin(currentUser.role)) {
    return (
      <AppLayout user={currentUser}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-xl font-bold text-red-900 mb-2">접근 권한이 없습니다</h2>
            <p className="text-red-700">사용자 발급은 관리자(StaffAdmin)만 가능합니다.</p>
          </div>
        </div>
      </AppLayout>
    );
  }
  if (!company) {
    return (
      <AppLayout user={currentUser}>
        <div className="text-center py-12">
          <p className="text-gray-600">고객사를 찾을 수 없습니다</p>
        </div>
      </AppLayout>
    );
  }

  const latestProject = projects.length ? projects[0] : null;
  const statusLabels: Record<string, string> = { active: '진행중', completed: '완료', paused: '일시정지' };
  const latestStatusLabel = latestProject?.status ? statusLabels[latestProject.status] : null;
  const activeUserCount = users.filter((item) => item.status === 'active').length;
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: 'Users' },
    { key: 'contracts', label: 'Contracts · Settlements' },
    { key: 'notes', label: 'Notes' },
  ];
  const tabContent = (() => {
    if (activeTab === 'users') return <UsersTab company={company} users={users} onRefresh={refreshUsers} />;
    if (activeTab === 'contracts') return <ContractsTab company={company} onUpdate={updateCompany} />;
    if (activeTab === 'notes') return <NotesTab company={company} onUpdate={updateCompany} />;
    return <OverviewTab company={company} projects={projects} presentationMode={presentationMode} onUpdate={updateCompany} />;
  })();

  const pageContent = (
    <div className="max-w-4xl">
      {presentationMode && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <span>📊 상담 모드 · 민감 정보가 숨겨져 있습니다</span>
          <button type="button" onClick={() => router.replace(pathname)} className="text-orange-700 underline underline-offset-2">
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

      {presentationMode ? <OverviewTab company={company} projects={projects} presentationMode /> : tabContent}
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
