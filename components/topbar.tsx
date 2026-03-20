'use client';

import { useRouter } from 'next/navigation';
import { Menu, ChevronDown, LogOut } from 'lucide-react';
import { User } from '@/types';

interface TopbarProps {
  user: User;
  currentProject?: { id: string; name: string };
  onMenuClick: () => void;
  onLogout: () => void;
}

export function Topbar({ user, currentProject, onMenuClick }: TopbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (response.ok || response.status === 401 || response.status === 403) {
      router.replace('/login');
      return;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Menu Button + Project Selector */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-muted rounded-md md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {currentProject && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
              <span className="text-sm font-medium text-gray-700">
                {currentProject.name}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          )}
        </div>

        {/* Right: User Info + Logout */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-muted rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">로그아웃</span>
          </button>
        </div>
      </div>
    </header>
  );
}
