'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  FileText,
  Search,
  Megaphone,
  TrendingUp,
  Palette,
  Building2,
  X,
} from 'lucide-react';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';

interface SidebarProps {
  userRole: UserRole;
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    label: '프로젝트',
    href: '/app/projects',
    icon: LayoutDashboard,
    allowedRoles: ['staff_admin', 'staff_member', 'client_admin', 'client_member'],
  },
  {
    label: '키워드 분석',
    href: '/app/tools/keyword',
    icon: Search,
    allowedRoles: ['staff_admin', 'staff_member', 'client_admin', 'client_member'],
  },
  {
    label: '광고 보조',
    href: '/app/tools/ads',
    icon: Megaphone,
    allowedRoles: ['staff_admin', 'staff_member', 'client_admin', 'client_member'],
  },
  {
    label: '시장조사',
    href: '/app/tools/market',
    icon: TrendingUp,
    allowedRoles: ['staff_admin', 'staff_member'],
  },
  {
    label: '브랜드 아이덴티티',
    href: '/app/tools/brand-identity',
    icon: Palette,
    allowedRoles: ['staff_admin', 'staff_member'],
  },
  {
    label: '상품명 생성',
    href: '/app/tools/naming',
    icon: FileText,
    allowedRoles: ['staff_admin', 'staff_member'],
  },
  {
    label: '고객사 관리',
    href: '/app/admin/companies',
    icon: Building2,
    allowedRoles: ['staff_admin'],
  },
];

export function Sidebar({ userRole, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const filteredItems = menuItems.filter((item) =>
    item.allowedRoles.includes(userRole)
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-white border-r border-border z-50 transition-transform duration-300',
          'w-64 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo & Close Button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h1 className="text-xl font-bold text-primary">Brution</h1>
          <button
            onClick={onClose}
            className="md:hidden p-1 hover:bg-muted rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-muted'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <p className="text-xs text-gray-500">
            운영지원툴 v1.0
          </p>
        </div>
      </aside>
    </>
  );
}
