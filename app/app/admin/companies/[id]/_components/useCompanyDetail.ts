'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isStaffAdmin } from '@/lib/supabase/auth';
import { User as AppUser } from '@/types';
import type { ApiCompany, ApiProject, ApiUser, CompanyMetadata } from './types';

type DetailState = {
  currentUser: AppUser | null;
  company: ApiCompany | null;
  projects: ApiProject[];
  users: ApiUser[];
  loading: boolean;
  error: string | null;
  refreshUsers: () => Promise<void>;
  updateCompany: (metadata: CompanyMetadata) => Promise<void>;
  deleteCompany: () => Promise<void>;
};

const mapUser = (me: any): AppUser => ({
  id: me.userId,
  email: me.email,
  name: me.email,
  role: me.role,
  companyId: me.companyId ?? '',
  mustChangePassword: me.mustChangePassword,
  status: me.status,
});

export function useCompanyDetail(companyId: string): DetailState {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [company, setCompany] = useState<ApiCompany | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUsers = useCallback(async () => {
    const response = await fetch(`/api/admin/companies/${companyId}/users`, { cache: 'no-store' });
    if (response.status === 401) {
      router.replace('/login');
      return;
    }
    if (!response.ok) {
      setError('사용자 목록을 불러올 수 없습니다');
      return;
    }
    const data = await response.json().catch(() => null);
    setUsers(Array.isArray(data?.users) ? data.users : []);
  }, [companyId, router]);

  const refreshCompany = useCallback(async () => {
    const response = await fetch(`/api/admin/companies/${companyId}`, { cache: 'no-store' });
    if (response.status === 401) {
      router.replace('/login');
      return null;
    }
    if (!response.ok) {
      setError('고객사 정보를 불러올 수 없습니다');
      return null;
    }
    const companyData = await response.json().catch(() => null);
    const foundCompany = companyData?.company ?? null;
    if (foundCompany) {
      setCompany(foundCompany);
      setProjects(Array.isArray(companyData?.projects) ? companyData.projects : []);
    }
    return foundCompany as ApiCompany | null;
  }, [companyId, router]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      const sessionRole = session.user.user_metadata?.role ?? null;
      let me: any = null;
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

      if (active) setCurrentUser(mapUser(me));
      if (!isStaffAdmin(me.role)) {
        if (active) setLoading(false);
        return;
      }

      const foundCompany = await refreshCompany();
      if (!foundCompany) {
        if (active) setLoading(false);
        return;
      }

      await refreshUsers();
      if (active) setLoading(false);
    };

    loadData();
    return () => {
      active = false;
    };
  }, [refreshCompany, refreshUsers, router]);

  const updateCompany = useCallback(
    async (metadata: CompanyMetadata) => {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata }),
      });
      if (response.status === 401) {
        router.replace('/login');
        return;
      }
      if (!response.ok) {
        throw new Error('UPDATE_FAILED');
      }
      const data = await response.json().catch(() => null);
      if (data?.company) setCompany(data.company);
    },
    [companyId, router]
  );

  const deleteCompany = useCallback(async () => {
    const response = await fetch(`/api/admin/companies/${companyId}`, { method: 'DELETE' });
    if (response.status === 401) {
      router.replace('/login');
      return;
    }
    if (!response.ok) {
      throw new Error('DELETE_FAILED');
    }
  }, [companyId, router]);

  return {
    currentUser,
    company,
    projects,
    users,
    loading,
    error,
    refreshUsers,
    updateCompany,
    deleteCompany,
  };
}
