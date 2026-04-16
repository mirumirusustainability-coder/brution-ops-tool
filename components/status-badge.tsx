import { VersionStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: VersionStatus;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: '검토중',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  in_review: {
    label: '완료',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  revision: {
    label: '반영중',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  published: {
    label: '최종본',
    className: 'bg-green-100 text-green-700 border-green-300',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
