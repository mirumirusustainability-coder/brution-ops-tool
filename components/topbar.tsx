'use client';

import { useRouter } from 'next/navigation';
import { Menu, LogOut, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopbarProps {
  user: User;
  currentProject?: { id: string; name: string };
  onMenuClick: () => void;
  onLogout?: () => void;
}

const initials = (name: string, email: string) => {
  const base = (name || email || '?').trim();
  return base.slice(0, 1).toUpperCase();
};

export function Topbar({ user, currentProject, onMenuClick, onLogout }: TopbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {currentProject && (
            <span className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md bg-accent text-sm font-medium text-foreground">
              {currentProject.name}
            </span>
          )}
        </div>

        {/* Right: user dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-md hover:bg-accent transition-colors focus:outline-none">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {initials(user.name, user.email)}
            </span>
            <span className="hidden sm:block max-w-[140px] truncate text-sm font-medium text-foreground">
              {user.name || user.email}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground truncate">{user.name || '사용자'}</span>
              <span className="text-xs font-normal text-muted-foreground truncate">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
