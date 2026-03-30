'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Upload } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { StepProgress } from '@/components/step-progress';
import { StatusBadge } from '@/components/status-badge';
import { DownloadButton } from '@/components/download-button';
import { createClient } from '@/lib/supabase/client';
import { DeliverableType, ProjectDetail, User } from '@/types';

type ApiProject = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  step: number;
  created_at: string;
  updated_at: string;
};

type ApiDeliverable = {
  id: string;
  project_id: string;
  company_id: string;
  type: DeliverableType;
  visibility: 'client' | 'internal';
  title: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ApiDeliverableVersion = {
  id: string;
  deliverable_id: string;
  company_id: string;
  version_no: number;
  status: 'draft' | 'review' | 'approved' | 'published';
  title: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type AssetInfo = {
  assetId: string;
  path: string;
};

const mapProject = (project: ApiProject): ProjectDetail => ({
  id: project.id,
  name: project.name,
  companyId: project.company_id,
  description: project.description,
  step: project.step ?? 0,
  createdAt: project.created_at,
  updatedAt: project.updated_at,
});

const deliverableLabels: Record<DeliverableType, string> = {
  keyword: '키워드 분석',
  ads: '광고 보조',
  market: '시장조사',
  brand_identity: '브랜드 아이덴티티',
  naming: '상품명 생성',
};

const getFileNameFromPath = (path?: string | null) => {
  if (!path) return null;
  const parts = path.split('/');
  return parts[parts.length - 1] || null;
};


export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [deliverables, setDeliverables] = useState<ApiDeliverable[]>([]);
  const [versionsByDeliverable, setVersionsByDeliverable] = useState<
    Record<string, ApiDeliverableVersion[]>
  >({});
  const [assetsByVersion, setAssetsByVersion] = useState<Record<string, AssetInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingVersionId, setUploadingVersionId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (versionId: string, file: File) => {
    if (!project) return;
    setUploadingVersionId(versionId);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('deliverableVersionId', versionId);
    formData.append('projectId', project.id);
    formData.append('companyId', project.companyId);

    const response = await fetch('/api/assets/upload', {
      method: 'POST',
      body: formData,
    });

    if (response.status === 401) {
      router.push('/login');
      setUploadingVersionId(null);
      return;
    }

    if (!response.ok) {
      setUploadError('업로드에 실패했습니다.');
      setUploadingVersionId(null);
      return;
    }

    const data = await response.json().catch(() => null);
    if (data?.assetId && data?.path) {
      setAssetsByVersion((prev) => ({
        ...prev,
        [versionId]: { assetId: data.assetId, path: data.path },
      }));
    }

    setUploadingVersionId(null);
  };

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        if (active) {
          setError('로그인이 필요합니다');
          setLoading(false);
        }
        return;
      }

      const sessionRole = session.user.user_metadata?.role ?? null;
      let me: {
        userId: string;
        email: string;
        role: string | null;
        companyId: string | null;
        mustChangePassword: boolean;
        status: string;
      } | null = null;

      if (sessionRole) {
        me = {
          userId: session.user.id,
          email: session.user.email ?? '',
          role: sessionRole,
          companyId: session.user.user_metadata?.company_id ?? null,
          mustChangePassword: false,
          status: 'active',
        };
      } else {
        const meResponse = await fetch('/api/auth/me', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (meResponse.status === 401) {
          router.push('/login');
          if (active) {
            setError('로그인이 필요합니다');
            setLoading(false);
          }
          return;
        }

        if (!meResponse.ok) {
          if (active) {
            setError('사용자 정보를 불러올 수 없습니다');
            setLoading(false);
          }
          return;
        }

        me = await meResponse.json();
      }

      if (!me) {
        if (active) {
          setError('사용자 정보를 불러올 수 없습니다');
          setLoading(false);
        }
        return;
      }

      const user: User = {
        id: me?.userId ?? '',
        email: me?.email ?? '',
        name: me?.email ?? '',
        role: (me?.role ?? 'staff') as User['role'],
        companyId: me?.companyId ?? '',
        mustChangePassword: me?.mustChangePassword ?? false,
        status: (me?.status ?? 'active') as 'active' | 'inactive',
      };

      const projectResponse = await fetch(`/api/projects/${resolvedParams.id}`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (projectResponse.status === 401) {
        router.push('/login');
        if (active) {
          setError('로그인이 필요합니다');
          setLoading(false);
        }
        return;
      }

      if (projectResponse.status === 403) {
        if (active) {
          setError('접근 권한이 없습니다');
          setLoading(false);
        }
        return;
      }

      if (projectResponse.status === 404) {
        if (active) {
          setError('프로젝트를 찾을 수 없습니다');
          setLoading(false);
        }
        return;
      }

      if (!projectResponse.ok) {
        if (active) {
          setError('프로젝트 정보를 불러올 수 없습니다');
          setLoading(false);
        }
        return;
      }

      const projectData = await projectResponse.json();
      const detail = projectData?.project ? mapProject(projectData.project) : null;

      if (!detail) {
        if (active) {
          setError('프로젝트 정보를 불러올 수 없습니다');
          setLoading(false);
        }
        return;
      }

      const deliverablesResponse = await fetch(
        `/api/deliverables?projectId=${resolvedParams.id}`,
        {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      if (deliverablesResponse.status === 401) {
        router.push('/login');
        if (active) {
          setError('로그인이 필요합니다');
          setLoading(false);
        }
        return;
      }

      if (deliverablesResponse.status === 403) {
        if (active) {
          setError('접근 권한이 없습니다');
          setLoading(false);
        }
        return;
      }

      if (!deliverablesResponse.ok) {
        if (active) {
          setError('산출물을 불러올 수 없습니다');
          setLoading(false);
        }
        return;
      }

      const deliverablesData = await deliverablesResponse.json();
      const deliverableList: ApiDeliverable[] = Array.isArray(deliverablesData?.deliverables)
        ? deliverablesData.deliverables
        : [];

      const versionsEntries = await Promise.all(
        deliverableList.map(async (deliverable) => {
          const response = await fetch(
            `/api/deliverable-versions?deliverableId=${deliverable.id}`,
            {
              cache: 'no-store',
              headers: { Authorization: `Bearer ${session.access_token}` },
            }
          );

          if (response.status === 401) {
            router.push('/login');
            return { id: deliverable.id, versions: [] as ApiDeliverableVersion[], failed: true };
          }

          if (!response.ok) {
            return { id: deliverable.id, versions: [] as ApiDeliverableVersion[], failed: true };
          }

          const data = await response.json();
          const versions: ApiDeliverableVersion[] = Array.isArray(data?.versions)
            ? data.versions
            : [];
          return { id: deliverable.id, versions, failed: false };
        })
      );

      if (versionsEntries.some((entry) => entry.failed)) {
        if (active) {
          setError('산출물 버전을 불러올 수 없습니다');
          setLoading(false);
        }
        return;
      }

      const nextVersions: Record<string, ApiDeliverableVersion[]> = {};
      versionsEntries.forEach((entry) => {
        nextVersions[entry.id] = entry.versions;
      });

      if (active) {
        setCurrentUser(user);
        setProject(detail);
        setDeliverables(deliverableList);
        setVersionsByDeliverable(nextVersions);
        setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [resolvedParams.id, router]);

  if (loading && !currentUser) {
    return <div className="p-6 text-sm text-gray-500">프로젝트를 불러오는 중입니다...</div>;
  }

  if (error && !currentUser) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  if (!currentUser) {
    return <div className="p-6 text-sm text-gray-500">사용자 정보를 확인할 수 없습니다.</div>;
  }

  if (!project) {
    return (
      <AppLayout user={currentUser}>
        <div className="text-center py-12">
          <p className="text-gray-600">프로젝트를 찾을 수 없습니다</p>
        </div>
      </AppLayout>
    );
  }

  const filteredDeliverables = currentUser.role.startsWith('client')
    ? deliverables.filter((d) => d.visibility === 'client')
    : deliverables;

  const isStaffAdmin = currentUser.role === 'staff_admin';

  return (
    <AppLayout
      user={currentUser}
      currentProject={{ id: project.id, name: project.name }}
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
          <div className="mt-4 rounded-lg border border-border bg-white p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-base text-gray-600">프로젝트 STEP</span>
              <span className="text-base font-semibold text-primary">STEP {project.step}</span>
            </div>
            <StepProgress currentStep={project.step ?? 0} readonly={true} />
          </div>
        </div>

        {loading && (
          <div className="text-sm text-gray-500 mb-4">프로젝트 정보를 불러오는 중입니다...</div>
        )}
        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
        {uploadError && <div className="text-sm text-red-600 mb-4">{uploadError}</div>}

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
                const versions = versionsByDeliverable[deliverable.id] ?? [];

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
                            {deliverable.title || deliverableLabels[deliverable.type]}
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
                        .sort((a, b) => b.version_no - a.version_no)
                        .map((version) => {
                          const assetInfo = assetsByVersion[version.id];
                          const fileName = getFileNameFromPath(assetInfo?.path) ?? version.title ?? undefined;
                          const inputId = `upload-${version.id}`;

                          return (
                            <div
                              key={version.id}
                              className="flex items-center justify-between p-3 bg-muted rounded-md"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <StatusBadge status={version.status} />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    v{version.version_no}
                                  </p>
                                  {fileName && (
                                    <p className="text-xs text-gray-500">
                                      {fileName}
                                    </p>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(version.created_at).toLocaleDateString('ko-KR')}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 ml-4">
                                {isStaffAdmin && (
                                  <>
                                    <input
                                      id={inputId}
                                      type="file"
                                      className="hidden"
                                      onChange={(event) => {
                                        const selectedFile = event.target.files?.[0];
                                        if (selectedFile) {
                                          handleUpload(version.id, selectedFile);
                                          event.target.value = '';
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const input = document.getElementById(inputId) as HTMLInputElement | null;
                                        input?.click();
                                      }}
                                      disabled={uploadingVersionId === version.id}
                                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                                    >
                                      <Upload className="w-4 h-4" />
                                      {uploadingVersionId === version.id ? '업로드 중...' : '파일 업로드'}
                                    </button>
                                  </>
                                )}

                                <DownloadButton
                                  status={version.status}
                                  userRole={currentUser.role}
                                  assetId={assetInfo?.assetId}
                                  fileName={fileName}
                                />
                              </div>
                            </div>
                          );
                        })}
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
