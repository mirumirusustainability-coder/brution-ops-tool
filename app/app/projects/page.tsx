'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, Clock } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { createClient } from '@/lib/supabase/client';
import { ProjectSummary, User, UserRole } from '@/types';

type ApiProject = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  step: number;
  created_at: string;
  updated_at: string;
  companies?: { name?: string } | { name?: string }[] | null;
};

const getCompanyName = (company: ApiProject['companies']) => {
  if (!company) return '';
  if (Array.isArray(company)) return company[0]?.name ?? '';
  return company.name ?? '';
};

const mapProject = (project: ApiProject): ProjectSummary => ({
  id: project.id,
  name: project.name,
  companyId: project.company_id,
  description: project.description,
  step: project.step ?? 0,
  createdAt: project.created_at,
  updatedAt: project.updated_at,
});

export default function ProjectsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    const projectsResponse = await fetch('/api/projects', { cache: 'no-store' });
    if (projectsResponse.status === 401) {
      router.replace('/login');
      return { ok: false };
    }

    if (projectsResponse.status === 403) {
      setError('접근 권한이 없습니다');
      return { ok: false };
    }

    if (!projectsResponse.ok) {
      setError('프로젝트를 불러올 수 없습니다');
      return { ok: false };
    }

    const data = await projectsResponse.json();
    const items = Array.isArray(data?.projects) ? data.projects : [];
    setProjects(items.map(mapProject));
    return { ok: true };
  };


  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
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
          router.replace('/login');
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

      const user: User = {
        id: me?.userId ?? '',
        email: me?.email ?? '',
        name: me?.email ?? '',
        role: (me?.role ?? 'staff') as UserRole,
        companyId: me?.companyId ?? '',
        mustChangePassword: me?.mustChangePassword ?? false,
        status: (me?.status ?? 'active') as 'active' | 'inactive',
      };

      if (active) {
        setCurrentUser(user);
      }

      await loadProjects();


      if (active) {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [router]);

  if (loading && !currentUser) {
    return <div className="p-6 text-sm text-gray-500">프로젝트를 불러오는 중입니다...</div>;
  }

  if (error && !currentUser) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  if (!currentUser) {
    return <div className="p-6 text-sm text-gray-500">사용자 정보를 확인할 수 없습니다.</div>;
  }


  return (
    <AppLayout user={currentUser}>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">프로젝트</h1>
            <p className="text-sm text-gray-600 mt-1">
              진행 중인 프로젝트를 관리하고 산출물을 확인하세요
            </p>
          </div>
        </div>

        {loading && (
          <div className="text-sm text-gray-500 mb-4">프로젝트 목록을 불러오는 중입니다...</div>
        )}
        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-12 bg-muted rounded-lg">
            <Folder className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">등록된 프로젝트가 없습니다</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
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
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-gray-500">{getCompanyName(project.companies) || '고객사'}</p>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {project.name}
                        </h3>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                        STEP {project.step}
                      </span>
                    </div>
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
