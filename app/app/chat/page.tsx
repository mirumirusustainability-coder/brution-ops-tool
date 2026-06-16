'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { ChatPanel } from '@/components/chat-panel';
import { createBrowserClient } from '@supabase/ssr';
import { User, UserRole } from '@/types';

export default function ClientChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      const res = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (!res.ok) {
        if (active) {
          setError('사용자 정보를 불러올 수 없습니다');
          setLoading(false);
        }
        return;
      }

      const me = await res.json();
      const user: User = {
        id: me?.userId ?? '',
        email: me?.email ?? '',
        name: me?.name ?? me?.email ?? '',
        role: (me?.role ?? 'client_member') as UserRole,
        companyId: me?.companyId ?? '',
        mustChangePassword: me?.mustChangePassword ?? false,
        status: (me?.status ?? 'active') as 'active' | 'inactive',
      };

      if (active) {
        setCurrentUser(user);
        setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [router]);

  if (loading && !currentUser) {
    return <div className="p-6 text-sm text-gray-500">로딩 중...</div>;
  }
  if (error && !currentUser) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }
  if (!currentUser) {
    return <div className="p-6 text-sm text-gray-500">사용자 정보를 확인할 수 없습니다.</div>;
  }

  if (!currentUser.companyId) {
    return (
      <AppLayout user={currentUser}>
        <div className="max-w-3xl mx-auto p-6 text-sm text-gray-500">
          소속 고객사가 없어 채팅을 사용할 수 없습니다. 브루션 담당자에게 문의해주세요.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={currentUser}>
      <div className="max-w-3xl mx-auto h-[calc(100vh-9rem)] flex flex-col">
        <div className="mb-3">
          <h1 className="text-2xl font-bold text-gray-900">브루션 문의</h1>
          <p className="text-sm text-gray-500 mt-1">브루션 담당자와 실시간으로 소통하세요</p>
        </div>
        <div className="flex-1 min-h-0 bg-white border border-border rounded-lg p-4">
          <ChatPanel companyId={currentUser.companyId} className="h-full" />
        </div>
      </div>
    </AppLayout>
  );
}
