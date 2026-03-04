import { VersionStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: VersionStatus;
  className?: string;
}

const statusConfig = {
  draft: {
    label: '초안',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  review: {
    label: '검수중',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  approved: {
    label: '승인완료',
    className: 'bg-green-100 text-green-700 border-green-300',
  },
  published: {
    label: '공개',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

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
