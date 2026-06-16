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
  FolderOpen,
  ShoppingCart,
  MessageCircle,
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

const mainItems: MenuItem[] = [
  {
    label: '프로젝트',
    href: '/app/projects',
    icon: LayoutDashboard,
    allowedRoles: ['staff_admin', 'staff_member', 'client_admin', 'client_member'],
  },
  {
    label: '브루션 문의',
    href: '/app/chat',
    icon: MessageCircle,
    allowedRoles: ['client_admin', 'client_member'],
  },
];

const toolItems: MenuItem[] = [
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
    allowedRoles: ['staff_admin', 'staff_member', 'client_admin', 'client_member'],
  },
  {
    label: '브랜드 아이덴티티',
    href: '/app/tools/brand',
    icon: Palette,
    allowedRoles: ['staff_admin', 'staff_member', 'client_admin', 'client_member'],
  },
  {
    label: '상품명 생성',
    href: '/app/tools/naming',
    icon: FileText,
    allowedRoles: ['staff_admin', 'staff_member', 'client_admin', 'client_member'],
  },
  {
    label: '네이버 데이터',
    href: '/app/tools/naver',
    icon: ShoppingCart,
    allowedRoles: ['staff_admin', 'staff_member', 'client_admin', 'client_member'],
  },
];

const adminMenuItems: MenuItem[] = [
  {
    label: '대시보드',
    href: '/app/admin',
    icon: LayoutDashboard,
    allowedRoles: ['staff_admin'],
  },
  {
    label: '프로젝트 관리',
    href: '/app/admin/projects',
    icon: FolderOpen,
    allowedRoles: ['staff_admin'],
  },
  {
    label: '고객사 관리',
    href: '/app/admin/companies',
    icon: Building2,
    allowedRoles: ['staff_admin'],
  },
];

const isActivePath = (pathname: string, href: string) => {
  switch (href) {
    case '/app/admin':
      return pathname === '/app/admin';
    case '/app/admin/projects':
      return pathname.startsWith('/app/admin/projects') || pathname.startsWith('/admin/projects');
    case '/app/admin/companies':
      return pathname.startsWith('/app/admin/companies');
    case '/app/projects':
      return pathname.startsWith('/app/projects');
    default:
      return pathname === href;
  }
};

function NavLink({
  item,
  active,
  onClose,
}: {
  item: MenuItem;
  active: boolean;
  onClose: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        'group flex items-center gap-2.5 h-8 px-2.5 rounded-md text-[13px] transition-colors',
        active
          ? 'bg-accent text-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <Icon
        className={cn(
          'w-[18px] h-[18px] shrink-0',
          active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
        )}
      />
      {item.label}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pt-4 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
      {children}
    </p>
  );
}

export function Sidebar({ userRole, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const allow = (item: MenuItem) => item.allowedRoles.includes(userRole);
  const main = mainItems.filter(allow);
  const tools = toolItems.filter(allow);
  const admin = adminMenuItems.filter(allow);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-background border-r border-border z-50 transition-transform duration-200',
          'w-64 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <Link href="/app/projects" onClick={onClose} className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brution-gradient text-white text-xs font-bold">
              B
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">Brution</span>
          </Link>
          <button
            onClick={onClose}
            className="md:hidden p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-2 overflow-y-auto">
          <ul className="space-y-0.5">
            {main.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={isActivePath(pathname, item.href)} onClose={onClose} />
              </li>
            ))}
          </ul>

          {tools.length > 0 && (
            <>
              <SectionLabel>AI 도구</SectionLabel>
              <ul className="space-y-0.5">
                {tools.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} active={isActivePath(pathname, item.href)} onClose={onClose} />
                  </li>
                ))}
              </ul>
            </>
          )}

          {admin.length > 0 && (
            <>
              <SectionLabel>관리자</SectionLabel>
              <ul className="space-y-0.5">
                {admin.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} active={isActivePath(pathname, item.href)} onClose={onClose} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground">운영지원툴 v1.0</p>
        </div>
      </aside>
    </>
  );
}
