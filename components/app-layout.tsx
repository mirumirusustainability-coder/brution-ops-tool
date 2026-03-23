'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/types';

interface AppLayoutProps {
  user: User;
  children: React.ReactNode;
  currentProject?: { id: string; name: string };
}

export function AppLayout({
  user,
  children,
  currentProject,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        userRole={user.role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="md:ml-64 min-h-screen flex flex-col">
        <Topbar
          user={user}
          currentProject={currentProject}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onLogout={handleLogout}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
