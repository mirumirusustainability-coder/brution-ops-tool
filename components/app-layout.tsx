'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { RoleToggle } from './role-toggle';
import { User } from '@/types';

interface AppLayoutProps {
  user: User;
  children: React.ReactNode;
  currentProject?: { id: string; name: string };
  showRoleToggle?: boolean;
  onRoleChange?: (role: any) => void;
}

export function AppLayout({
  user,
  children,
  currentProject,
  showRoleToggle = true,
  onRoleChange,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    alert('로그아웃 (실제 환경에서는 세션 종료 처리)');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Role Toggle (Dev Only) */}
      {showRoleToggle && onRoleChange && (
        <RoleToggle currentRole={user.role} onRoleChange={onRoleChange} />
      )}

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
