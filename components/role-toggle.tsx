'use client';

import { UserRole } from '@/types';
import { cn } from '@/lib/utils';

interface RoleToggleProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const roles: { value: UserRole; label: string }[] = [
  { value: 'staff_admin', label: '관리자 (StaffAdmin)' },
  { value: 'staff_member', label: '직원 (StaffMember)' },
  { value: 'client_admin', label: '고객 (Client)' },
];

export function RoleToggle({ currentRole, onRoleChange }: RoleToggleProps) {
  return (
    <div className="fixed top-4 right-4 z-50 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3 shadow-lg">
      <p className="text-xs font-semibold text-yellow-800 mb-2">
        🔧 개발 전용: 권한 테스트
      </p>
      <div className="flex flex-col gap-1">
        {roles.map((role) => (
          <button
            key={role.value}
            onClick={() => onRoleChange(role.value)}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-medium transition-colors text-left',
              currentRole === role.value
                ? 'bg-yellow-400 text-yellow-900'
                : 'bg-white text-gray-700 hover:bg-yellow-100'
            )}
          >
            {role.label}
          </button>
        ))}
      </div>
    </div>
  );
}
