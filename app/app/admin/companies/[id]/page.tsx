import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { AppLayout } from '@/components/app-layout';
import { isStaffAdmin } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server';
import { CompanyDetailClient } from './_components/CompanyDetailClient';
import type { ApiCompany, ApiProject, ApiProjectWithDrops, ApiUser } from './_components/types';
import type { User as AppUser } from '@/types';

type PageProps = { params: Promise<{ id: string }> };

type ApiMe = {
  userId: string;
  email: string;
  role: string;
  companyId: string | null;
  mustChangePassword: boolean;
  status: string;
};

const mapUser = (me: ApiMe): AppUser => ({
  id: me.userId,
  email: me.email,
  name: me.email,
  role: me.role as AppUser['role'],
  companyId: me.companyId ?? '',
  mustChangePassword: me.mustChangePassword,
  status: me.status as AppUser['status'],
});

const getBaseUrl = () => {
  const headerStore = headers();
  const protocol = headerStore.get('x-forwarded-proto') ?? 'http';
  const host = headerStore.get('host');
  if (!host) return '';
  return `${protocol}://${host}`;
};

const getCookieHeader = () => {
  const cookieStore = cookies();
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
};

export default async function CompanyUsersPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set({ name, value, ...options }),
        remove: (name, options) => cookieStore.set({ name, value: '', ...options, maxAge: 0 }),
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect('/login');

  const baseUrl = getBaseUrl();
  const cookieHeader = getCookieHeader();
  let currentUser: AppUser | null = null;

  const sessionRole = user.user_metadata?.role ?? null;
  if (sessionRole) {
    currentUser = mapUser({
      userId: user.id,
      email: user.email ?? '',
      role: sessionRole,
      companyId: user.user_metadata?.company_id ?? null,
      mustChangePassword: false,
      status: 'active',
    });
  } else {
    const admin = createSupabaseAdmin();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('user_id, email, role, company_id, status, must_change_password')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return <div className="p-6 text-sm text-gray-500">사용자 정보를 확인할 수 없습니다.</div>;
    }

    if (profile.status !== 'active') {
      return <div className="p-6 text-sm text-gray-500">사용자 정보를 확인할 수 없습니다.</div>;
    }

    currentUser = mapUser({
      userId: profile.user_id,
      email: profile.email ?? user.email ?? '',
      role: profile.role,
      companyId: profile.company_id,
      mustChangePassword: profile.must_change_password ?? false,
      status: profile.status,
    });
  }

  if (!currentUser) {
    return <div className="p-6 text-sm text-gray-500">사용자 정보를 확인할 수 없습니다.</div>;
  }

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

  let company: ApiCompany | null = null;
  let projects: ApiProject[] = [];
  let users: ApiUser[] = [];
  let error: string | null = null;

  const companyResponse = await fetch(`${baseUrl}/api/admin/companies/${id}`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  });
  if (companyResponse.status === 401) redirect('/login');
  if (!companyResponse.ok) {
    error = '고객사 정보를 불러올 수 없습니다';
  } else {
    const data = await companyResponse.json().catch(() => null);
    company = data?.company ?? null;
    projects = Array.isArray(data?.projects) ? data.projects : [];
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

  const usersResponse = await fetch(`${baseUrl}/api/admin/companies/${id}/users`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  });
  if (usersResponse.status === 401) redirect('/login');
  if (!usersResponse.ok) {
    error = error ?? '사용자 목록을 불러올 수 없습니다';
  } else {
    const data = await usersResponse.json().catch(() => null);
    users = Array.isArray(data?.users) ? data.users : [];
  }

  const { data: projectsData, error: projectsError } = await supabase
    .from('projects')
    .select(
      'id, name, step, status, deliverables ( id, title, type, deliverable_versions ( id, title, status ) )'
    )
    .eq('company_id', id);

  console.log('projectsData:', projectsData);
  console.log('projectsError:', projectsError);

  const projectsWithDrops = Array.isArray(projectsData) ? (projectsData as ApiProjectWithDrops[]) : [];

  return (
    <CompanyDetailClient
      currentUser={currentUser}
      company={company}
      projects={projects}
      users={users}
      projectsWithDrops={projectsWithDrops}
      error={error}
    />
  );
}
